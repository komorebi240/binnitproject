interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Every list/table view needs a deliberate empty state instead of a blank area
 * (CLAUDE.md section 39/40 - "clear empty state" is part of Definition of Done).
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-2 rounded border border-dashed border-gray-300 px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {action}
    </div>
  );
}
