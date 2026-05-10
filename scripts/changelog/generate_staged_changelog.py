#!/usr/bin/env python3
"""Generate a changelog fragment from the current staged diff.

The script is intentionally dependency-free so it can run from a Git hook before
backend dependencies are installed.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CHANGELOG_DIR = ROOT / "changelogs" / "unreleased"
MAX_DIFF_CHARS = 20_000
DEFAULT_MODEL = "gemini-2.5-flash-lite"

SECRET_PATTERNS = [
    re.compile(r"(api[_-]?key\s*[=:]\s*)([^\s\"']+)", re.IGNORECASE),
    re.compile(r"(secret\s*[=:]\s*)([^\s\"']+)", re.IGNORECASE),
    re.compile(r"(token\s*[=:]\s*)([^\s\"']+)", re.IGNORECASE),
    re.compile(r"(password\s*[=:]\s*)([^\s\"']+)", re.IGNORECASE),
]

DIFF_EXCLUDES = [
    ".env",
    ".env.*",
    "**/.env",
    "**/.env.*",
    "package-lock.json",
    "frontend/package-lock.json",
    "changelogs/unreleased/*.md",
]


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def load_env_file() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def staged_files() -> list[str]:
    output = run_git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    return [line.strip() for line in output.splitlines() if line.strip()]


def has_staged_changelog(files: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, "changelogs/unreleased/*.md") for path in files)


def should_exclude_from_diff(path: str) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in DIFF_EXCLUDES)


def redact(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub(r"\1[REDACTED]", redacted)
    return redacted


def staged_diff(files: list[str]) -> str:
    included = [path for path in files if not should_exclude_from_diff(path)]
    if not included:
        return "Only generated, lock, changelog, or ignored files changed."
    diff = run_git(["diff", "--cached", "--unified=3", "--", *included])
    diff = redact(diff)
    if len(diff) > MAX_DIFF_CHARS:
        return diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated]"
    return diff


def infer_scope(files: list[str]) -> str:
    scopes = {
        "frontend": any(path.startswith("frontend/") for path in files),
        "backend": any(path.startswith("backend/") for path in files),
        "contracts": any(path.startswith("contracts/") for path in files),
        "docs": any(path.startswith(("docs/", "dev-docs/")) for path in files),
        "tooling": any(
            path
            in {
                "package.json",
                "package-lock.json",
                ".husky/pre-commit",
                ".prettierignore",
            }
            or path.startswith(("scripts/", ".husky/"))
            for path in files
        ),
    }
    active = [scope for scope, matched in scopes.items() if matched]
    if len(active) == 1:
        return active[0]
    if "tooling" in active:
        return "tooling"
    return "multi" if active else "unknown"


def infer_type(files: list[str]) -> str:
    if any(
        path.startswith(("docs/", "dev-docs/")) or path.endswith(".md")
        for path in files
    ):
        return "docs"
    if any("requirements" in path or path.endswith("package.json") for path in files):
        return "chore"
    return "chore"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return slug[:48] or "change"


def fallback_summary(files: list[str]) -> dict[str, Any]:
    scope = infer_scope(files)
    return {
        "type": infer_type(files),
        "scope": scope,
        "summary": "请补充本次提交的变更说明。",
        "slug": f"{scope}-changes",
        "needs_review": True,
        "ai_generated": False,
    }


def gemini_summary(files: list[str], diff: str) -> dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    prompt = f"""
You generate concise changelog fragments for a software repository.

Return JSON only with this exact shape:
{{
  "type": "feat|fix|docs|style|refactor|test|chore",
  "scope": "frontend|backend|contracts|docs|tooling|multi|unknown",
  "summary": "One concise Simplified Chinese sentence describing the staged change.",
  "slug": "short-lowercase-english-slug"
}}

Rules:
- Base the answer only on the staged files and diff.
- Do not mention secrets, API keys, or implementation details that are not in the diff.
- Use "chore" for dependency, tooling, formatting, or config changes.
- Use "style" only for pure formatting changes.
- Keep summary under 80 Chinese characters.

Staged files:
{json.dumps(files, ensure_ascii=False, indent=2)}

Staged diff:
{diff}
""".strip()

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "feat",
                            "fix",
                            "docs",
                            "style",
                            "refactor",
                            "test",
                            "chore",
                        ],
                    },
                    "scope": {
                        "type": "string",
                        "enum": [
                            "frontend",
                            "backend",
                            "contracts",
                            "docs",
                            "tooling",
                            "multi",
                            "unknown",
                        ],
                    },
                    "summary": {"type": "string"},
                    "slug": {"type": "string"},
                },
                "required": ["type", "scope", "summary", "slug"],
            },
            "temperature": 0.2,
        },
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini request failed: {exc.code} {body}") from exc

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    if isinstance(parsed, list):
        parsed = parsed[0] if parsed and isinstance(parsed[0], dict) else {}
    if not isinstance(parsed, dict):
        parsed = {}
    return {
        "type": parsed.get("type") or infer_type(files),
        "scope": parsed.get("scope") or infer_scope(files),
        "summary": parsed.get("summary") or fallback_summary(files)["summary"],
        "slug": slugify(parsed.get("slug") or parsed.get("summary") or "change"),
        "needs_review": False,
        "ai_generated": True,
    }


def write_fragment(summary: dict[str, Any], files: list[str]) -> Path:
    CHANGELOG_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256("\n".join(files).encode("utf-8")).hexdigest()[:8]
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    scope = slugify(summary["scope"])
    slug = slugify(summary["slug"])
    path = CHANGELOG_DIR / f"{timestamp}-{scope}-{slug}-{digest}.md"
    content = f"""---
type: {summary["type"]}
scope: {summary["scope"]}
ai_generated: {str(summary["ai_generated"]).lower()}
needs_review: {str(summary["needs_review"]).lower()}
---

{summary["summary"]}
"""
    path.write_text(content, encoding="utf-8")
    subprocess.run(["git", "add", str(path.relative_to(ROOT))], cwd=ROOT, check=True)
    return path


def main() -> int:
    load_env_file()
    files = staged_files()
    if not files:
        print("No staged files; skipping changelog generation.")
        return 0
    if has_staged_changelog(files):
        print("Staged changelog fragment found; skipping generation.")
        return 0

    diff = staged_diff(files)
    try:
        summary = gemini_summary(files, diff)
    except Exception as exc:  # Keep commits unblocked when Gemini is unavailable.
        print(
            f"Gemini changelog generation failed; using fallback template: {exc}",
            file=sys.stderr,
        )
        summary = fallback_summary(files)

    path = write_fragment(summary, files)
    print(f"Generated changelog fragment: {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
