import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary:
        "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary hover:shadow-primary-lg hover:-translate-y-0.5 active:translate-y-0",
      secondary:
        "bg-dark-100 text-dark-700 border border-dark-200 hover:bg-dark-200 hover:border-dark-300",
      outline:
        "border-2 border-primary-500 text-primary-600 hover:bg-primary-50",
      danger:
        "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded-lg",
      md: "px-6 py-3 text-sm rounded-xl",
      lg: "px-8 py-4 text-base rounded-xl",
    };

    return (
      <button
        className={cn(
          "font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
