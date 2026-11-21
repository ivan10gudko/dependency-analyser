import { useEffect, useId, useRef, useState } from "react";

import {
  LOCATION_COLOR_SWATCHES,
  type LocationColorId,
} from "../../location-colors";

export interface ZoneColorPickerProps {
  colorId: LocationColorId;
  onChange: (colorId: LocationColorId) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function ZoneColorPicker({
  colorId,
  onChange,
  ariaLabel,
  disabled = false,
}: ZoneColorPickerProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="wb-zone-color-picker" ref={rootRef}>
      <button
        type="button"
        className={`wb-zone-swatch wb-zone-swatch--${colorId}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div
          id={menuId}
          className="wb-zone-color-picker-menu"
          role="listbox"
          aria-label={ariaLabel}
          onMouseDown={(event) => event.preventDefault()}
        >
          {LOCATION_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              role="option"
              aria-selected={swatch.id === colorId}
              className={`wb-zone-swatch wb-zone-swatch--${swatch.id}${
                swatch.id === colorId ? " is-selected" : ""
              }`}
              title={swatch.label}
              onClick={() => {
                onChange(swatch.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}