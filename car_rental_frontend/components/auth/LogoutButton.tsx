"use client";

import { logoutUser } from "@/app/lib/actions";
import { useRouter } from "next/navigation";

export default function LogoutLink() {
  const router = useRouter();

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault(); // stop normal navigation
    await logoutUser();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <a
      href="#"
      onClick={handleLogout}
      className="text-sm font-medium text-red-500 hover:text-red-600 cursor-pointer"
    >
      Log Out
    </a>
  );
}
