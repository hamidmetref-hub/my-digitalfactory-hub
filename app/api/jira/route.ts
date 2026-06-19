import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("jira_token")?.value;
  const cloudId = req.cookies.get("jira_cloud_id")?.value;

  if (!token || !cloudId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json({ error: "Missing boardId" }, { status: 400 });
  }

  try {
    const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0`;
    const rest = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

    const activeRes = await fetch(`${base}/board/${boardId}/sprint?state=active`, { headers });
    const activeData = await activeRes.json();
    const activeSprint = activeData.values?.[0];

    const futureRes = await fetch(`${base}/board/${boardId}/sprint?state=future`, { headers });
    const futureData = await futureRes.json();
    const futureCandidates = (futureData.values || []).filter((s: any) => !s.name.toLowerCase().includes("backlog"));
    const futureSprint = futureCandidates[0];

    const countRes = await fetch(`${base}/board/${boardId}/sprint?state=closed&maxResults=1`, { headers });
    const countData = await countRes.json();
    const total = countData.total || 0;
    console.log(`Board ${boardId}: total closed sprints = ${total}`);

    const startAt = Math.max(0, total - 50);
    const closedRes = await fetch(`${base}/board/${boardId}/sprint?state=closed&maxResults=50&startAt=${startAt}`, { headers });
    const closedData = await closedRes.json();
    const closedSprints = closedData.values || [];

    const sorted = [...closedSprints].sort((a: any, b: any) =>
      new Date(b.endDate || b.completeDate || 0).getTime() - new Date(a.endDate || a.completeDate || 0).getTime()
    );
    const lastClosed = sorted[0];
    console.log(`Board ${boardId}: lastClosed = ${lastClosed?.name}`);

    let completedIssues: any[] = [];
    if (lastClosed) {
      const doneRes = await fetch(
        `${rest}/search/jql?jql=sprint%3D${lastClosed.id}%20AND%20status%20IN%20(Done%2CClosed%2C%22RESOLU%22%2C%22R%C3%89SOLU%22)&fields=summary&maxResults=15`,
        { headers }
      );
      const doneData = await doneRes.json();
      completedIssues = doneData.issues || [];
    }

    let activeIssues: any[] = [];
    if (activeSprint) {
      const activeIssuesRes = await fetch(
        `${rest}/search/jql?jql=sprint%3D${activeSprint.id}%20AND%20status%20NOT%20IN%20(Done%2CClosed)&fields=summary&maxResults=15`,
        { headers }
      );
      const activeIssuesData = await activeIssuesRes.json();
      activeIssues = activeIssuesData.issues || [];
    }

    let futureIssues: any[] = [];
    if (futureSprint) {
      const futureIssuesRes = await fetch(
        `${rest}/search/jql?jql=sprint%3D${futureSprint.id}&fields=summary&maxResults=15`,
        { headers }
      );
      const futureIssuesData = await futureIssuesRes.json();
      futureIssues = futureIssuesData.issues || [];
    }

    return NextResponse.json({
      boardId,
      activeSprint: activeSprint ? { id: activeSprint.id, name: activeSprint.name, goal: activeSprint.goal || "" } : null,
      lastClosedSprint: lastClosed ? { id: lastClosed.id, name: lastClosed.name, goal: lastClosed.goal || "" } : null,
      futureSprint: futureSprint ? { id: futureSprint.id, name: futureSprint.name, goal: futureSprint.goal || "" } : null,
      completedIssues: completedIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary })),
      activeIssues: activeIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary })),
      futureIssues: futureIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary })),
    });
  } catch (err) {
    console.error("JIRA fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch JIRA data" }, { status: 500 });
  }
}
