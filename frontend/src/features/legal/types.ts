/** The newest terms of service in one language; `content` is plain text (see TermsDocument for the line format). */
export interface Terms {
  version: number;
  publishedAt: string;
  language: string;
  title: string;
  content: string;
}
