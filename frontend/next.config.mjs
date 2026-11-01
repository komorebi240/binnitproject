/** Where the Spring Boot backend listens, as seen from the machine running this Next.js server. */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

/**
 * Sent with every page and file this server answers itself (not /api, whose answers come from the backend with Spring
 * Security's own headers). No other site may show the app inside a frame (clickjacking); the app's own frames - the Word
 * preview (srcdoc) and the PDF viewer (a blob: URL) - are same-origin and stay allowed. No MIME sniffing, a trimmed
 * Referer, HTTPS only (ignored by browsers on plain-http localhost).
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `import { X } from "@phosphor-icons/react"` otherwise pulls the whole 1,500-icon barrel into every dev compile.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    // The /api rewrite below proxies to the backend; its default 30 s timeout would cut off a 50 MB chat video being
    // uploaded over a slow connection.
    proxyTimeout: 120_000,
  },
  // The app serves images directly and does not need the image optimizer. Keep this surface disabled
  // in addition to using a patched Next.js version; this setting alone does not fix framework RCEs.
  images: { unoptimized: true },
  // A second dev server can run next to the production one by building into its own folder (run-dev-parallel.ps1).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Only the Docker image build asks for a self-contained server (see frontend/Dockerfile);
  // local `next dev` / `next build` are unchanged.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  // With NEXT_PUBLIC_API_BASE_URL=/api/v1 the browser only ever talks to this server, which hands
  // /api/* on to the backend. One origin means the session cookie is first-party, which is what makes
  // a single public address (run-public.ps1) enough. Behind Caddy (docker) /api never reaches this rule.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_ORIGIN}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:path((?!api/).*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
