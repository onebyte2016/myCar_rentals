"use client";

import { useEffect, useState } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const hasToken = document.cookie.includes(
        "session_access_token="
      );

      setIsAuthenticated(hasToken);
    };

    checkAuth();

    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("focus", checkAuth);
    };
  }, []);

  return isAuthenticated;
}

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
};

// Reads the `session_is_staff` cookie (set on login from the `is_staff`
// claim embedded in the JWT) to decide whether to show admin-only UI, such
// as the Users page/link. This is a UI convenience only — the actual admin
// endpoints independently enforce IsAdminUser on the backend.
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsAdmin(getCookie("session_is_staff") === "true");
      setChecked(true);
    };

    check();

    window.addEventListener("focus", check);

    return () => {
      window.removeEventListener("focus", check);
    };
  }, []);

  return { isAdmin, checked };
}




// "use client";

// import { useEffect, useState } from "react";

// export function useAuth() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const hasToken = document.cookie.includes("session_access_token=");
//     setIsAuthenticated(hasToken);
//   }, []);

//   return isAuthenticated;
// }
