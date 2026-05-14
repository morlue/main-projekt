import { NextResponse } from "next/server";
import { createRecommendation } from "@/lib/fueling-core";
import { defaultIngredients } from "@/lib/ingredients";
import { sessionInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = sessionInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid session input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return NextResponse.json(createRecommendation(parsed.data, defaultIngredients));
}
