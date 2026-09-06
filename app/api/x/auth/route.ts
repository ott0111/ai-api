import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId) {
    return NextResponse.json(
      { error: "X_CLIENT_ID is missing" },
      { status: 500 }
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      { error: "X_REDIRECT_URI is missing" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(32).toString("hex");

  const codeVerifier = crypto
    .randomBytes(32)
    .toString("base64url");

  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const scope = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    `https://x.com/i/oauth2/authorize?${params.toString()}`
  );

  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}