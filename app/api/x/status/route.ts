import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("x_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      user: null,
    });
  }

  try {
    const response = await fetch(
      "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username",
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
      return NextResponse.json({
        connected: false,
        user: null,
      });
    }

    return NextResponse.json({
      connected: true,
      user: {
        id: data.data.id,
        username: data.data.username,
        name: data.data.name,
        profile_image_url: data.data.profile_image_url ?? null,
      },
    });
  } catch {
    return NextResponse.json({
      connected: false,
      user: null,
    });
  }
}