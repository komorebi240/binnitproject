import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { CaretDown } from "@phosphor-icons/react";

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
        {/* Native <select> - its open dropdown list is OS-rendered and can't be restyled
            cross-browser without replacing it with a full custom listbox (out of scope for this
            pass); `appearance-none` + the custom CaretDown at least fix the plain closed-state
            look (flat border, default OS arrow) that was flagged. */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={`peer w-full appearance-none rounded border bg-white px-3 py-2 pr-9 text-sm shadow-sm
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:shadow-md
              disabled:cursor-not-allowed disabled:opacity-50
              ${error ? "border-danger" : "border-gray-300 hover:border-gray-400 hover:shadow"} ${className}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* `peer-focus` rotates the caret to read as "open" while the native dropdown is
              showing - the one bit of "it's open now" feedback CSS can give us without
              replacing the native listbox (see the comment above). */}
          <CaretDown
            size={14}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-150 peer-focus:rotate-180 peer-focus:text-primary"
          />
        </div>
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
