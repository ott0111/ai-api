import { NextRequest, NextResponse } from "next/server";

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
    const { tweetId, text } = await req.json();
    const normalizedTweetId = String(tweetId ?? "").trim();
    const normalizedText = String(text ?? "").trim();

    if (!normalizedTweetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tweet ID is required",
        },
        { status: 400 }
      );
    }

    if (!normalizedText) {
      return NextResponse.json(
        {
          success: false,
          error: "Reply text is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: normalizedText,
        reply: {
          in_reply_to_tweet_id: normalizedTweetId,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.detail ||
            data?.title ||
            "Reply failed",
        },
        {
          status: response.status === 401 ? 401 : 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Posting reply failed",
      },
      { status: 500 }
    );
  }
}
