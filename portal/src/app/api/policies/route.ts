// API: GET /api/policies — List all policies
// API: POST /api/policies — Create a new policy
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPolicies, createPolicy } from "@/lib/policy-store";
import { logPolicyAction } from "@/lib/audit-store";
import type { ApiResponse, SchedulePolicy, CreatePolicyRequest } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const policies = await getPolicies();
    const response: ApiResponse<SchedulePolicy[]> = { success: true, data: policies };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: CreatePolicyRequest = await request.json();

    // Validation
    if (!body.name || !body.enableTime || !body.disableTime || !body.daysOfWeek?.length) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, enableTime, disableTime, daysOfWeek" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(body.enableTime) || !timeRegex.test(body.disableTime)) {
      return NextResponse.json(
        { success: false, error: "Invalid time format. Use HH:mm (e.g. 07:55)" },
        { status: 400 }
      );
    }

    const policy = await createPolicy({
      name: body.name,
      description: body.description || "",
      enableTime: body.enableTime,
      disableTime: body.disableTime,
      daysOfWeek: body.daysOfWeek,
      timezone: body.timezone || "W. Europe Standard Time",
      isActive: false,
      createdBy: session.user?.email || "unknown",
    });

    // Audit log
    await logPolicyAction(
      "policy_created",
      session.user?.email || "unknown",
      `Created policy "${policy.name}" (${policy.enableTime}-${policy.disableTime}, ${policy.daysOfWeek.join(", ")})`
    );

    const response: ApiResponse<SchedulePolicy> = { success: true, data: policy };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating policy:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
