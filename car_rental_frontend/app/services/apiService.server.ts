import { cookies } from "next/headers";

export const apiService = {
  get: async (endpoint: string) => {
    try {
      const token = (await cookies()).get("session_access_token")?.value;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${endpoint}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
      });

      if (res.status === 401) {
        console.warn(" Unauthorized. Token expired or missing.");
        return []; // Return empty list instead of crashing
      }

      if (!res.ok) {
        console.error(` API Error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : []; // Always return an array
    } catch (err) {
      console.error("Fetch failed:", err);
      return [];
    }
  },
};