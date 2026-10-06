/**
 * Accent- and case-insensitive text matching for search boxes: typing "cong viec" finds "Công việc".
 * Matching works character by character so the ranges it returns line up with the ORIGINAL text,
 * which is what a highlight needs.
 */

function foldChar(char: string): string {
  if (char === "đ" || char === "Đ") return "d";
  return char.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Lower-cased text without accents (Vietnamese "đ" becomes "d"). */
export function foldText(text: string): string {
  return Array.from(text).map(foldChar).join("");
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** True when every word of the query appears in the text, in any order. */
export function matchesAllWords(text: string, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const folded = foldText(text);
  return words.every((word) => folded.includes(word));
}

/** Splits `text` into pieces, marking the parts that match any word of the query (for highlighting). */
export function splitByQuery(text: string, query: string): TextPart[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ text, match: false }];

  const chars = Array.from(text);
  const folded = chars.map(foldChar);
  // Position of each original character inside the folded string.
  const starts: number[] = [];
  let joined = "";
  for (const piece of folded) {
    starts.push(joined.length);
    joined += piece;
  }

  const marked = new Array<boolean>(chars.length).fill(false);
  for (const word of words) {
    let from = joined.indexOf(word);
    while (from !== -1) {
      const to = from + word.length;
      chars.forEach((_, index) => {
        const charStart = starts[index] as number;
        const charEnd = charStart + (folded[index] as string).length;
        if (charStart < to && charEnd > from) marked[index] = true;
      });
      from = joined.indexOf(word, from + 1);
    }
  }

  const parts: TextPart[] = [];
  chars.forEach((char, index) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[index]) last.text += char;
    else parts.push({ text: char, match: marked[index] as boolean });
  });
  return parts;
}
