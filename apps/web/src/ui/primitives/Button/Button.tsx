import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  icon?: ReactNode;
}

// The one button shape/weight every accent-filled or bordered-neutral
// action in the app should render through (New project, modal Cancel/
// Create, etc.) — before this, each call site redeclared the same
// height/radius/font values with its own one-off CSS class.
export function Button({ variant = "primary", icon, children, className, ...rest }: ButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;
  return (
    <button type="button" className={`${styles.button} ${variantClass} ${className ?? ""}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
