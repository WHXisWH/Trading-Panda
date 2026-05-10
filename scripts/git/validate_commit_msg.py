#!/usr/bin/env python3
"""Validate commit messages against Conventional Commits."""

from __future__ import annotations

import re
import sys
from pathlib import Path


CONVENTIONAL_COMMIT_RE = re.compile(
    r"^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)"
    r"(\([a-z0-9][a-z0-9-]*\))?"
    r"(!)?: .{1,72}$"
)


def is_allowed_git_message(subject: str) -> bool:
    return (
        subject.startswith("Merge ")
        or subject.startswith("Revert ")
        or subject.startswith("fixup! ")
        or subject.startswith("squash! ")
    )


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_commit_msg.py <commit-msg-file>", file=sys.stderr)
        return 2

    message_path = Path(sys.argv[1])
    subject = message_path.read_text(encoding="utf-8").splitlines()[0].strip()

    if CONVENTIONAL_COMMIT_RE.match(subject) or is_allowed_git_message(subject):
        return 0

    print(
        "\nInvalid commit message.\n\n"
        "Use Conventional Commits:\n"
        "  type(scope): summary\n\n"
        "Examples:\n"
        "  chore(tooling): add commit automation\n"
        "  fix(backend): resolve dependency conflict\n"
        "  feat(frontend): add mint flow\n\n"
        "Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test\n"
        "Summary must be 1-72 characters.\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
