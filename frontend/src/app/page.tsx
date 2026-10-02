/**
 * middleware.ts redirects every request to "/" toward /login or /dashboard depending on
 * cookie presence, so this normally never renders - it only exists as a fallback so the
 * route isn't a hard 404 if middleware doesn't run (e.g. during static export/build).
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Đang chuyển hướng...</p>
    </main>
  );
}
