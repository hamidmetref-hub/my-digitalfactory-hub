import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.delete("jira_token");
  response.cookies.delete("jira_cloud_id");
  response.cookies.delete("jira_refresh");
  return response;
}
