import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block apple-label mb-1.5">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              apple-input
              ${icon ? 'apple-input-icon' : ''}
              disabled:opacity-50
              ${error ? 'border-[var(--accent)] ring-1 ring-[var(--focus-ring)]' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
