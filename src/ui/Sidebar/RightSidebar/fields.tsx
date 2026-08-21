import { Checkbox } from "@base-ui/react/checkbox";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ColorPicker } from "./ColorPicker";

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="panel-section">
      <div className="panel-section-title">{title}</div>
      <div className="panel-section-fields">{children}</div>
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// A plain boolean toggle with a label — distinct from ColorField's
// checkbox, which is bundled specifically with a color swatch. The grid
// toggle is the first standalone user of this shape.
export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="field-row">
      <span className="field-label">
        <Checkbox.Root checked={checked} className="checkbox-root" onCheckedChange={onChange}>
          <Checkbox.Indicator className="checkbox-indicator">
            <CheckIcon size={11} />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {label}
      </span>
    </label>
  );
}

interface NumberFieldProps {
  label: ReactNode;
  value: number;
  onFocus: () => void;
  onChange: (value: number) => void;
  onCommit: () => void;
  min?: number;
  max?: number;
  step?: number;
}

// Live-preview-then-commit: Base UI's NumberField fires onValueChange on
// every keystroke/drag/wheel step (instant canvas feedback via the
// caller's live store write) and onValueCommitted once when the
// interaction actually finishes — a direct match for the pattern
// useNodeEdit.ts already implements (one undo step per edit session, not
// per keystroke), so this just wires straight into it.
//
// The label sits inset inside the same bordered box as the input rather
// than as separate text to its left — the outer <label> still implicitly
// associates with the nested <input> for accessibility, only the visual
// shape changed.
export function NumberField({ label, value, onFocus, onChange, onCommit, min, max, step = 1 }: NumberFieldProps) {
  return (
    <label className="field-box">
      <span className="field-box-label">{label}</span>
      <BaseNumberField.Root
        className="number-field-root"
        value={round(value)}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        onValueCommitted={() => onCommit()}
      >
        <BaseNumberField.Group className="number-field-group">
          <BaseNumberField.Input onFocus={onFocus} className="number-field-input" />
        </BaseNumberField.Group>
      </BaseNumberField.Root>
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
}

// Live-preview-then-commit, same as NumberField, but for a text node's
// actual string content — the one field TypographySection deliberately
// doesn't cover (that section is style only: font/size/color, never the
// text itself). Multi-line since content can be, same as the canvas's own
// inline double-click editor (TextEditOverlay.tsx) — this is a second,
// independent way to reach the same field, needed because that overlay
// only knows how to address a real top-level node, not one living inside
// a component instance.
export function TextAreaField({ label, value, onFocus, onChange, onCommit }: TextAreaFieldProps) {
  return (
    <div className="textarea-field">
      <span className="field-box-label textarea-field-label">{label}</span>
      <textarea
        className="textarea-field-input"
        value={value}
        rows={3}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string | null;
  onFocus: () => void;
  onChange: (value: string | null) => void;
  onCommit: () => void;
}

const DEFAULT_COLOR = "#d9d9d9";

// Handles both nullable fill/stroke (rect/ellipse/path) and always-set
// stroke (line/arrow, whose `stroke` field is a plain string) with the same
// component — the checkbox just stays permanently checked in the latter
// case since `value` is never null.
export function ColorField({ label, value, onFocus, onChange, onCommit }: ColorFieldProps) {
  const enabled = value !== null;
  return (
    <div className="field-box color-field-box">
      <label className="color-field-checkbox-label">
        <Checkbox.Root
          checked={enabled}
          className="checkbox-root"
          onCheckedChange={(checked) => {
            onFocus();
            onChange(checked ? (value ?? DEFAULT_COLOR) : null);
            onCommit();
          }}
        >
          <Checkbox.Indicator className="checkbox-indicator">
            <CheckIcon size={11} />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <span className="field-box-label">{label}</span>
      </label>
      <div className="color-field-swatch">
        <ColorPicker value={value ?? DEFAULT_COLOR} disabled={!enabled} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      </div>
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

// Discrete choice, committed immediately on change — no live-drag/blur
// distinction needed the way NumberField/ColorField have one.
export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <BaseSelect.Root value={value} onValueChange={(next) => onChange(next as T)}>
      <BaseSelect.Trigger className="field-box select-trigger">
        <span className="field-box-label">{label}</span>
        {/* Select.Value shows the raw value verbatim unless told
            otherwise — without this, "Weight" read as "400" instead of
            "Regular". */}
        <BaseSelect.Value className="select-trigger-value">
          {(current: T) => options.find((option) => option.value === current)?.label ?? current}
        </BaseSelect.Value>
        <BaseSelect.Icon className="select-icon">
          <CaretUpDownIcon size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="select-positioner">
          <BaseSelect.Popup className="select-popup">
            {options.map((option) => (
              <BaseSelect.Item key={option.value} value={option.value} className="select-item">
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="select-item-indicator">
                  <CheckIcon size={12} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
