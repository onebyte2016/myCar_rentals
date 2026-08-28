// ─────────────────────────────────────────────────────────────
// FILE 4: app/vendor/layout.tsx  (optional — no shared navbar)
// ─────────────────────────────────────────────────────────────
// The vendor pages have their own navbar built in,
// so you need to HIDE the main site navbar on vendor pages.
// Create app/vendor/layout.tsx:
 
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
 
// This overrides the root layout for all /vendor/* routes,
// preventing the main site NavBar from appearing on vendor pages.