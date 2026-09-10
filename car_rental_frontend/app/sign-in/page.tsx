'use client';
import InputField from '@/components/fields/InputField';
import { FcGoogle } from 'react-icons/fc';

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from '@/app/lib/actions';
import Default from '@/components/auth/variants/DefaultAuthLayout';
import Checkbox from '@/components/checkbox';
// import { loginUser } from "./actions";


function SignInDefault() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  return (
    // <Default
    //   maincard={

        <div className="flex min-h-screen w-full">
  
  {/* LEFT SIDE - LOGIN FORM */}
  {/* <div className="absolute inset-0 bg-black/40"> */}
  <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6">
    
    <div className="w-full max-w-md">
      
      <h3 className="mb-2 text-4xl font-bold text-gray-800">
        Sign In
      </h3>

      <p className="mb-8 text-gray-500">
        Enter your email and password to sign in!
      </p>

      {/* GOOGLE BUTTON */}
      <div className="mb-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
        <FcGoogle className="text-2xl" />
        <p className="font-medium text-gray-700">
          Sign In with Google
        </p>
      </div>

      {/* DIVIDER */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px w-full bg-gray-200" />
        <p className="text-gray-400">or</p>
        <div className="h-px w-full bg-gray-200" />
      </div>

      {/* EMAIL */}
      <InputField
        id="email"
        label="Email*"
        placeholder="mail@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* PASSWORD */}
      <InputField
        id="password"
        label="Password*"
        placeholder="Enter password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* CHECKBOX */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Checkbox />
          <p className="ml-2 text-sm text-gray-700">
            Keep me logged in
          </p>
        </div>

        <a
          href="/forgot-password"
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          Forgot Password?
        </a>
      </div>

      {/* BUTTON */}

      <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);

            try {
              const res = await loginUser(email, password);

              if (res.success) {
                router.refresh();   // 🔥 updates navbar + cookies state
                router.push(next);  // 🔥 redirect home, or back to what they were doing
              } else {
                alert(res.error);
              }
            } catch (err: any) {
              alert(err.message || "Login failed");
            } finally {
              setLoading(false);
            }
          }}
          className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white transition hover:bg-green-700"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      {/* <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const res = await loginUser(email, password);
          setLoading(false);

          if (res.success) {
            router.push("/");
          } else {
            alert(res.error);
          }
        }}
        className="w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white transition hover:bg-green-700"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button> */}

      {/* REGISTER */}
      <div className="mt-6 text-center">
        <span className="text-gray-600">
          Not registered yet?
        </span>

        <a
          href="/sign-up"
          className="ml-1 font-medium text-green-600 hover:text-green-700"
        >
          Create an account
        </a>
      </div>
    </div>
  </div>

  {/* RIGHT SIDE - IMAGE */}
  <div
    className="hidden lg:block lg:w-1/2 bg-cover bg-center"
    style={{
      backgroundImage:
        "url('/hero.png')",
    }}
  >
    <div className="flex h-full items-center justify-center bg-black/40">
      <div className="px-10 text-center text-white">
        <h1 className="mb-4 text-5xl font-bold">
          Welcome Back
        </h1>

        <p className="text-lg text-gray-200">
          Manage your cars, bookings and dashboard seamlessly.
        </p>
      </div>
    </div>
  </div>
</div>

    //   }
    // />
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInDefault />
    </Suspense>
  );
}
