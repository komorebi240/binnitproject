import { MarketingPage } from "@/features/marketing/MarketingPage";
import { marketingMetadata } from "@/features/marketing/metadata";

export const metadata = marketingMetadata("vi");

/** The public marketing page in Vietnamese, the product's default language (English: /en). */
export default function HomePage() {
  return <MarketingPage locale="vi" />;
}
