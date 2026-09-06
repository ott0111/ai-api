import { NextRequest, NextResponse } from "next/server";

import { searchXPosts } from "@/app/lib/x/search";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("x_access_token")?.value;
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim() ?? "";

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        posts: [],
        error: "X account is not connected",
        code: "X_NOT_CONNECTED",
      },
      { status: 401 }
    );
  }

  if (!keyword) {
    return NextResponse.json(
      {
        success: false,
        posts: [],
        error: "Keyword is required",
      },
      { status: 400 }
    );
  }

  try {
    const posts = await searchXPosts(accessToken, keyword);

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to search X posts";

    return NextResponse.json(
      {
        success: false,
        posts: [],
        error: message,
      },
      {
        status:
          message === "Keyword is required" ? 400 : 500,
      }
    );
  }
}
