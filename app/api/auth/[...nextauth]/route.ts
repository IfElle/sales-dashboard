// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js"; // Removed SupabaseClient import as it's not directly used

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use the service role key for server-side auth
);

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          return null;
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error || !data?.user) {
            console.error("Supabase login failed:", error?.message);
            // Return null to indicate authentication failure
            // You can also throw an error here to display a message to the user
            throw new Error(error?.message || "Invalid credentials");
          }

          // If authentication is successful, return the user object
          // NextAuth.js will store this in the session/JWT
          return {
            id: data.user.id,
            email: data.user.email,
            // You can add more user data here if needed, e.g., name, role
            // name: data.user.user_metadata?.full_name,
            // role: data.user.app_metadata?.user_role,
          };
        } catch (authError: any) {
          console.error("Authentication error:", authError.message);
          throw new Error(authError.message || "Something went wrong during login.");
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login", // This tells NextAuth to redirect to /login for sign-in
    error: "/login", // Redirect to login page on authentication errors
  },
  session: {
    strategy: "jwt", // Use JWT for session management
  },
  callbacks: {
    // Optional: Add callbacks if you need to customize JWT or session
    async jwt({ token, user }) {
      if (user) {
        // user is only available the first time this callback is called on a new session
        token.id = user.id;
        // token.email = user.email; // Already present
        // token.name = user.name; // If you added it above
        // token.role = user.role; // If you added it above
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, such as an access_token from a provider.
      session.user.id = token.id as string;
      // session.user.role = token.role as string; // If you added it above
      return session;
    },
  },
});

export { handler as GET, handler as POST };