import { NextRequest, NextResponse } from "next/server";

import {
  generateReplySuggestion,
} from "@/app/api/ai/generate-reply/route";
import { searchXPosts } from "@/app/lib/x/search";

async function getAuthenticatedUser(accessToken: string) {
  const response = await fetch(
    "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.data) {
    throw new Error(
      data?.detail || data?.title || "Unable to fetch current X user"
    );
  }

  return data.data;
}

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("x_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "X account is not connected",
        code: "X_NOT_CONNECTED",
      },
      { status: 401 }
    );
  }

  try {
    const { keyword, instructions } = await req.json();
    const normalizedKeyword = String(keyword ?? "").trim();

    if (!normalizedKeyword) {
      return NextResponse.json(
        {
          success: false,
          error: "Keyword is required",
        },
        { status: 400 }
      );
    }

    const currentUser = await getAuthenticatedUser(accessToken);
    const searchResults = await searchXPosts(
      accessToken,
      normalizedKeyword
    );

    const seenTexts = new Set<string>();
    const opportunities = [] as Array<{
      tweetId: string;
      text: string;
      author: {
        id: string;
        username: string;
        name: string;
        profileImageUrl?: string | null;
      };
      suggestedReply: string;
    }>;

    for (const post of searchResults.slice(0, 5)) {
      if (post.authorId === currentUser.id) {
        continue;
      }

      const normalizedText = post.text.replace(/\s+/g, " ").trim().toLowerCase();

      if (!normalizedText || seenTexts.has(normalizedText)) {
        continue;
      }

      seenTexts.add(normalizedText);

      try {
        const suggestedReply = await generateReplySuggestion({
          postText: post.text,
          authorUsername: post.author.username,
          instructions:
            String(instructions ?? "").trim() ||
            "Casual and insightful",
        });

        opportunities.push({
          tweetId: post.tweetId,
          text: post.text,
          author: {
            id: post.author.id,
            username: post.author.username,
            name: post.author.name,
            profileImageUrl: post.author.profileImageUrl ?? null,
          },
          suggestedReply,
        });
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      opportunities,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to find auto comment opportunities",
      },
      { status: 500 }
    );
  }
}
