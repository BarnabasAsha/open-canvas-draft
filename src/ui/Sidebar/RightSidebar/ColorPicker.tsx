import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useState } from "react";
import { clamp, hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from "../../../utils/color";
import type { Hsv, Rgb } from "../../../utils/color";

interface ColorPickerProps {
  value: string;
  disabled?: boolean;
  onFocus: () => void;
  onChange: (hex: string) => void;
  onCommit: () => void;
}

// Base UI has no color-picker primitive, so this is hand-built — but on
// top of Base UI's Popover (for the trigger/panel accessibility/dismissal)
// and Slider (for the hue track), the same "borrow the accessible parts
// that exist, hand-roll only what's genuinely custom" approach as
// everywhere else in this app. Saturation/value has no Base UI equivalent
// (it's a 2D control), so that square is fully custom, including its own
// keyboard support.
export function ColorPicker({ value, disabled, onFocus, onChange, onCommit }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(value)));
  const [hexInput, setHexInput] = useState(value);

  const rgb = hsvToRgb(hsv);
  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (next) {
      setHsv(rgbToHsv(hexToRgb(value)));
      setHexInput(value);
      onFocus();
    } else {
      onCommit();
    }
  }

  function applyHsv(next: Hsv): void {
    setHsv(next);
    const hex = rgbToHex(hsvToRgb(next));
    setHexInput(hex);
    onChange(hex);
  }

  function applyRgb(next: Rgb): void {
    applyHsv(rgbToHsv(next));
  }

  function updateFromSvPointer(e: ReactPointerEvent<HTMLDivElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(100 - ((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    applyHsv({ ...hsv, s, v });
  }

  function handleSvKeyDown(e: KeyboardEvent): void {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowRight") applyHsv({ ...hsv, s: clamp(hsv.s + step, 0, 100) });
    else if (e.key === "ArrowLeft") applyHsv({ ...hsv, s: clamp(hsv.s - step, 0, 100) });
    else if (e.key === "ArrowUp") applyHsv({ ...hsv, v: clamp(hsv.v + step, 0, 100) });
    else if (e.key === "ArrowDown") applyHsv({ ...hsv, v: clamp(hsv.v - step, 0, 100) });
    else return;
    e.preventDefault();
  }

  function handleHexChange(next: string): void {
    setHexInput(next);
    if (isValidHex(next)) {
      const normalized = next.length === 4 ? `#${next[1]}${next[1]}${next[2]}${next[2]}${next[3]}${next[3]}` : next;
      setHsv(rgbToHsv(hexToRgb(normalized)));
      onChange(normalized);
    }
  }

  function handleHexBlur(): void {
    setHexInput(value);
    onCommit();
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        disabled={disabled}
        className="color-swatch-trigger"
        style={{ background: value }}
        aria-label="Pick color"
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="menu-positioner">
          <Popover.Popup className="color-picker-popup">
            <div
              className="color-sv-square"
              role="group"
              aria-label="Saturation and brightness"
              tabIndex={0}
              style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                updateFromSvPointer(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) updateFromSvPointer(e);
              }}
              onPointerUp={onCommit}
              onKeyDown={handleSvKeyDown}
            >
              <div className="color-sv-thumb" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} />
            </div>

            <Slider.Root
              value={hsv.h}
              min={0}
              max={359}
              step={1}
              onValueChange={(h) => applyHsv({ ...hsv, h: h as number })}
              onValueCommitted={onCommit}
              className="hue-slider-root"
            >
              <Slider.Control className="hue-slider-control">
                <Slider.Track className="hue-slider-track">
                  <Slider.Thumb className="hue-slider-thumb" />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>

            <div className="color-hex-row">
              <span className="color-hex-prefix">#</span>
              <input
                type="text"
                value={hexInput.replace("#", "")}
                onChange={(e) => handleHexChange(`#${e.target.value}`)}
                onBlur={handleHexBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="color-hex-input"
                spellCheck={false}
              />
            </div>

            <div className="color-rgb-row">
              {(["r", "g", "b"] as const).map((channel) => (
                <label key={channel} className="color-rgb-field">
                  <span className="color-rgb-prefix">{channel.toUpperCase()}</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={Math.round(rgb[channel])}
                    onChange={(e) => applyRgb({ ...rgb, [channel]: clamp(Number(e.target.value), 0, 255) })}
                    onBlur={onCommit}
                    className="color-rgb-input"
                  />
                </label>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
