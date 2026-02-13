// API: /api/special-groups/[id] — Update/Delete a special group
import { NextResponse } from "next/server";
import { deleteSpecialGroup, updateSpecialGroup } from "@/lib/group-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateSpecialGroup(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Special group not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteSpecialGroup(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Special group not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
