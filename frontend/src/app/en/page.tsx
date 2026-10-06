import { MarketingPage } from "@/features/marketing/MarketingPage";
import { marketingMetadata } from "@/features/marketing/metadata";

export const metadata = marketingMetadata("en");

/** The public marketing page in English (Vietnamese: /). */
export default function EnglishHomePage() {
  return <MarketingPage locale="en" />;
}
