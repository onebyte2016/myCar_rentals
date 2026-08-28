
"use server";
import { cookies } from "next/headers";
import apiService from "../services/apiService";
import { logoutApi } from "../services/authService";
import { revalidatePath } from "next/cache";
// import { handleLogin } from "@/lib/actions";
// import { resetAuthCookies } from "./actions";

export async function handleRefresh(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("session_refresh_token")?.value;

  if (!refreshToken) {
    await resetAuthCookies();
    return null;
  }

  const res = await fetch(
    "http://localhost:8000/core/v1/user/token/refresh/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    }
  );

  if (!res.ok) {
    await resetAuthCookies();
    return null;
  }

  const data = await res.json();

  if (!data?.access) {
    await resetAuthCookies();
    return null;
  }

  cookieStore.set("session_access_token", data.access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });

  // Keep the admin-gating cookie in sync with the refreshed token's claims.
  const isStaff = decodeIsStaff(data.access);
  cookieStore.set("session_is_staff", String(isStaff), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });

  return data.access;
}

// Decodes the `is_staff` claim embedded in the JWT payload by the backend
// (see MyTokenObtainPairSerializer.get_token). Used to gate admin-only UI
// (e.g. the Users page) without an extra network round trip.
function decodeIsStaff(accessToken: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64").toString()
    );
    return Boolean(payload?.is_staff);
  } catch {
    return false;
  }
}

export async function handleLogin(userId:string, accessToken: string, refreshToken: string, isStaff: boolean){
    (await cookies()).set('session_userId', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, //one week
    path: '/'
});

(await cookies()).set('session_access_token', accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 , //60 minutes
    path: '/'
});

(await cookies()).set('session_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, //one week
    path: '/'
});

// Non-httpOnly so client components can read it to show/hide admin-only UI.
// The backend is still the source of truth: admin API endpoints independently
// enforce IsAdminUser, so this cookie only controls what's *shown*, not what's allowed.
(await cookies()).set('session_is_staff', String(isStaff), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, //one week
    path: '/'
});

}



export async function resetAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.set("session_userId", "", { maxAge: 0, path: "/" });
  cookieStore.set("session_access_token", "", { maxAge: 0, path: "/" });
  cookieStore.set("session_refresh_token", "", { maxAge: 0, path: "/" });
  cookieStore.set("session_is_staff", "", { maxAge: 0, path: "/" });
}

export async function getUserId() {
    const userId = (await cookies()).get('session_userId')?.value
    return userId ? userId : null
    
}
 
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  return (await cookieStore).get("session_access_token")?.value ?? null;
}


export async function getRefreshToken(){
    let refreshToken = (await cookies()).get('session_refresh_token')?.value;
    return refreshToken;
}


export async function loginUser(email: string, password: string) {
  const res = await fetch("http://127.0.0.1:8000/core/v1/user/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    return { success: false, error: "Invalid credentials" };
  }

  const data = await res.json();

  if (!data.access || !data.refresh) {
    return { success: false, error: "Invalid token response" };
  }

  // OPTIONAL: decode JWT to get user id
  const payload = JSON.parse(
    Buffer.from(data.access.split(".")[1], "base64").toString()
  );

  await handleLogin(
    payload.user_id?.toString() || "",
    data.access,
    data.refresh,
    Boolean(payload.is_staff)
  );

  return { success: true };
}



export async function logoutUser() {
  const cookieStore = await cookies();

  const refreshToken = cookieStore.get("session_refresh_token")?.value;

  if (refreshToken) {
    try {
      await logoutApi(refreshToken);
    } catch (err) {
      console.error("Logout API failed:", err);
    }
  }

  // Clear cookies
  cookieStore.set("session_userId", "", { path: "/", maxAge: 0 });
  cookieStore.set("session_access_token", "", { path: "/", maxAge: 0 });
  cookieStore.set("session_refresh_token", "", { path: "/", maxAge: 0 });
  cookieStore.set("session_is_staff", "", { path: "/", maxAge: 0 });

  return { success: true };
}
  
// actions.ts

export async function registerUser(
  fullName: string,
  email: string,
  password: string,
  password2: string
) {
  try {
    const res = await fetch("http://localhost:8000/core/v1/user/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        password2,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const firstError =
        Object.values(data)?.[0]?.[0] || "Registration failed";
      throw new Error(firstError);
    }
  } catch (err: any) {
    throw new Error(err.message || "Something went wrong");
  }
}

function firstErrorMessage(data: any, fallback: string): string {
  if (data?.detail) return data.detail;
  const firstVal = data && typeof data === "object" ? Object.values(data)[0] : null;
  if (Array.isArray(firstVal)) return firstVal[0];
  if (typeof firstVal === "string") return firstVal;
  return fallback;
}

export async function requestPasswordReset(email: string) {
  try {
    const res = await fetch("http://127.0.0.1:8000/core/v1/user/password/reset/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: firstErrorMessage(data, "Something went wrong") };
    }

    return { success: true, message: data?.detail as string | undefined };
  } catch (err: any) {
    return { success: false, error: err.message || "Something went wrong" };
  }
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  newPassword: string,
  newPassword2: string
) {
  try {
    const res = await fetch("http://127.0.0.1:8000/core/v1/user/password/reset/confirm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        new_password2: newPassword2,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: firstErrorMessage(data, "Could not reset password") };
    }

    return { success: true, message: data?.detail as string | undefined };
  } catch (err: any) {
    return { success: false, error: err.message || "Something went wrong" };
  }
}
// export async function registerUser(fullName: string, email: string, password: string, password2: string) {
//     try {
//       const res = await fetch("http://localhost:8000/core/v1/user/register/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ full_name: fullName, email, password, password2 }),
//       });
  
//       const data = await res.json();
  
//       if (!res.ok) {
//         // Django REST Framework often returns errors as { field: [errors] }
//         const firstError =
//           Object.values(data)?.[0]?.[0] || "Registration failed";
//         throw new Error(firstError);
//       }
  
//       return data;
//     } catch (err: any) {
//       throw new Error(err.message || "Something went wrong");
//     }
//   }
  

  // export async function createWorkOrderAction(payload: any) {
  //   const res = await fetch("http://127.0.0.1:8000/api/v1/work-orders/", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${await getAccessToken()}`,
  //     },
  //     body: JSON.stringify(payload),
  //   });
  
  //   if (!res.ok) {
  //     const text = await res.text();
  //     console.error("Backend error:", text);
  //     throw new Error("Failed to create work order");
  //   }
  
  //   return res.json();
  // }
  
  