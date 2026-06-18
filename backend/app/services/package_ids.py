"""Resolve Sui package IDs for move calls vs event parsing after upgrades."""

from __future__ import annotations

from app.config import settings


def package_id_for_move_call() -> str:
    return (settings.package_published_at or settings.package_id or "").strip()


def package_ids_for_events() -> list[str]:
    ids: list[str] = []
    for raw in (settings.package_id, settings.package_published_at or settings.package_id):
        value = (raw or "").strip().lower()
        if value and value not in ids:
            ids.append(value)
    return ids


def event_type_matches_package(event_type: str, package_ids: list[str] | None = None) -> bool:
    ids = package_ids or package_ids_for_events()
    if not ids:
        return True
    normalized = event_type.lower()
    return any(pkg in normalized for pkg in ids)
