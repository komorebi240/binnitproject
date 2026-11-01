import { COLUMN_ICONS } from "./icons";
import type { MarketingCopy, TaskPriority } from "./copy.types";

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "border-danger/30 bg-danger/10 text-danger-text",
  medium: "border-warning/30 bg-warning/10 text-warning-text",
  low: "border-success/30 bg-success/10 text-success-text",
};

/**
 * An illustration of the task board, built from the same glass surfaces as the real one, with made-up sample tasks (it
 * says so in its caption). The surrounding scroll story progressively reveals the columns without image downloads. The sample text comes from the page's copy, so
 * it reads naturally in every language.
 */
export function ProductGlimpse({ copy }: { copy: MarketingCopy["glimpse"] }) {
  return (
    <figure className="mx-auto w-full max-w-5xl">
      <div className="glass-window rounded-2xl p-3 sm:p-5" aria-hidden>
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs font-medium text-fg-muted">{copy.windowTitle}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {copy.columns.map(({ name, tasks }, index) => {
            const Icon = COLUMN_ICONS[index]!;
            return (
              <div key={name} data-demo-column={index} className="mk-demo-column rounded-xl bg-surface-muted/60 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-soft">
                  <Icon size={14} weight="bold" />
                  {name}
                </p>
                <ul className="flex flex-col gap-2">
                  {tasks.map((task) => (
                    <li key={task.title} className="glass-card rounded-lg p-2.5 text-left text-sm text-fg">
                      <p className="font-medium leading-snug">{task.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CLASS[task.priority]}`}>
                          {copy.priority[task.priority]}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary-text">
                          {task.who}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-fg-muted">{copy.caption}</figcaption>
    </figure>
  );
}
