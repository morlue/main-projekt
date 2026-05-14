import { NextResponse } from "next/server";
import { defaultIngredients } from "@/lib/ingredients";

export function GET() {
  return NextResponse.json({ ingredients: defaultIngredients });
}
