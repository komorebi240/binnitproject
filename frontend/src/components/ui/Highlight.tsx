import { splitByQuery } from "@/lib/textMatch";

/** Renders `text` with the parts that match the search query emphasised (accent-insensitive). */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitByQuery(text, query).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-primary/15 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
