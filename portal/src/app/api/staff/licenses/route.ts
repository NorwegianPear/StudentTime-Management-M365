// API: GET /api/staff/licenses — List all available licenses in the tenant
import { NextResponse } from "next/server";
import { getGraphClient } from "@/lib/graph-client";
import { auth } from "@/lib/auth";
import type { AvailableLicense, ApiResponse } from "@/types";

// Friendly names for common M365 Education SKUs
const LICENSE_NAMES: Record<string, string> = {
  "94763226-9b3c-4e75-a931-5c89701abe66": "Microsoft 365 A1 for Faculty",
  "78e66a63-337a-4a9a-8959-41c6654dfb56": "Microsoft 365 A3 for Faculty",
  "e97c048c-37a4-45fb-ab50-922fbf07a370": "Microsoft 365 A5 for Faculty",
  "314c4481-f395-4525-be8b-2ec4bb1e9d91": "Microsoft 365 A1 for Students",
  "18250162-5d87-4436-a834-d795c15c80f3": "Microsoft 365 A3 for Students",
  "46c119d4-0379-4a9d-85e4-97c66d3f909e": "Microsoft 365 A5 for Students",
  "dcb1a3ae-b33f-4487-846a-a640262fadf4": "Microsoft 365 Business Basic",
  "05e9a617-0261-4cee-bb44-138d3ef5d965": "Microsoft 365 E3",
  "06ebc4ee-1bb5-47dd-8120-11324bc54e06": "Microsoft 365 E5",
  "4b585984-651b-448a-9e53-3b10f069cf7f": "Office 365 F3",
  "6fd2c87f-b296-42f0-b197-1e91e994b900": "Office 365 E3",
  "c7df2760-2c81-4ef7-b578-5b5392b571df": "Office 365 E5",
  "3b555118-da6a-4418-894f-7df1e2096870": "Microsoft 365 Business Standard",
  "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46": "Microsoft 365 Business Premium",
  "1f2f344a-700d-42c9-9427-5cea45d4a4d2": "Microsoft Stream",
  "a403ebcc-fae0-4ca2-8c8c-7a907fd6c235": "Power BI (free)",
  "f8a1db68-be16-40ed-86d5-cb42ce701560": "Power BI Pro",
  "061f9ace-7d42-4136-88ac-31dc755f143f": "Intune",
  "efccb6f7-5641-4e0e-bd10-b4976e1bf68e": "Enterprise Mobility + Security E3",
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getGraphClient();

    const result = await client
      .api("/subscribedSkus")
      .get();

    const licenses: AvailableLicense[] = (result.value || []).map(
      (sku: {
        skuId: string;
        skuPartNumber: string;
        consumedUnits: number;
        prepaidUnits: { enabled: number };
      }) => ({
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        displayName: LICENSE_NAMES[sku.skuId] || sku.skuPartNumber,
        consumedUnits: sku.consumedUnits,
        prepaidUnitsEnabled: sku.prepaidUnits?.enabled || 0,
        availableUnits: (sku.prepaidUnits?.enabled || 0) - sku.consumedUnits,
      })
    );

    // Sort: available > 0 first, then by display name
    licenses.sort((a, b) => {
      if (a.availableUnits > 0 && b.availableUnits <= 0) return -1;
      if (a.availableUnits <= 0 && b.availableUnits > 0) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({
      success: true,
      data: licenses,
    } as ApiResponse<AvailableLicense[]>);
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
