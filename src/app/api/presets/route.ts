import { NextResponse } from "next/server";
import { presetSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = presetSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preset", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    preset: parsed.data,
    storage: "client-indexeddb"
  });
}
