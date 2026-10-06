import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** For a stable React key when the row itself has no natural id, e.g. `(row) => row.id`. */
  key?: (row: T) => string | number;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  /** Rendered instead of the table body when rows is empty - see components/ui/EmptyState. */
  emptyState: ReactNode;
  getRowKey: (row: T, index: number) => string | number;
  /** Makes rows clickable (and Enter/Space activatable); clicks on buttons/links/inputs inside a row are ignored. */
  onRowClick?: (row: T) => void;
}

/**
 * Design-system primitive (CLAUDE.md section 26). Deliberately has no built-in pagination or
 * sorting - add those on top only once a real list needs them (CLAUDE.md section 29).
 */
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, label";

export function Table<T>({ columns, rows, emptyState, getRowKey, onRowClick }: TableProps<T>) {
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="glass-card animate-fade-in overflow-x-auto rounded">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className="px-4 py-2 text-left font-medium text-fg-soft"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              className={`transition-colors hover:bg-surface-muted/60 ${onRowClick ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" : ""}`}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={
                onRowClick
                  ? (event) => {
                      if (!(event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) onRowClick(row);
                    }
                  : undefined
              }
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.header} className="px-4 py-2 text-fg">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
