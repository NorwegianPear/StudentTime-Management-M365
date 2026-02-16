// API: POST /api/groups/populate — Add demo students to their class groups
// Uses the app's Managed Identity credentials (which have GroupMember.ReadWrite.All)
import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

// Mapping of group displayName → student UPN prefixes (before @domain)
const CLASS_MEMBERS: Record<string, string[]> = {
  "Demo-Students-8A": [
    "emma.hansen", "noah.johansen", "olivia.olsen", "william.larsen", "sophia.andersen",
  ],
  "Demo-Students-9B": [
    "liam.pedersen", "mia.nilsen", "lucas.kristiansen", "ella.jensen", "oscar.karlsen",
  ],
  "Demo-Students-10A": [
    "jakob.berg", "nora.haugen", "filip.hagen", "ingrid.eriksen", "erik.bakken",
  ],
  "Demo-Students-10B": [
    "sara.lie", "magnus.dahl", "amalie.lund", "henrik.moen", "thea.holm",
  ],
};

const SPECIAL_GROUPS: Record<string, string[]> = {
  "Demo-AfterSchool-Program": ["emma.hansen", "liam.pedersen", "jakob.berg"],
  "Demo-Exam-Extended": ["noah.johansen", "nora.haugen"],
};

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();
    const prefix = process.env.GROUP_NAME_PREFIX || "Demo-";
    const masterGroupName = `${prefix}AllStudents`;

    const results: string[] = [];
    let added = 0;
    let skipped = 0;
    let errors = 0;

    // 1. Resolve all managed groups
    const groupsResult = await client
      .api("/groups")
      .header("ConsistencyLevel", "eventual")
      .filter(`securityEnabled eq true and startsWith(displayName,'${prefix}')`)
      .select("id,displayName")
      .top(200)
      .get();

    const groupMap = new Map<string, string>();
    for (const g of groupsResult.value || []) {
      groupMap.set(g.displayName, g.id);
    }

    // Helper: get existing members of a group
    async function getExistingMembers(groupId: string): Promise<Set<string>> {
      try {
        const members = await client
          .api(`/groups/${groupId}/members`)
          .select("id")
          .top(999)
          .get();
        return new Set((members.value || []).map((m: { id: string }) => m.id));
      } catch {
        return new Set();
      }
    }

    // Helper: resolve UPN prefix to user ID
    async function resolveUser(upnPrefix: string): Promise<{ id: string; name: string } | null> {
      try {
        // Get domain from any existing user
        const users = await client
          .api("/users")
          .filter(`startsWith(userPrincipalName,'${upnPrefix}@')`)
          .select("id,displayName,userPrincipalName")
          .top(1)
          .header("ConsistencyLevel", "eventual")
          .get();
        if (users.value?.length > 0) {
          return { id: users.value[0].id, name: users.value[0].displayName };
        }
        return null;
      } catch {
        return null;
      }
    }

    // Helper: add member to group
    async function addMember(groupId: string, userId: string): Promise<boolean> {
      try {
        await client
          .api(`/groups/${groupId}/members/$ref`)
          .post({ "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}` });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exist") || msg.includes("added")) {
          return false; // already a member
        }
        throw err;
      }
    }

    // 2. Populate class groups
    const allStudentIds: string[] = [];

    for (const [groupName, upnPrefixes] of Object.entries(CLASS_MEMBERS)) {
      const groupId = groupMap.get(groupName);
      if (!groupId) {
        results.push(`⚠️ Group not found: ${groupName}`);
        continue;
      }

      const existing = await getExistingMembers(groupId);

      for (const upnPrefix of upnPrefixes) {
        const user = await resolveUser(upnPrefix);
        if (!user) {
          results.push(`⚠️ User not found: ${upnPrefix}`);
          errors++;
          continue;
        }

        allStudentIds.push(user.id);

        if (existing.has(user.id)) {
          skipped++;
          continue;
        }

        try {
          const wasAdded = await addMember(groupId, user.id);
          if (wasAdded) {
            results.push(`✅ ${user.name} → ${groupName}`);
            added++;
          } else {
            skipped++;
          }
        } catch (err) {
          results.push(`❌ ${user.name} → ${groupName}: ${err instanceof Error ? err.message : String(err)}`);
          errors++;
        }
      }
    }

    // 3. Populate special groups
    for (const [groupName, upnPrefixes] of Object.entries(SPECIAL_GROUPS)) {
      const groupId = groupMap.get(groupName);
      if (!groupId) {
        results.push(`⚠️ Special group not found: ${groupName}`);
        continue;
      }

      const existing = await getExistingMembers(groupId);

      for (const upnPrefix of upnPrefixes) {
        const user = await resolveUser(upnPrefix);
        if (!user) continue;

        if (existing.has(user.id)) {
          skipped++;
          continue;
        }

        try {
          const wasAdded = await addMember(groupId, user.id);
          if (wasAdded) {
            results.push(`✅ ${user.name} → ${groupName}`);
            added++;
          } else {
            skipped++;
          }
        } catch (err) {
          results.push(`❌ ${user.name} → ${groupName}: ${err instanceof Error ? err.message : String(err)}`);
          errors++;
        }
      }
    }

    // 4. Add all students to master group
    const masterGroupId = groupMap.get(masterGroupName);
    if (masterGroupId) {
      const existing = await getExistingMembers(masterGroupId);
      const uniqueIds = [...new Set(allStudentIds)];
      for (const userId of uniqueIds) {
        if (existing.has(userId)) {
          skipped++;
          continue;
        }
        try {
          const wasAdded = await addMember(masterGroupId, userId);
          if (wasAdded) {
            results.push(`✅ student → ${masterGroupName}`);
            added++;
          } else {
            skipped++;
          }
        } catch {
          errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Population complete: ${added} added, ${skipped} already members, ${errors} errors`,
        added,
        skipped,
        errors,
        details: results,
      },
    } as ApiResponse<{ message: string; added: number; skipped: number; errors: number; details: string[] }>);
  } catch (error) {
    console.error("Error populating groups:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
