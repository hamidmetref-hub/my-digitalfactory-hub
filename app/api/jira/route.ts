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
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

    const activeRes = await fetch(`${base}/board/${boardId}/sprint?state=active`, { headers });
    const activeData = await activeRes.json();
    const activeSprint = activeData.values?.[0];

    const futureRes = await fetch(`${base}/board/${boardId}/sprint?state=future`, { headers });
    const futureData = await futureRes.json();
    const futureSprint = futureData.values?.[0];

    const closedRes = await fetch(`${base}/board/${boardId}/sprint?state=closed`, { headers });
    const closedData = await closedRes.json();
    const closedSprints = closedData.values || [];
    const lastClosed = closedSprints[closedSprints.length - 1];

    let completedIssues: any[] = [];
    if (lastClosed) {
      const doneRes = await fetch(`${base}/sprint/${lastClosed.id}/issue?jql=status in (Done, Closed)&fields=summary,labels&maxResults=10`, { headers });
      const doneData = await doneRes.json();
      completedIssues = doneData.issues || [];
    }

    let activeIssues: any[] = [];
    if (activeSprint) {
      const inProgressRes = await fetch(`${base}/sprint/${activeSprint.id}/issue?jql=status not in (Done, Closed)&fields=summary&maxResults=8`, { headers });
      const inProgressData = await inProgressRes.json();
      activeIssues = inProgressData.issues || [];
    }

    let futureIssues: any[] = [];
    if (futureSprint) {
      const futureIssuesRes = await fetch(`${base}/sprint/${futureSprint.id}/issue?fields=summary&maxResults=8`, { headers });
      const futureIssuesData = await futureIssuesRes.json();
      futureIssues = futureIssuesData.issues || [];
    }

    return NextResponse.json({
      boardId,
      activeSprint: activeSprint ? { id: activeSprint.id, name: activeSprint.name, goal: activeSprint.goal || "" } : null,
      lastClosedSprint: lastClosed ? { id: lastClosed.id, name: lastClosed.name, goal: lastClosed.goal || "" } : null,
      futureSprint: futureSprint ? { id: futureSprint.id, name: futureSprint.name, goal: futureSprint.goal || "" } : null,
      completedIssues: completedIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary, labels: i.fields.labels })),
      activeIssues: activeIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary })),
      futureIssues: futureIssues.map((i: any) => ({ key: i.key, summary: i.fields.summary })),
    });
  } catch (err) {
    console.error("JIRA fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch JIRA data" }, { status: 500 });
  }
}
