import { NextRequest, NextResponse } from "next/server";
import { generatePPTX, ProjectSprintData } from "@/lib/generatePPTX";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("jira_token")?.value;
  const cloudId = req.cookies.get("jira_cloud_id")?.value;

  if (!token || !cloudId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projects } = body as { projects: { boardId: string; teamName: string }[] };

    const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

    const projectsData: ProjectSprintData[] = [];
    console.log("Projects reçus:", JSON.stringify(projects));

    for (const project of projects) {
      const activeRes = await fetch(`${base}/board/${project.boardId}/sprint?state=active`, { headers });
      const activeData = await activeRes.json();
      const activeSprint = activeData.values?.[0];

      const futureRes = await fetch(`${base}/board/${project.boardId}/sprint?state=future`, { headers });
      const futureData = await futureRes.json();
      const futureSprint = futureData.values?.[0];

      const closedRes = await fetch(`${base}/board/${project.boardId}/sprint?state=closed`, { headers });
      const closedData = await closedRes.json();
      const closedSprints = closedData.values || [];
      const lastClosed = closedSprints[closedSprints.length - 1];

      let completedItems: { title: string; tag?: string }[] = [];
      const completedGoal = lastClosed?.goal || activeSprint?.goal || "";

      if (lastClosed) {
        const doneRes = await fetch(`${base}/sprint/${lastClosed.id}/issue?jql=status in (Done, Closed)&fields=summary,labels&maxResults=8`, { headers });
        const doneData = await doneRes.json();
        completedItems = (doneData.issues || []).map((i: any) => ({
          title: i.fields.summary,
          tag: i.fields.labels?.[0] || undefined,
          descH: 0.25,
        }));
      }

      let activeItems: string[] = [];
      const activeGoal = activeSprint?.goal || "";
      if (activeSprint) {
        const inProgressRes = await fetch(`${base}/sprint/${activeSprint.id}/issue?jql=status not in (Done, Closed)&fields=summary&maxResults=6`, { headers });
        const inProgressData = await inProgressRes.json();
        activeItems = (inProgressData.issues || []).map((i: any) => i.fields.summary);
      }

      let futureItems: string[] = [];
      const futureGoal = futureSprint?.goal || "";
      if (futureSprint) {
        const futureIssuesRes = await fetch(`${base}/sprint/${futureSprint.id}/issue?fields=summary&maxResults=6`, { headers });
        const futureIssuesData = await futureIssuesRes.json();
        futureItems = (futureIssuesData.issues || []).map((i: any) => i.fields.summary);
      }

      console.log("Goals:", completedGoal, activeGoal, futureGoal);
      projectsData.push({
        teamName: project.teamName,
        completedGoal,
        completedItems,
        activeGoal,
        activeItems,
        futureGoal,
        futureItems,
      });
    }

    const base64 = await generatePPTX(projectsData);
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="sprint-delivery-${new Date().toISOString().split("T")[0]}.pptx"`,
      },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Failed to generate PPTX" }, { status: 500 });
  }
}
