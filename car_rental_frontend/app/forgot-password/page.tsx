'use client';
import InputField from '@/components/fields/InputField';
import { useState } from 'react';
import { requestPasswordReset } from '@/app/lib/actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await requestPasswordReset(email);
      if (res.success) {
        setMessage(res.message || 'If an account exists for that email, a reset link has been sent.');
      } else {
        setError(res.error || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <h3 className="mb-2 text-4xl font-bold text-gray-800">Forgot Password</h3>
          <p className="mb-8 text-gray-500">
            Enter the email on your account and we'll send you a link to reset your password.
          </p>

          {message ? (
            <div className="mb-6 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <InputField
                id="email"
                label="Email*"
                placeholder="mail@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />

              <button
                disabled={loading || !email}
                onClick={handleSubmit}
                className="mt-6 w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <a href="/sign-in" className="font-medium text-green-600 hover:text-green-700">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero.png')" }}
      >
        <div className="flex h-full items-center justify-center bg-black/40">
          <div className="px-10 text-center text-white">
            <h1 className="mb-4 text-5xl font-bold">Forgot Something?</h1>
            <p className="text-lg text-gray-200">We'll help you get back into your account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
