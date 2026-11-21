import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { searchPaths } from "../../graph-filters";

const SUGGESTION_LIMIT = 12;

export interface MaskFieldProps {
  label: string;
  hint: string;
  placeholder: string;
  masks: readonly string[];
  paths: readonly string[];
  onAdd: (masks: readonly string[]) => void;
  onRemove: (mask: string) => void;
}

export function MaskField({
  label,
  hint,
  placeholder,
  masks,
  paths,
  onAdd,
  onRemove,
}: MaskFieldProps) {
  const inputId = useId();
  const listId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const trimmed = query.trim();
  const shown = useMemo(
    () => searchPaths(paths, trimmed, SUGGESTION_LIMIT),
    [paths, trimmed],
  );
  const maskAlreadyAdded = trimmed.length > 0 && masks.includes(trimmed);
  const canAddMask = trimmed.length > 0 && !maskAlreadyAdded;
  const menuOpen = open && trimmed.length > 0;

  useLayoutEffect(() => {
    if (!menuOpen) return;

    function placeMenu() {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(80, Math.min(220, (openUp ? spaceAbove : spaceBelow) - 8));
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        maxHeight,
        zIndex: 40,
        top: openUp ? rect.top - maxHeight - 2 : rect.bottom + 2,
      });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [menuOpen, trimmed, shown]);

  function addMask() {
    if (!canAddMask) return;
    onAdd([trimmed]);
    setQuery("");
  }

  function addPath(path: string) {
    if (masks.includes(path)) return;
    onAdd([path]);
    setQuery("");
    setOpen(false);
  }

  function addShown() {
    const fresh = shown.filter((path) => !masks.includes(path));
    if (fresh.length === 0) return;
    onAdd(fresh);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addMask();
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <section className="wb-mask-section">
      <label className="wb-mask-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="wb-mask-field" ref={fieldRef}>
        <input
          id={inputId}
          className="wb-mask-input"
          role="combobox"
          aria-expanded={menuOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {menuOpen && (
          <div
            id={listId}
            className="wb-mask-menu"
            style={menuStyle}
            role="listbox"
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="wb-mask-option wb-mask-option--action"
              disabled={!canAddMask}
              onClick={addMask}
            >
              {maskAlreadyAdded ? `Mask “${trimmed}” is already added` : `Add mask “${trimmed}”`}
            </button>
            {shown.map((path) => {
              const added = masks.includes(path);
              return (
                <button
                  key={path}
                  type="button"
                  role="option"
                  className="wb-mask-option"
                  disabled={added}
                  onClick={() => addPath(path)}
                >
                  {path}
                </button>
              );
            })}
            {shown.length > 0 && (
              <button
                type="button"
                className="wb-mask-option wb-mask-option--action"
                disabled={shown.every((path) => masks.includes(path))}
                onClick={addShown}
              >
                Add shown ({shown.length})
              </button>
            )}
          </div>
        )}
      </div>
      <p className="wb-view-hint">{hint}</p>
      {masks.length > 0 && (
        <ul className="wb-mask-chips">
          {masks.map((mask) => (
            <li key={mask} className="wb-mask-chip">
              <span className="wb-mask-chip-label" title={mask}>
                {mask}
              </span>
              <button
                type="button"
                className="wb-mask-chip-remove"
                aria-label={`Remove ${mask}`}
                onClick={() => onRemove(mask)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
