"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { X } from "lucide-react";
import {
  canAddIndicator,
  filterIndicatorDefinitions,
  getIndicatorDefinition,
  MAX_OVERLAY_INDICATORS,
  MAX_SUB_INDICATORS,
  MAX_SUB_INDICATORS_NARROW,
} from "@/lib/chart/indicators/registry";
import type { IndicatorCategory, IndicatorId } from "@/lib/chart/indicators/types";

const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volatility: "Volatility",
};

const MENU_MAX_HEIGHT = 280;
const MENU_GAP = 6;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

interface Props {
  selected: IndicatorId[];
  onChange: (next: IndicatorId[]) => void;
  isProduct?: boolean;
  isNarrow?: boolean;
  className?: string;
}

export function IndicatorPicker({
  selected,
  onChange,
  isProduct = false,
  isNarrow = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxSub = isNarrow ? MAX_SUB_INDICATORS_NARROW : MAX_SUB_INDICATORS;

  const filtered = useMemo(() => filterIndicatorDefinitions(query), [query]);

  const grouped = useMemo(() => {
    const map = new Map<IndicatorCategory, typeof filtered>();
    for (const def of filtered) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    const anchor = rootRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.max(rect.width, 288);
    let left = rect.left;
    let top = rect.bottom + MENU_GAP;

    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (top + MENU_MAX_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, rect.top - MENU_MAX_HEIGHT - MENU_GAP);
    }

    setMenuPosition({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, selected.length, query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const toggleItem = (id: IndicatorId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }
    if (!canAddIndicator(selected, id, maxSub)) {
      return;
    }
    onChange([...selected, id]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeTag = (id: IndicatorId) => {
    onChange(selected.filter((item) => item !== id));
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Backspace" && query.length === 0 && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  };

  const openPicker = () => {
    setOpen(true);
    inputRef.current?.focus();
  };

  const menu =
    open && menuPosition && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-multiselectable
            className={clsx(
              "chart-indicator-menu fixed",
              !isProduct && "chart-indicator-menu--light",
            )}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <p className="chart-indicator-menu-hint">
              Click to toggle · Overlay max {MAX_OVERLAY_INDICATORS} · Sub max {maxSub}
            </p>

            <div className="chart-indicator-menu-scroll space-y-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-2 text-xs text-product-muted">No indicators match.</p>
              ) : (
                (["trend", "momentum", "volatility"] as IndicatorCategory[]).map((category) => {
                  const items = grouped.get(category);
                  if (!items?.length) return null;
                  return (
                    <div key={category}>
                      <p className="chart-indicator-category">{CATEGORY_LABEL[category]}</p>
                      <ul className="space-y-0.5 px-0.5 pb-1">
                        {items.map((def) => {
                          const isSelected = selected.includes(def.id);
                          const disabled = !isSelected && !canAddIndicator(selected, def.id, maxSub);
                          return (
                            <li key={def.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                disabled={disabled}
                                onClick={() => toggleItem(def.id)}
                                className={clsx(
                                  "chart-indicator-option",
                                  isSelected && "chart-indicator-option--selected",
                                )}
                              >
                                <span className="chart-indicator-option-name">{def.name}</span>
                                <span className="chart-indicator-option-desc">{def.description}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={clsx(
        "chart-indicator-picker",
        !isProduct && "chart-indicator-picker--light",
        className,
      )}
    >
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={openPicker}
        className={clsx("chart-indicator-input", open && "chart-indicator-input--open")}
      >
        {selected.map((id) => {
          const def = getIndicatorDefinition(id);
          if (!def) return null;
          return (
            <span key={id} className="chart-indicator-tag">
              <span className="truncate">{def.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(id);
                }}
                className="chart-indicator-tag-remove"
                aria-label={`Remove ${def.name}`}
              >
                <X size={10} aria-hidden />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={selected.length === 0 ? "Search indicators…" : "Add…"}
          aria-label="Search and select chart indicators"
          className="chart-indicator-field"
        />
      </div>

      {menu}
    </div>
  );
}
