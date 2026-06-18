"use client";

import { useState } from "react";

const PROJECTS = [
  { boardId: "344",  teamName: "Skroll Team",  color: "blue" },
  { boardId: "505",  teamName: "Core Team",    color: "green" },
  { boardId: "341", teamName: "Eproc Team",   color: "orange" },
  { boardId: "974",  teamName: "Next Team",    color: "purple" },
];

type Status = "idle" | "loading" | "success" | "error";

const colorMap: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-600",   label: "text-blue-700" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-600",  label: "text-green-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", label: "text-orange-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-600", label: "text-purple-700" },
};

export default function Dashboard() {
  const [selected, setSelected] = useState<Set<string>>(new Set(PROJECTS.map(p => p.boardId)));
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleProject = (boardId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(boardId) ? next.delete(boardId) : next.add(boardId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === PROJECTS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(PROJECTS.map(p => p.boardId)));
    }
  };

  const handleGenerate = async () => {
    const projects = PROJECTS.filter(p => selected.has(p.boardId));
    if (projects.length === 0) {
      setErrorMsg("Veuillez sélectionner au moins un projet.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprint-delivery-" + new Date().toISOString().split("T")[0] + ".pptx";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur inconnue");
      setStatus("error");
    }
  };

  const allSelected = selected.size === PROJECTS.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">Sprint Delivery</p>
          <h1 className="text-lg font-bold">Digital Factory Generator</h1>
        </div>
        <a href="/api/auth/logout" className="text-sm text-gray-400 hover:text-white transition">Déconnexion</a>
      </header>

      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Générer les slides de sprint</h2>
          <p className="text-gray-500 text-sm">Sélectionnez les équipes à inclure dans le PowerPoint.</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">{selected.size} équipe{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</span>
          <button onClick={toggleAll} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition">
            {allSelected ? "Tout désélectionner" : "Exporter tout"}
          </button>
        </div>

        <div className="space-y-3 mb-8">
          {PROJECTS.map((project) => {
            const isSelected = selected.has(project.boardId);
            const c = colorMap[project.color];
            return (
              <div key={project.boardId} onClick={() => toggleProject(project.boardId)}
                className={"flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all " + (isSelected ? c.bg + " " + c.border : "bg-white border-gray-200 opacity-60")}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleProject(project.boardId)}
                  className="w-5 h-5 rounded" onClick={e => e.stopPropagation()} />
                <div className={"w-2.5 h-2.5 rounded-full " + c.dot} />
                <div className="flex-1">
                  <p className={"font-semibold " + (isSelected ? c.label : "text-gray-500")}>{project.teamName}</p>
                </div>
                {isSelected && (
                  <svg className={"w-5 h-5 " + c.label} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {status === "error" && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{errorMsg}</div>}
        {status === "success" && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">Fichier généré et téléchargé avec succès !</div>}

        <button onClick={handleGenerate} disabled={status === "loading" || selected.size === 0}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-3 text-base">
          {status === "loading" ? "Récupération des données JIRA…" : "Générer le PowerPoint (" + selected.size + " équipe" + (selected.size > 1 ? "s" : "") + ")"}
        </button>
      </div>
    </main>
  );
}
