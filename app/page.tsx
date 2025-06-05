"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    await signIn("email", {
      email,
      callbackUrl: "/raw", // Redirect to raw data after login
    });
  };

  return (
    <div className="flex h-screen justify-center items-center">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Sign in to Dashboard</h1>
        <input
          className="w-full border border-gray-300 p-2 rounded mb-4"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="w-full bg-blue-500 text-white p-2 rounded"
          onClick={handleLogin}
        >
          Send Magic Link
        </button>
      </div>
    </div>
  );
}
