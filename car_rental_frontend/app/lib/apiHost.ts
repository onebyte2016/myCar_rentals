// Returns the correct API base URL depending on execution context.
// Server-side (inside Docker): use the internal Docker network address.
// Client-side (in the browser): use the public-facing URL.
export function getApiHost(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_HOST || "http://backend:8000/core/v1";
  }
  return process.env.NEXT_PUBLIC_API_HOST || "";
}
