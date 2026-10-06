import type { Metadata } from "next";
import { TAGLINE } from "@/components/brand/Tagline";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: `Orbit - enterprise work platform. ${TAGLINE}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
