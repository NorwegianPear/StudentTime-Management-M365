// ─── Role-Based Access Control Configuration ──────────────────────────────
// Controls who can access the portal and what they can do.
// External tenants (like atea.no) can be granted read-only or admin access.

export type PortalRole = "admin" | "viewer";

export interface RoleMapping {
  /** User's email (UPN) — exact match, case-insensitive */
  email?: string;
  /** Tenant domain — all users from this domain get the specified role */
  domain?: string;
  /** The role to assign */
  role: PortalRole;
}

// ─── Configuration ─────────────────────────────────────────────────────
// The school's own tenant is admin by default.
// External tenants can be configured with specific per-user or per-domain roles.
//
// Precedence: email match > domain match > tenant default > deny
//
// To configure via environment variable, set PORTAL_ROLE_MAPPINGS as JSON:
//   [{"domain":"atea.no","role":"viewer"},{"email":"admin@atea.no","role":"admin"}]

function getRoleMappings(): RoleMapping[] {
  const envMappings = process.env.PORTAL_ROLE_MAPPINGS;
  if (envMappings) {
    try {
      return JSON.parse(envMappings);
    } catch {
      console.error("Failed to parse PORTAL_ROLE_MAPPINGS env var");
    }
  }

  // Default configuration — customize as needed
  return [
    // All atea.no users get read-only access by default
    { domain: "atea.no", role: "viewer" },
    // Specific atea.no users promoted to admin
    { email: "veronica.hogemark@atea.no", role: "admin" },
    { email: "roy-arne.hogestol@atea.no", role: "admin" },
    { email: "anders.dramstad@atea.no", role: "admin" },
    { email: "paul.johnny.klock@atea.no", role: "admin" },
    { email: "uy.le.thai.phan@atea.no", role: "admin" },
  ];
}

/** Allowed external tenant IDs that can authenticate (in addition to the primary tenant) */
function getAllowedTenantIds(): string[] {
  const envTenants = process.env.ALLOWED_TENANT_IDS;
  if (envTenants) {
    return envTenants.split(",").map((t) => t.trim());
  }
  return [];
  // Example: return ["atea-tenant-id-here"];
}

/**
 * Determine a user's portal role based on their email.
 * Returns null if the user should be denied access.
 */
export function getUserRole(email: string | null | undefined): PortalRole | null {
  if (!email) return null;

  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split("@")[1];
  const mappings = getRoleMappings();

  // The school's own tenant always gets admin
  const primaryDomain = process.env.TENANT_DOMAIN?.toLowerCase();
  if (primaryDomain && domain === primaryDomain) {
    // But check if there's an explicit override for this specific email
    const emailMatch = mappings.find((m) => m.email?.toLowerCase() === normalizedEmail);
    if (emailMatch) return emailMatch.role;
    return "admin";
  }

  // Check explicit email match first (highest priority)
  const emailMatch = mappings.find((m) => m.email?.toLowerCase() === normalizedEmail);
  if (emailMatch) return emailMatch.role;

  // Check domain match
  const domainMatch = mappings.find((m) => m.domain?.toLowerCase() === domain);
  if (domainMatch) return domainMatch.role;

  // No match — deny access unless they're from an allowed tenant
  // (handled by auth.ts callback)
  return null;
}

/**
 * Check if a role has write permissions.
 */
export function canWrite(role: PortalRole | null): boolean {
  return role === "admin";
}

/**
 * Check if a role can read data.
 */
export function canRead(role: PortalRole | null): boolean {
  return role === "admin" || role === "viewer";
}

export { getAllowedTenantIds };
