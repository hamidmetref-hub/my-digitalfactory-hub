import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  try {
    const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        code,
        redirect_uri: process.env.ATLASSIAN_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/?error=token_failed", req.url));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get accessible resources (cloud IDs)
    const resourcesRes = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const resources = await resourcesRes.json();
    const cloudId = resources[0]?.id;

    // Store in cookie (httpOnly, secure)
    const expires = new Date(Date.now() + expires_in * 1000);
    const response = NextResponse.redirect(new URL("/dashboard", req.url));

    response.cookies.set("jira_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires,
      path: "/",
    });

    response.cookies.set("jira_cloud_id", cloudId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires,
      path: "/",
    });

    if (refresh_token) {
      response.cookies.set("jira_refresh", refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url));
  }
}
