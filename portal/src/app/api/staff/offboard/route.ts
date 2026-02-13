// API: POST /api/staff/offboard — Offboard a staff user: disable, remove licenses, revoke sessions, etc.
import { NextRequest, NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import { logStudentAction } from "@/lib/audit-store";
import type { OffboardStaffRequest, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can offboard staff
  const role = (session as unknown as { portalRole?: string }).portalRole;
  if (role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as OffboardStaffRequest;

    if (!body.userId || !body.offboardReason) {
      return NextResponse.json(
        { success: false, error: "userId and offboardReason are required" },
        { status: 400 }
      );
    }

    const client = await getGraphClient();
    const actions: string[] = [];

    // Get user info for audit
    const user = await client
      .api(`/users/${body.userId}`)
      .select("displayName,userPrincipalName,assignedLicenses")
      .get();

    // 1. Disable account
    if (body.disableAccount) {
      await client.api(`/users/${body.userId}`).patch({
        accountEnabled: false,
      });
      actions.push("Account disabled");
    }

    // 2. Revoke all sessions
    if (body.revokeSessions) {
      try {
        await client.api(`/users/${body.userId}/revokeSignInSessions`).post({});
        actions.push("Sessions revoked");
      } catch (e) {
        console.error("Failed to revoke sessions:", e);
        actions.push("Session revoke failed");
      }
    }

    // 3. Remove all licenses
    if (body.removeLicenses && user.assignedLicenses?.length > 0) {
      try {
        const licenseIds = user.assignedLicenses.map(
          (l: { skuId: string }) => l.skuId
        );
        await client.api(`/users/${body.userId}/assignLicense`).post({
          addLicenses: [],
          removeLicenses: licenseIds,
        });
        actions.push(`${licenseIds.length} license(s) removed`);
      } catch (e) {
        console.error("Failed to remove licenses:", e);
        actions.push("License removal failed");
      }
    }

    // 4. Remove from all groups
    if (body.removeFromGroups) {
      try {
        const memberOf = await client
          .api(`/users/${body.userId}/memberOf`)
          .select("id,displayName")
          .top(100)
          .get();

        let removedCount = 0;
        for (const group of memberOf.value || []) {
          if (group["@odata.type"] === "#microsoft.graph.group") {
            try {
              await client.api(`/groups/${group.id}/members/${body.userId}/$ref`).delete();
              removedCount++;
            } catch {
              // May fail for dynamic groups — ignore
            }
          }
        }
        actions.push(`Removed from ${removedCount} group(s)`);
      } catch (e) {
        console.error("Failed to remove from groups:", e);
        actions.push("Group removal failed");
      }
    }

    // 5. Convert mailbox to shared (requires Exchange Online admin)
    if (body.convertToSharedMailbox) {
      // Note: This requires Exchange Online PowerShell or Exchange admin API.
      // Graph API doesn't directly support this. We log it as a manual action.
      actions.push("⚠️ Shared mailbox conversion requested — requires Exchange Admin action");
    }

    // 6. Set email forwarding
    if (body.forwardEmail) {
      try {
        // Set mail forwarding using mailboxSettings
        await client.api(`/users/${body.userId}/mailboxSettings`).patch({
          automaticRepliesSetting: {
            status: "alwaysEnabled",
            internalReplyMessage: `This employee has left the organization. Please contact ${body.forwardEmail} instead.`,
            externalReplyMessage: `This employee has left the organization. Please contact ${body.forwardEmail} instead.`,
          },
        });
        actions.push(`Auto-reply set to redirect to ${body.forwardEmail}`);
      } catch (e) {
        console.error("Failed to set mail forwarding:", e);
        actions.push("Mail forwarding failed");
      }
    }

    // Audit log
    const performedBy = session.user?.email || session.user?.name || "Unknown";
    await logStudentAction(
      "student_removed", // reuse action type
      performedBy,
      `${user.displayName} (${user.userPrincipalName})`,
      `Staff offboarded: ${body.offboardReason}. Actions: ${actions.join(", ")}`,
      undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        userId: body.userId,
        displayName: user.displayName,
        userPrincipalName: user.userPrincipalName,
        actions,
        reason: body.offboardReason,
        message: `${user.displayName} offboarded successfully`,
      },
    } as ApiResponse<Record<string, string | string[]>>);
  } catch (error) {
    console.error("Error offboarding staff:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
