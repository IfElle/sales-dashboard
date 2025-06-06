// src/app/login/page.tsx
//elzGotThis
"use client";

import { useState, Suspense } from "react"; // Import Suspense from 'react'
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation"; // Correct hook for Next.js 13+

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  // useSearchParams() is directly used here, hence the need for Suspense
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/raw"; // Default redirect after login

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null); // Clear previous errors

    try {
      const res = await signIn("credentials", {
        redirect: false, // Prevent NextAuth from redirecting automatically
        email,
        password,
      });

      if (res?.error) {
        setFormError(res.error); // Display error message from NextAuth
      } else if (res?.ok) {
        // If login is successful, redirect to the callbackUrl or dashboard
        router.push(callbackUrl);
      } else {
        // Generic error if res.error is null but login wasn't successful
        setFormError("Login failed. Please check your credentials.");
      }
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      setFormError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense fallback={
      <div
        className="flex min-h-screen items-center justify-center bg-gray-100"
      >
        <div className="text-center text-gray-700 p-8">Loading login form...</div>
      </div>
    }>
      <div className="flex min-h-screen items-center justify-center bg-gray-100"style={{ backgroundImage: "url('/media/bg-image.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {formError && (
            <div className="text-red-600 text-sm text-center mt-4">
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-6"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </Suspense>
  );
}