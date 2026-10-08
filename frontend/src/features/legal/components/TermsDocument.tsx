import { parseTerms } from "../parseTerms";
import type { Terms } from "../types";

/** The text of the terms of service, drawn as headings, paragraphs and lists. */
export function TermsDocument({ terms }: { terms: Terms }) {
  return (
    <article className="flex flex-col gap-2 text-sm leading-relaxed text-fg-soft">
      {parseTerms(terms.content).map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h4 key={index} className="mt-3 text-sm font-semibold text-fg first:mt-0">
              {block.text}
            </h4>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </article>
  );
}
