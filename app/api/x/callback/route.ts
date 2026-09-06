import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      {
        error: "X authorization was denied",
        details: error,
      },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      {
        error: "Missing authorization code or state",
      },
      { status: 400 }
    );
  }

  const savedState = req.cookies.get("x_oauth_state")?.value;
  const codeVerifier = req.cookies.get("x_code_verifier")?.value;

  if (!savedState || state !== savedState) {
    return NextResponse.json(
      {
        error: "Invalid OAuth state",
      },
      { status: 400 }
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      {
        error: "PKCE code verifier is missing",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "X_CLIENT_ID is missing",
      },
      { status: 500 }
    );
  }

  if (!clientSecret) {
    return NextResponse.json(
      {
        error: "X_CLIENT_SECRET is missing",
      },
      { status: 500 }
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      {
        error: "X_REDIRECT_URI is missing",
      },
      { status: 500 }
    );
  }

  const basicAuth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const tokenResponse = await fetch(
    "https://api.x.com/2/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return NextResponse.json(
      {
        error: "Failed to exchange authorization code",
        details: tokenData,
      },
      { status: 400 }
    );
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "X did not return an access token",
      },
      { status: 400 }
    );
  }

  /*
   * IMPORTANT:
   *
   * Do NOT use new URL("/", req.url) here.
   *
   * GitHub Codespaces can make req.url appear as localhost
   * internally. Instead, derive the dashboard URL from the
   * configured OAuth redirect URI.
   */
  const appUrl = new URL(redirectUri).origin;

  const response = NextResponse.redirect(
    `${appUrl}/`
  );

  response.cookies.delete("x_oauth_state");
  response.cookies.delete("x_code_verifier");

  response.cookies.set("x_access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2,
    path: "/",
  });

  if (refreshToken) {
    response.cookies.set("x_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return response;
}