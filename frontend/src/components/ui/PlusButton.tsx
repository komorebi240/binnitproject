import { Plus } from "@phosphor-icons/react";

interface PlusButtonProps {
  label: string;
  onClick: () => void;
}

/** Small round gradient "+" used next to a section heading to open an "add" dialog. */
export function PlusButton({ label, onClick }: PlusButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="gradient-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primaryEnd text-primary-foreground shadow-sm transition-all duration-150 hover:shadow-md hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Plus size={18} weight="bold" aria-hidden />
    </button>
  );
}
