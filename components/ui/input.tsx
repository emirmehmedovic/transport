import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-600 mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "w-full px-4 py-3 text-sm border border-dark-200 rounded-xl",
            "bg-white text-dark-900 placeholder:text-dark-400",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "disabled:bg-dark-100 disabled:text-dark-500 disabled:cursor-not-allowed",
            "transition-all duration-200",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
