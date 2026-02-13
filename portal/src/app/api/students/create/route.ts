// API: POST /api/students/create — Onboard a new student
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { logStudentAction } from "@/lib/audit-store";
import type { ApiResponse, CreateStudentRequest } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateStudentRequest;
    if (!body.firstName || !body.lastName || !body.groupId) {
      return NextResponse.json(
        { success: false, error: "firstName, lastName, and groupId are required" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();
    const domain = process.env.TENANT_DOMAIN || "ateara.onmicrosoft.com";

    // Build UPN: firstname.lastname@domain
    const baseUPN = `${body.firstName.toLowerCase()}.${body.lastName.toLowerCase()}@${domain}`;
    // Sanitize UPN (remove special chars)
    const upn = baseUPN.replace(/[^a-z0-9.@_-]/g, "");

    // Create user in Entra ID
    const newUser = await client.api("/users").post({
      accountEnabled: true,
      displayName: `${body.firstName} ${body.lastName}`,
      givenName: body.firstName,
      surname: body.lastName,
      userPrincipalName: upn,
      mailNickname: `${body.firstName.toLowerCase()}.${body.lastName.toLowerCase()}`.replace(/[^a-z0-9.-]/g, ""),
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: `Welcome${new Date().getFullYear()}!Student`,
      },
      department: body.department || "Student",
      jobTitle: "Student",
      usageLocation: "NO", // Norway
    });

    // Add to the specified class group
    await client.api(`/groups/${body.groupId}/members/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${newUser.id}`,
    });

    // Also add to the main student group if configured
    const mainGroupId = process.env.STUDENT_GROUP_ID;
    if (mainGroupId && mainGroupId !== body.groupId) {
      try {
        await client.api(`/groups/${mainGroupId}/members/$ref`).post({
          "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${newUser.id}`,
        });
      } catch {
        // May fail if already a member or same group — ignore
      }
    }

    // Get group name for response
    const group = await client.api(`/groups/${body.groupId}`).select("displayName").get();

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "student_created",
      performedBy,
      `${newUser.displayName} (${newUser.userPrincipalName})`,
      `Created and added to ${group.displayName}`,
      group.displayName
    );

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        displayName: newUser.displayName,
        userPrincipalName: newUser.userPrincipalName,
        group: group.displayName,
        temporaryPassword: `Welcome${new Date().getFullYear()}!Student`,
        message: `${newUser.displayName} created and added to ${group.displayName}`,
      },
    } as ApiResponse<Record<string, string>>);
  } catch (error) {
    console.error("Error creating student:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Provide helpful message for duplicate UPN
    if (msg.includes("userPrincipalName already exists")) {
      return NextResponse.json(
        { success: false, error: "A user with this name already exists. Try a different name or add a number." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
