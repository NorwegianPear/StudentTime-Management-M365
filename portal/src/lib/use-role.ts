"use client";

import { useSession } from "next-auth/react";
import type { PortalRole } from "@/lib/roles";

/**
 * Client-side hook to check the user's portal role.
 * Role is embedded in the session by auth.ts callbacks.
 */
export function useRole() {
  const { data: session } = useSession();

  const role = ((session?.user as { role?: string })?.role as PortalRole) || null;
  const isAdmin = role === "admin";
  const isViewer = role === "viewer";
  const canWrite = isAdmin;

  return { role, isAdmin, isViewer, canWrite };
}
