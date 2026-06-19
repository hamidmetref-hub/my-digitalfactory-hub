import PptxGenJS from "pptxgenjs";

// ── Palette ──
const BG       = "FFFFFF";
const COL1_BG  = "F0F4FF";
const COL2_BG  = "F0FAF4";
const COL3_BG  = "F7F0FF";
const COL1_ACC = "3B4FD4";
const COL2_ACC = "1A7A44";
const COL3_ACC = "6B3FAD";
const TEXT_DARK = "1A1A1A";
const TEXT_MED  = "444444";
const TEXT_SOFT = "888888";
const DIVIDER   = "E0E0E0";

const MARGIN = 0.3;
const COL_W  = 2.97;
const COL_GAP = 0.075;
const COL_H  = 4.3;
const COL_Y  = 1.15;
const COL1_X = MARGIN;
const COL2_X = COL1_X + COL_W + COL_GAP;
const COL3_X = COL2_X + COL_W + COL_GAP;

interface SprintItem {
  title: string;
  tag?: string;
  desc?: string;
  descH?: number;
}

interface ColData {
  goal: string;
  items: SprintItem[] | string[];
}

function buildSlide(
  pres: PptxGenJS,
  teamName: string,
  col1: ColData,
  col2: ColData,
  col3: ColData,
  releases: { id?: string; date?: string }[]
) {
  const slide = pres.addSlide();
  slide.background = { color: BG };

  // ── Header ──
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: TEXT_DARK }, line: { color: TEXT_DARK },
  });
  slide.addText("SPRINT DELIVERY", {
    x: MARGIN, y: 0.07, w: 5, h: 0.28,
    fontSize: 7.5, fontFace: "Calibri", bold: true,
    color: "AAAAAA", charSpacing: 4,
  });
  slide.addText(`Communication · Sprint – ${teamName}`, {
    x: MARGIN, y: 0.33, w: 6.5, h: 0.42,
    fontSize: 18, fontFace: "Calibri", bold: true, color: "FFFFFF",
  });
  slide.addText(`Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, {
    x: 7, y: 0.28, w: 2.7, h: 0.3,
    fontSize: 9, fontFace: "Calibri", color: "BBBBBB", align: "right",
  });

  // ── Column headers ──
  const buildSub = (base: string, rel: { id?: string; date?: string }) => {
    const parts = [base];
    if (rel.id) parts.push(`Rel. ${rel.id}`);
    if (rel.date) parts.push(rel.date);
    return parts.join("  ·  ");
  };

  const cols = [
    { x: COL1_X, label: "Ce qu'on livre",  sub: buildSub("Sprint terminé", releases[0] || {}), acc: COL1_ACC, bg: COL1_BG },
    { x: COL2_X, label: "Sprint en cours", sub: buildSub("En cours", releases[1] || {}),        acc: COL2_ACC, bg: COL2_BG },
    { x: COL3_X, label: "Sprint +1",       sub: buildSub("À venir", releases[2] || {}),         acc: COL3_ACC, bg: COL3_BG },
  ];

  for (const c of cols) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: c.x, y: COL_Y, w: COL_W, h: COL_H,
      fill: { color: c.bg }, rectRadius: 0.08,
      line: { color: DIVIDER, width: 0.75 },
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: c.x, y: COL_Y, w: COL_W, h: 0.52,
      fill: { color: c.acc }, rectRadius: 0.08, line: { color: c.acc },
    });
    slide.addShape(pres.ShapeType.rect, {
      x: c.x, y: COL_Y + 0.3, w: COL_W, h: 0.22,
      fill: { color: c.acc }, line: { color: c.acc },
    });
    slide.addText(c.label, {
      x: c.x + 0.15, y: COL_Y + 0.05, w: COL_W - 0.3, h: 0.25,
      fontSize: 11, fontFace: "Calibri", bold: true, color: "FFFFFF",
    });
    slide.addText(c.sub, {
      x: c.x + 0.15, y: COL_Y + 0.27, w: COL_W - 0.3, h: 0.2,
      fontSize: 8, fontFace: "Calibri", color: "DDDDDD",
    });
  }

  // ── Col 1 — Ce qu'on livre ──
  let y = COL_Y + 0.62;

  slide.addText("SPRINT GOAL", {
    x: COL1_X + 0.15, y, w: COL_W - 0.3, h: 0.2,
    fontSize: 7.5, fontFace: "Calibri", bold: true, color: COL1_ACC, charSpacing: 2,
  });
  y += 0.2;
  slide.addText(col1.goal || "Sprint goal non renseigné", {
    x: COL1_X + 0.15, y, w: COL_W - 0.3, h: 0.62,
    fontSize: 9, fontFace: "Calibri", italic: true, color: TEXT_MED,
  });
  y += 0.68;

  slide.addShape(pres.ShapeType.line, {
    x: COL1_X + 0.15, y, w: COL_W - 0.3, h: 0,
    line: { color: DIVIDER, width: 0.75 },
  });
  y += 0.15;

  const col1Items = col1.items.slice(0, 4);
  for (let i = 0; i < col1Items.length; i++) {
    const item = col1Items[i] as SprintItem;
    const title = item.title.length > 65 ? item.title.substring(0, 62) + "..." : item.title;
    slide.addText(`${i + 1}.  ${title}`, {
      x: COL1_X + 0.15, y, w: COL_W - 0.3, h: 0.32,
      fontSize: 9, fontFace: "Calibri", bold: true, color: TEXT_DARK,
    });
    y += 0.32;
    if (item.tag) {
      const chipW = item.tag.length * 0.075 + 0.2;
      slide.addShape(pres.ShapeType.roundRect, {
        x: COL1_X + 0.15, y, w: chipW, h: 0.18,
        fill: { color: COL1_ACC, transparency: 85 }, rectRadius: 0.03,
        line: { color: COL1_ACC, width: 0.5 },
      });
      slide.addText(item.tag, {
        x: COL1_X + 0.15, y, w: chipW, h: 0.18,
        fontSize: 7, fontFace: "Calibri", bold: true, color: COL1_ACC, align: "center",
      });
      y += 0.22;
    }
    if (item.desc) {
      slide.addText(item.desc, {
        x: COL1_X + 0.15, y, w: COL_W - 0.3, h: item.descH || 0.4,
        fontSize: 8.5, fontFace: "Calibri", color: TEXT_MED,
      });
      y += (item.descH || 0.4) + 0.1;
    }
  }

  // ── Col 2 — Sprint en cours ──
  y = COL_Y + 0.62;

  slide.addText("SPRINT GOAL", {
    x: COL2_X + 0.15, y, w: COL_W - 0.3, h: 0.2,
    fontSize: 7.5, fontFace: "Calibri", bold: true, color: COL2_ACC, charSpacing: 2,
  });
  y += 0.2;
  slide.addText(col2.goal || "Sprint goal non renseigné", {
    x: COL2_X + 0.15, y, w: COL_W - 0.3, h: 0.62,
    fontSize: 9, fontFace: "Calibri", italic: true, color: TEXT_MED,
  });
  y += 0.68;

  slide.addShape(pres.ShapeType.line, {
    x: COL2_X + 0.15, y, w: COL_W - 0.3, h: 0,
    line: { color: DIVIDER, width: 0.75 },
  });
  y += 0.15;

  for (const item of (col2.items as string[]).slice(0, 5)) {
    const txt2 = item.length > 65 ? item.substring(0, 62) + "..." : item;
    slide.addShape(pres.ShapeType.ellipse, {
      x: COL2_X + 0.15, y: y + 0.06, w: 0.1, h: 0.1,
      fill: { color: COL2_ACC }, line: { color: COL2_ACC },
    });
    slide.addText(txt2, {
      x: COL2_X + 0.32, y, w: COL_W - 0.47, h: 0.28,
      fontSize: 8.5, fontFace: "Calibri", color: TEXT_MED,
    });
    y += 0.3;
  }

  // ── Col 3 — Sprint +1 ──
  y = COL_Y + 0.62;

  slide.addText("SPRINT GOAL", {
    x: COL3_X + 0.15, y, w: COL_W - 0.3, h: 0.2,
    fontSize: 7.5, fontFace: "Calibri", bold: true, color: COL3_ACC, charSpacing: 2,
  });
  y += 0.2;
  slide.addText(col3.goal || "Sprint goal non renseigné", {
    x: COL3_X + 0.15, y, w: COL_W - 0.3, h: 0.62,
    fontSize: 9, fontFace: "Calibri", italic: true, color: TEXT_MED,
  });
  y += 0.68;

  slide.addShape(pres.ShapeType.line, {
    x: COL3_X + 0.15, y, w: COL_W - 0.3, h: 0,
    line: { color: DIVIDER, width: 0.75 },
  });
  y += 0.15;

  for (const item of (col3.items as string[]).slice(0, 5)) {
    const txt3 = item.length > 65 ? item.substring(0, 62) + "..." : item;
    slide.addShape(pres.ShapeType.ellipse, {
      x: COL3_X + 0.15, y: y + 0.06, w: 0.1, h: 0.1,
      fill: { color: COL3_ACC }, line: { color: COL3_ACC },
    });
    slide.addText(txt3, {
      x: COL3_X + 0.32, y, w: COL_W - 0.47, h: 0.28,
      fontSize: 8.5, fontFace: "Calibri", color: TEXT_MED,
    });
    y += 0.26;
  }

  // ── Footer ──
  slide.addText(
    `Questions ? Slobodan VELJANOSKI (${teamName} – Digital Factory)   ·   Confidentiel`,
    {
      x: MARGIN, y: 5.38, w: 9.4, h: 0.2,
      fontSize: 7.5, fontFace: "Calibri", color: TEXT_SOFT, align: "left",
    }
  );
}

export interface ProjectSprintData {
  teamName: string;
  completedReleaseId?: string;
  completedReleaseDate?: string;
  activeReleaseId?: string;
  activeReleaseDate?: string;
  futureReleaseId?: string;
  futureReleaseDate?: string;
  completedGoal: string;
  completedItems: SprintItem[];
  activeGoal: string;
  activeItems: string[];
  futureGoal: string;
  futureItems: string[];
}

export async function generatePPTX(projects: ProjectSprintData[]): Promise<string> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = "Sprint Delivery Communication";

  for (const p of projects) {
    buildSlide(
      pres,
      p.teamName,
      { goal: p.completedGoal, items: p.completedItems },
      { goal: p.activeGoal,    items: p.activeItems },
      { goal: p.futureGoal,    items: p.futureItems },
      [
        { id: p.completedReleaseId, date: p.completedReleaseDate },
        { id: p.activeReleaseId, date: p.activeReleaseDate },
        { id: p.futureReleaseId, date: p.futureReleaseDate },
      ]
    );
  }

  const base64 = await pres.write({ outputType: "base64" }) as string;
  return base64;
}
