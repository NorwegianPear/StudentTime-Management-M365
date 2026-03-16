// ─── Role-Based Access Control Configuration ──────────────────────────────
// Controls who can access the portal and what they can do.
// External tenants (like atea.no) can be granted read-only or admin access.

export type PortalRole = "admin" | "viewer" | "deny";

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
    // ── ateara.onmicrosoft.com — known admins ──────────────────────────────
    { email: "lene.kadaa@ateara.onmicrosoft.com", role: "admin" },
    { email: "veronica.hogemark@ateara.onmicrosoft.com", role: "admin" },
    { email: "uy.le.thai.phan@ateara.onmicrosoft.com", role: "admin" },
    { email: "siril.aasheim@ateara.onmicrosoft.com", role: "admin" },

    // ── ateara.onmicrosoft.com — demo student accounts (no portal access) ──
    // Class 8A
    { email: "emma.hansen@ateara.onmicrosoft.com", role: "deny" },
    { email: "noah.johansen@ateara.onmicrosoft.com", role: "deny" },
    { email: "olivia.olsen@ateara.onmicrosoft.com", role: "deny" },
    { email: "william.larsen@ateara.onmicrosoft.com", role: "deny" },
    { email: "sophia.andersen@ateara.onmicrosoft.com", role: "deny" },
    // Class 9B
    { email: "liam.pedersen@ateara.onmicrosoft.com", role: "deny" },
    { email: "mia.nilsen@ateara.onmicrosoft.com", role: "deny" },
    { email: "lucas.kristiansen@ateara.onmicrosoft.com", role: "deny" },
    { email: "ella.jensen@ateara.onmicrosoft.com", role: "deny" },
    { email: "oscar.karlsen@ateara.onmicrosoft.com", role: "deny" },
    // Class 10A
    { email: "jakob.berg@ateara.onmicrosoft.com", role: "deny" },
    { email: "nora.haugen@ateara.onmicrosoft.com", role: "deny" },
    { email: "filip.hagen@ateara.onmicrosoft.com", role: "deny" },
    { email: "ingrid.eriksen@ateara.onmicrosoft.com", role: "deny" },
    { email: "erik.bakken@ateara.onmicrosoft.com", role: "deny" },
    // Class 10B
    { email: "sara.lie@ateara.onmicrosoft.com", role: "deny" },
    { email: "magnus.dahl@ateara.onmicrosoft.com", role: "deny" },
    { email: "amalie.lund@ateara.onmicrosoft.com", role: "deny" },
    { email: "henrik.moen@ateara.onmicrosoft.com", role: "deny" },
    { email: "thea.holm@ateara.onmicrosoft.com", role: "deny" },

    // ── ateara.onmicrosoft.com — all other users (demo teachers, IT staff) ─
    { domain: "ateara.onmicrosoft.com", role: "viewer" },

    // ── atea.no — all users get read-only access by default ───────────────
    { domain: "atea.no", role: "viewer" },
    // Specific atea.no users promoted to admin
    { email: "veronica.hogemark@atea.no", role: "admin" },
    { email: "roy-arne.hogestol@atea.no", role: "admin" },
    { email: "anders.dramstad@atea.no", role: "admin" },
    { email: "paul.johnny.klock@atea.no", role: "admin" },
    { email: "uy.le.thai.phan@atea.no", role: "admin" },
    { email: "lene.kadaa@atea.no", role: "admin" },
    { email: "siril.aasheim@atea.no", role: "admin" },

    // ── biss.no customer tenant (locked admin list) ─────────────────────────
    // Keep biss.no users as deny by default and promote only explicit admins.
    { domain: "biss.no", role: "deny" },
    { email: "atea@biss.no", role: "admin" },
    { email: "uy.le.thai.phan@biss.no", role: "admin" },
    { email: "adnan.awan@biss.no", role: "admin" },
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
  const strictPrimaryAccess =
    (process.env.STRICT_PRIMARY_TENANT_ACCESS || "false").toLowerCase() === "true";

  // The school's own tenant — check email/domain mappings first, fall back to admin
  const primaryDomain = process.env.TENANT_DOMAIN?.toLowerCase();
  if (primaryDomain && domain === primaryDomain) {
    // But check if there's an explicit override for this specific email
    const emailMatch = mappings.find((m) => m.email?.toLowerCase() === normalizedEmail);
    if (emailMatch) return emailMatch.role === "deny" ? null : emailMatch.role;
    // Check domain-level mapping (allows viewer/deny for primary domain subsets)
    const domainMatch = mappings.find((m) => m.domain?.toLowerCase() === domain);
    if (domainMatch) return domainMatch.role === "deny" ? null : domainMatch.role;
    if (strictPrimaryAccess) return null;
    return "admin";
  }

  // Check explicit email match first (highest priority)
  const emailMatch = mappings.find((m) => m.email?.toLowerCase() === normalizedEmail);
  if (emailMatch) return emailMatch.role === "deny" ? null : emailMatch.role;

  // Check domain match
  const domainMatch = mappings.find((m) => m.domain?.toLowerCase() === domain);
  if (domainMatch) return domainMatch.role === "deny" ? null : domainMatch.role;

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
