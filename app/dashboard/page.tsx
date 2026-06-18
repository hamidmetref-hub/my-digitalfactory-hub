"use client";

import { useState } from "react";

interface Project {
  boardId: string;
  teamName: string;
}

const DEFAULT_PROJECTS: Project[] = [
  { boardId: "505", teamName: "CORE" },
  { boardId: "344", teamName: "Skroll" },
  { boardId: "974", teamName: "RAJA NEXT" },
];

type Status = "idle" | "loading" | "success" | "error";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const updateProject = (index: number, field: keyof Project, value: string) => {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addProject = () => {
    setProjects((prev) => [...prev, { boardId: "", teamName: "" }]);
  };

  const removeProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    const validProjects = projects.filter((p) => p.boardId.trim() && p.teamName.trim());
    if (validProjects.length === 0) {
      setErrorMsg("Veuillez renseigner au moins un projet JIRA.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: validProjects }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sprint-delivery-${new Date().toISOString().split("T")[0]}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur inconnue");
      setStatus("error");
    }
  };

  const colColors = [
    { bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-600",   label: "text-blue-700" },
    { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-600",  label: "text-green-700" },
    { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-600", label: "text-purple-700" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-8 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">Sprint Delivery</p>
          <h1 className="text-lg font-bold">Digital Factory Generator</h1>
        </div>
        <a
          href="/api/auth/logout"
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Déconnexion
        </a>
      </header>

      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Intro */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Générer les slides de sprint</h2>
          <p className="text-gray-500 text-sm">
            Renseignez les clés de vos projets JIRA. Le générateur récupère automatiquement les sprints actifs, les tickets livrés et à venir.
          </p>
        </div>

        {/* Projects */}
        <div className="space-y-4 mb-8">
          {projects.map((project, index) => {
            const color = colColors[index % colColors.length];
            return (
              <div
                key={index}
                className={`rounded-xl border ${color.border} ${color.bg} p-5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  <span className={`text-sm font-semibold ${color.label}`}>
                    Projet {index + 1}
                  </span>
                  {projects.length > 1 && (
                    <button
                      onClick={() => removeProject(index)}
                      className="ml-auto text-gray-400 hover:text-red-500 text-xs transition"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Clé JIRA
                    </label>
                    <input
                      type="text"
                      value={project.boardId}
                      onChange={(e) => updateProject(index, "boardId", e.target.value.toUpperCase())}
                      placeholder="ex: 505"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nom de l'équipe
                    </label>
                    <input
                      type="text"
                      value={project.teamName}
                      onChange={(e) => updateProject(index, "teamName", e.target.value)}
                      placeholder="ex: 505"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add project */}
        <button
          onClick={addProject}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition mb-8"
        >
          + Ajouter un projet
        </button>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-700">
          <p className="font-medium mb-1">Ce que le générateur récupère automatiquement</p>
          <ul className="text-blue-600 space-y-0.5 text-xs">
            <li>• Sprint goal de chaque colonne (livré, en cours, à venir)</li>
            <li>• Tickets du dernier sprint clôturé (Ce qu'on livre)</li>
            <li>• Tickets en cours du sprint actif</li>
            <li>• Tickets du prochain sprint (Sprint +1)</li>
          </ul>
        </div>

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {errorMsg}
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">
            ✓ Fichier généré et téléchargé avec succès !
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={status === "loading"}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-center gap-3 text-base"
        >
          {status === "loading" ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Récupération des données JIRA…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
              </svg>
              Générer le PowerPoint
            </>
          )}
        </button>
      </div>
    </main>
  );
}
