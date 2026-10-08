import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with parts that are not plain text (a bold name, a link): every `{name}` in `text` is replaced
 * by `values.name`. The whole sentence stays one message, so translators control the word order around the parts.
 */
export function RichText({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  const parts = text.split(/\{(\w+)\}/);
  return (
    <>
      {parts.map((part, index) =>
        // Odd positions are the captured placeholder names; a name with no value is shown as written.
        index % 2 === 1 ? <Fragment key={index}>{part in values ? values[part] : `{${part}}`}</Fragment> : part,
      )}
    </>
  );
}
