import { NextRequest, NextResponse } from "next/server";

import { createPost } from "@/app/lib/x/posts";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Post text is required" },
        { status: 400 }
      );
    }

    const accessToken = req.cookies.get(
      "x_access_token"
    )?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "X account is not connected",
          code: "X_NOT_CONNECTED",
        },
        { status: 401 }
      );
    }

    const result = await createPost(
      text,
      accessToken
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Posting failed",
      },
      { status: 500 }
    );
  }
}