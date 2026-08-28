import { Slider as BaseSlider } from "@base-ui/react/slider";
import styles from "./Slider.module.css";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onFocus?: () => void;
  onChange: (value: number) => void;
  onCommit: () => void;
}

// The one reusable slider primitive — every scrubbable value in the app
// (image filters, opacity, anything else that comes later) should render
// through this rather than re-declaring Root/Control/Track/Indicator/Thumb
// at each call site. Base UI's Slider.Root renders an unstyled wrapper
// around Slider.Control with NO flex-grow of its own — leaving it
// unstyled (as a first pass here did) collapses it to its content width
// instead of filling the row, which is what made the effects sliders look
// broken (a bare dot with no visible track). `.root` below is the fix:
// it's the one thing every other part's flex/percentage math depends on.
export function Slider({ value, min, max, step = 1, disabled, onFocus, onChange, onCommit }: SliderProps) {
  return (
    <BaseSlider.Root
      className={styles.root}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(next) => onChange(next as number)}
      onValueCommitted={() => onCommit()}
    >
      <BaseSlider.Control className={styles.control} onPointerDown={onFocus}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
          <BaseSlider.Thumb className={styles.thumb} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
