/** Where the Spring Boot backend listens, as seen from the machine running this Next.js server. */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `import { X } from "@phosphor-icons/react"` otherwise pulls the whole 1,500-icon barrel into every dev compile.
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
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
