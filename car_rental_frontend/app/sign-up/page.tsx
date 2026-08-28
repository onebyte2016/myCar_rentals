"use client"
import { registerUser } from '@/app/lib/actions'
import React, { useState } from 'react'
// import {registerUser} from "../../utils/auths"
import { useRouter } from "next/navigation";



const RegisterPage = () => {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"customer" | "vendor">("customer");
  const [fullName, setFullName] = useState("");
  // const [username, setUserName] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [password2, setPassword2] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!fullName || !email || !password || !password2) {
    alert("All fields are required!");
    return;
  }

  if (password !== password2) {
    alert("Passwords do not match!");
    return;
  }

  try {
    await registerUser(fullName, email, password, password2);

    alert("Check your email to verify your account");

    // 👉 redirect user
    router.push("/sign-in"); // or /home if no email verification needed
  } catch (err: any) {
    alert(err.message || "Registration failed");
  }
};
  
    // try {
    //   const data = await registerUser(fullName, email, password, password2);
    //   alert("User registered successfully!");
    //   console.log("User registered:", data);
  
    //   // Optional redirect
    //   window.location.href = "/login";
    // } catch (err: any) {
    //   alert(err.message || "Registration failed");
    // }
  // };
  
  
  return (
    <div
  className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4"
  style={{
    backgroundImage: "url('/hero.png')",
  }}
>
  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-black/40"></div>

  <form
    onSubmit={handleSubmit}
    className="relative z-10 w-full max-w-md rounded-3xl bg-white/20 backdrop-blur-lg border border-white/30 p-8 shadow-2xl flex flex-col gap-4"
  >
    <h2 className="text-4xl font-bold text-center text-white mb-2">
      Register
    </h2>

    <p className="text-center text-gray-200 mb-4">
      Create your account to continue
    </p>

    {/* ACCOUNT TYPE */}
    <div className="mb-2">
      <label className="text-white mb-1 block">I want to register as</label>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-1">
        <button
          type="button"
          onClick={() => setAccountType("customer")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            accountType === "customer"
              ? "bg-green-600 text-white"
              : "text-gray-200 hover:bg-white/10"
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setAccountType("vendor")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            accountType === "vendor"
              ? "bg-green-600 text-white"
              : "text-gray-200 hover:bg-white/10"
          }`}
        >
          Vendor
        </button>
      </div>
    </div>

    {accountType === "vendor" ? (
      <div className="rounded-xl border border-white/30 bg-white/10 p-4 text-sm text-gray-100">
        <p className="mb-3">
          Vendors list cars and earn from bookings, so signing up needs a few extra
          business details (business name, contact info, etc.) on a dedicated form.
        </p>
        <button
          type="button"
          onClick={() => router.push("/vendor/register")}
          className="w-full rounded-xl bg-green-600 py-3 text-base font-semibold text-white transition hover:bg-green-700"
        >
          Continue to Vendor Registration
        </button>
      </div>
    ) : (
    <>
    {/* FULL NAME */}
    <div className="flex flex-col">
      <label className="text-white mb-1">Full Name</label>

      <input
        className="rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-green-500"
        value={fullName}
        required
        onChange={(e) => setFullName(e.target.value)}
      />
    </div>

    {/* EMAIL */}
    <div className="flex flex-col">
      <label className="text-white mb-1">Email</label>

      <input
        className="rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-green-500"
        type="email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>

    {/* PASSWORD */}
    <div className="flex flex-col">
      <label className="text-white mb-1">Password</label>

      <input
        className="rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-green-500"
        type="password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
      />
    </div>

    {/* CONFIRM PASSWORD */}
    <div className="flex flex-col">
      <label className="text-white mb-1">
        Confirm Password
      </label>

      <input
        type="password"
        className="rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-green-500"
        value={password2}
        required
        onChange={(e) => setPassword2(e.target.value)}
      />
    </div>

    {/* BUTTON */}
    <button
      className="mt-2 rounded-xl bg-green-600 py-3 text-lg font-semibold text-white transition hover:bg-green-700"
      type="submit"
    >
      Register
    </button>

    {/* LOGIN LINK */}
    <p className="text-center text-gray-200 text-sm mt-4">
      Already have an account?{" "}
      <a
        href="/sign-in"
        className="font-medium text-green-400 hover:text-green-300"
      >
        Login
      </a>
    </p>
    </>
    )}
  </form>
</div>
  );
}

export default RegisterPage