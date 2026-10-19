/** Where the Spring Boot backend listens, as seen from the machine running this Next.js server. */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

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
  // The app never uses next/image, so the image optimizer (/_next/image) is switched off: it then answers 404 before
  // decoding anything. Security review: Next.js < 15.5.24 has an RCE in AVIF optimisation (GHSA-2xp9-vwfh-vxw4, via
  // sharp/libheif); with the optimizer off there is nothing to reach until the planned Next.js upgrade.
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
};

export default nextConfig;
