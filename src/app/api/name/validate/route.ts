import { NextResponse } from "next/server";
import { isNameForbidden } from "@/lib/nameModeration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body?.name;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ valid: false, error: "Name is required." }, { status: 400 });
    }

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ valid: false, error: "Name must be at least 2 characters." }, { status: 400 });
    }
    if (trimmed.length > 25) {
      return NextResponse.json({ valid: false, error: "Name must be 25 characters or fewer." }, { status: 400 });
    }

    const check = await isNameForbidden(trimmed);
    if (check.isForbidden) {
      return NextResponse.json(
        {
          valid: false,
          error: "This name contains restricted or inappropriate language. Please choose another name.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: "Validation error." },
      { status: 500 }
    );
  }
}
