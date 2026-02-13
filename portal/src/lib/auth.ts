// NextAuth configuration with Entra ID (Azure AD)
// Supports multi-tenant authentication with role-based access control
import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { getUserRole } from "@/lib/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraId({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // Use "common" endpoint for multi-tenant, or specific tenant for single-tenant
      issuer: process.env.ALLOWED_TENANT_IDS
        ? "https://login.microsoftonline.com/common/v2.0"
        : `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  callbacks: {
    authorized: async ({ auth: session }) => {
      // Only allow authenticated users with a valid role
      return !!session;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        // Store email for role resolution
        const email = (profile?.email as string) || (token.email as string);
        token.email = email;
        // Resolve and store the role
        token.portalRole = getUserRole(email);
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        user: {
          ...session.user,
          role: (token.portalRole as string) || null,
        },
      };
    },
    async signIn({ profile }) {
      // Check if user's email resolves to a valid role
      const email = profile?.email as string | undefined;
      const role = getUserRole(email);
      if (!role) {
        // Deny access — no role mapping found
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});
