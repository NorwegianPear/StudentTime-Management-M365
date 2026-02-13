// API: POST /api/staff/onboard — Create new staff user with auto-assigned licenses
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { logStudentAction } from "@/lib/audit-store";
import type { OnboardStaffRequest, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can onboard staff
  const role = (session as unknown as { portalRole?: string }).portalRole;
  if (role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as OnboardStaffRequest;

    if (!body.firstName || !body.lastName || !body.role) {
      return NextResponse.json(
        { success: false, error: "firstName, lastName, and role are required" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();
    const domain = process.env.TENANT_DOMAIN || "ateara.onmicrosoft.com";

    // Build UPN: firstname.lastname@domain
    const rawUpn = `${body.firstName.toLowerCase()}.${body.lastName.toLowerCase()}@${domain}`;
    const upn = rawUpn.replace(/[^a-z0-9.@_-]/g, "");
    const mailNickname = `${body.firstName.toLowerCase()}.${body.lastName.toLowerCase()}`.replace(/[^a-z0-9.-]/g, "");

    // Determine job title based on role or custom
    const jobTitle = body.jobTitle || body.role;

    // Create user in Entra ID
    const newUser = await client.api("/users").post({
      accountEnabled: true,
      displayName: `${body.firstName} ${body.lastName}`,
      givenName: body.firstName,
      surname: body.lastName,
      userPrincipalName: upn,
      mailNickname,
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: `Welcome${new Date().getFullYear()}!Staff`,
      },
      department: body.department || body.role,
      jobTitle,
      officeLocation: body.officeLocation || undefined,
      mobilePhone: body.mobilePhone || undefined,
      usageLocation: "NO", // Required for license assignment
    });

    // Auto-assign licenses
    const assignedLicenses: string[] = [];
    if (body.licenseSkuIds && body.licenseSkuIds.length > 0) {
      try {
        await client.api(`/users/${newUser.id}/assignLicense`).post({
          addLicenses: body.licenseSkuIds.map((skuId) => ({
            skuId,
            disabledPlans: [],
          })),
          removeLicenses: [],
        });
        assignedLicenses.push(...body.licenseSkuIds);
      } catch (licErr) {
        console.error("License assignment error:", licErr);
        // User created but license failed — continue and report
      }
    }

    // Add to groups if specified
    const addedGroups: string[] = [];
    if (body.groupIds && body.groupIds.length > 0) {
      for (const gid of body.groupIds) {
        try {
          await client.api(`/groups/${gid}/members/$ref`).post({
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${newUser.id}`,
          });
          addedGroups.push(gid);
        } catch {
          // May already be member — ignore
        }
      }
    }

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "student_created", // reuse action type for audit
      performedBy,
      `${newUser.displayName} (${upn})`,
      `Staff onboarded as ${body.role}. Licenses: ${assignedLicenses.length}, Groups: ${addedGroups.length}`,
      body.department || body.role
    );

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        displayName: newUser.displayName,
        userPrincipalName: upn,
        role: body.role,
        licensesAssigned: assignedLicenses.length,
        groupsAdded: addedGroups.length,
        temporaryPassword: `Welcome${new Date().getFullYear()}!Staff`,
        message: `${newUser.displayName} onboarded successfully as ${body.role}`,
      },
    } as ApiResponse<Record<string, string | number>>);
  } catch (error) {
    console.error("Error onboarding staff:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("userPrincipalName already exists")) {
      return NextResponse.json(
        { success: false, error: "A user with this name already exists. Try a different name." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
