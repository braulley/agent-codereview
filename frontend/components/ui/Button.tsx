import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-beacon text-canvas hover:brightness-110 border border-beacon",
  secondary:
    "bg-surface-l2 text-gray-100 hover:bg-surface-l3 border border-hairline-strong",
  destructive:
    "bg-severity-critical text-white hover:brightness-110 border border-severity-critical",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`font-display inline-flex items-center justify-center rounded-none px-4 py-2 text-sm font-medium uppercase tracking-wide transition-[filter] disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
