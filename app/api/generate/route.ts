import { NextRequest, NextResponse } from "next/server";
import { generatePPTX, ProjectSprintData } from "@/lib/generatePPTX";

async function filterAndSummarizeIssues(issues: string[], context: string, type: string): Promise<string[]> {
  if (issues.length === 0) return [];
  const typeLabelFr = type === "completed" ? "termine" : type === "active" ? "en cours" : "a venir";
  const prompt = `Tu es responsable de la communication produit pour une Digital Factory e-commerce (RAJA Group). Tu rediges les points cles d'un rapport de sprint destine a des managers et stakeholders non-techniques.

Voici une liste de tickets JIRA bruts du sprint ${typeLabelFr} de l'equipe ${context} :

${issues.map((s, i) => `${i + 1}. ${s}`).join("\n")}

CONSIGNE :
Selectionne entre 3 et 5 tickets qui representent un vrai benefice pour l'utilisateur final ou le metier (nouvelle fonctionnalite, amelioration UX visible, correction d'un bug impactant, gain de performance notable).

Pour chacun, reecris le titre en francais, de facon claire et orientee benefice, comme une accroche produit, pas un ticket technique. Le titre doit faire MAXIMUM 60 caracteres (c'est une contrainte stricte, compte les caracteres). Supprime tout prefixe technique ([FRONT], [BACK], #, codes de ticket, crochets). Utilise un vocabulaire simple, sans jargon, comprehensible par quelqu'un qui ne connait pas le produit.

Exemples de transformation :
- "[BACK] Ajout champ PO Number checkout" -> "Numero de bon de commande disponible dans le tunnel d'achat"
- "[FRONT] Persister les prix Google shopping via Algolia" -> "Prix Google Shopping toujours synchronises et a jour"
- "Fix bug panier vide apres refresh" -> "Le panier ne se vide plus apres rafraichissement de la page"
- "[FRONT][ALGOLIA] les filtres ne se reinitialisent pas lors d'une nouvelle recherche" -> "Correction : les filtres de recherche fonctionnent correctement"
- "Corrivo" -> "Nouvelle option de livraison Corrivo disponible"

EXCLUS systematiquement : refacto technique, tests, CI/CD, setup, etude/POC pur, tickets QA seuls, taches internes sans impact visible, sonar/qualite de code.

Reponds UNIQUEMENT avec un JSON valide, sans markdown, sans texte autour :
{"items": ["benefice 1", "benefice 2"]}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    console.log(`AI ${context} ${type}:`, text);
    return JSON.parse(text).items || [];
  } catch (err) {
    console.error("AI error:", err);
    return issues.slice(0, 5);
  }
}


function extractReleaseId(sprintName: string | undefined): string | undefined {
  if (!sprintName) return undefined;
  const match = sprintName.match(/(\d+\.\d+\.\d+\.\d+|\d+\.\d+\.\d+)/);
  return match ? match[0] : undefined;
}

function nextMonday(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined;

  // Convertit en heure de Paris pour determiner le bon jour de la semaine
  const parisDateStr = d.toLocaleString("en-US", { timeZone: "Europe/Paris" });
  const parisDate = new Date(parisDateStr);
  const day = parisDate.getDay(); // 0 = Sunday, 1 = Monday...
  const diff = day === 1 ? 0 : (8 - day) % 7 || 7;
  parisDate.setDate(parisDate.getDate() + diff);

  return parisDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("jira_token")?.value;
  const cloudId = req.cookies.get("jira_cloud_id")?.value;
  if (!token || !cloudId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { projects } = body as { projects: { boardId: string; teamName: string }[] };
    const agile = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0`;
    const rest = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    const projectsData: ProjectSprintData[] = [];

    for (const project of projects) {
      try {
        const activeData = await (await fetch(`${agile}/board/${project.boardId}/sprint?state=active`, { headers })).json();
        const activeSprint = activeData.values?.[0];
        const activeReleaseId = extractReleaseId(activeSprint?.name);
        const activeReleaseDate = nextMonday(activeSprint?.endDate);
        const futureData = await (await fetch(`${agile}/board/${project.boardId}/sprint?state=future`, { headers })).json();
        const futureCandidates = (futureData.values || []).filter((s: any) =>
          !s.name.toLowerCase().includes("backlog")
        );
        const futureSprint = futureCandidates[0];
        const futureReleaseId = extractReleaseId(futureSprint?.name);
        const futureReleaseDate = nextMonday(futureSprint?.endDate);
        const closedCountData = await (await fetch(`${agile}/board/${project.boardId}/sprint?state=closed&maxResults=1`, { headers })).json();
        const totalClosed = closedCountData.total || 0;
        const startAt = Math.max(0, totalClosed - 50);
        const closedData = await (await fetch(`${agile}/board/${project.boardId}/sprint?state=closed&maxResults=50&startAt=${startAt}`, { headers })).json();
        const sortedClosed = [...(closedData.values || [])].sort((a: any, b: any) =>
          new Date(b.endDate || b.completeDate || 0).getTime() - new Date(a.endDate || a.completeDate || 0).getTime()
        );
        const lastClosed = sortedClosed[0];
        const completedReleaseId = extractReleaseId(lastClosed?.name);
        const completedReleaseDate = nextMonday(lastClosed?.endDate);

        let completedItems: { title: string; descH?: number }[] = [];
        const completedGoal = lastClosed?.goal || activeSprint?.goal || "";
        if (lastClosed) {
          let d = await (await fetch(`${rest}/search/jql?jql=sprint%3D${lastClosed.id}%20AND%20status%20IN%20(Done%2CClosed%2C%22RESOLU%22%2C%22R%C3%89SOLU%22)%20AND%20fixVersion%20is%20not%20EMPTY&fields=summary&maxResults=15`, { headers })).json();
          let raw = (d.issues || []).map((i: any) => i.fields.summary);
          if (raw.length === 0) {
            d = await (await fetch(`${rest}/search/jql?jql=sprint%3D${lastClosed.id}%20AND%20status%20IN%20(Done%2CClosed%2C%22RESOLU%22%2C%22R%C3%89SOLU%22)&fields=summary&maxResults=15`, { headers })).json();
            raw = (d.issues || []).map((i: any) => i.fields.summary);
          }
          console.log(`[${project.teamName}] completed raw: ${raw.length}`);
          const filtered = await filterAndSummarizeIssues(raw, project.teamName, "completed");
          completedItems = filtered.map(title => ({ title, descH: 0.22 }));
        }

        let activeItems: string[] = [];
        const activeGoal = activeSprint?.goal || "";
        if (activeSprint) {
          const d = await (await fetch(`${rest}/search/jql?jql=sprint%3D${activeSprint.id}%20AND%20status%20NOT%20IN%20(Done%2CClosed)&fields=summary&maxResults=15`, { headers })).json();
          const raw = (d.issues || []).map((i: any) => i.fields.summary);
          console.log(`[${project.teamName}] active raw: ${raw.length}`);
          activeItems = await filterAndSummarizeIssues(raw, project.teamName, "active");
        }

        let futureItems: string[] = [];
        const futureGoal = futureSprint?.goal || "";
        if (futureSprint) {
          const d = await (await fetch(`${rest}/search/jql?jql=sprint%3D${futureSprint.id}&fields=summary&maxResults=15`, { headers })).json();
          const raw = (d.issues || []).map((i: any) => i.fields.summary);
          console.log(`[${project.teamName}] future raw: ${raw.length}`);
          futureItems = await filterAndSummarizeIssues(raw, project.teamName, "future");
        }

        projectsData.push({
          teamName: project.teamName,
          completedGoal, completedItems, activeGoal, activeItems, futureGoal, futureItems,
          completedReleaseId, completedReleaseDate,
          activeReleaseId, activeReleaseDate,
          futureReleaseId, futureReleaseDate,
        });
      } catch (err) {
        console.error(`Error board ${project.boardId}:`, err);
        projectsData.push({ teamName: project.teamName, completedGoal: "Erreur", completedItems: [], activeGoal: "", activeItems: [], futureGoal: "", futureItems: [] });
      }
    }

    const base64 = await generatePPTX(projectsData);
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return new Response(bytes, { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="sprint-delivery-${new Date().toISOString().split("T")[0]}.pptx"` } });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Failed to generate PPTX" }, { status: 500 });
  }
}
