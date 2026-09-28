import { type SelectHTMLAttributes, forwardRef, useId } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={`rounded border bg-white px-3 py-2 text-sm transition-colors duration-150
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-danger" : "border-gray-300 hover:border-gray-400"} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
