'use client';
import InputField from '@/components/fields/InputField';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from '@/app/lib/actions';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const missingLink = !uid || !token;

  const handleSubmit = async () => {
    if (newPassword !== newPassword2) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await confirmPasswordReset(uid, token, newPassword, newPassword2);
      if (res.success) {
        setMessage(res.message || 'Password has been reset successfully.');
        setTimeout(() => router.push('/sign-in'), 1500);
      } else {
        setError(res.error || 'Could not reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <h3 className="mb-2 text-4xl font-bold text-gray-800">Reset Password</h3>
          <p className="mb-8 text-gray-500">Choose a new password for your account.</p>

          {missingLink ? (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              This reset link is missing required information. Request a new one from the{' '}
              <a href="/forgot-password" className="underline font-medium">
                forgot password
              </a>{' '}
              page.
            </div>
          ) : message ? (
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
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
                id="newPassword"
                label="New Password*"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              />
              <InputField
                id="newPassword2"
                label="Confirm New Password*"
                type="password"
                extra="mt-4"
                placeholder="Re-enter new password"
                value={newPassword2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword2(e.target.value)}
              />

              <button
                disabled={loading || !newPassword || !newPassword2}
                onClick={handleSubmit}
                className="mt-6 w-full rounded-xl bg-green-600 py-3 text-lg font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
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
            <h1 className="mb-4 text-5xl font-bold">Almost There</h1>
            <p className="text-lg text-gray-200">Set a new password to get back to renting.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
