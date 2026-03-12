import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { ExternalLink, Pencil, X, History } from "lucide-react";
import { toast } from "sonner";
import { cn, safeHref } from "@/lib/utils";

interface PublicSubmissionsProps {
  hackathonId: Id<"hackathons">;
  role?: string;
}

export function PublicSubmissions({ hackathonId, role }: PublicSubmissionsProps) {
  const submissions = useQuery(api.submissions.list, { hackathonId });
  const teams = useQuery(api.teams.list, { hackathonId });
  const updateSubmissionOrganizer = useMutation(api.submissions.updateSubmissionOrganizer);

  const [editingId, setEditingId] = useState<Id<"submissions"> | null>(null);
  const [changelogId, setChangelogId] = useState<Id<"submissions"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editProjUrl, setEditProjUrl] = useState("");
  const [editDemoUrl, setEditDemoUrl] = useState("");
  const [editDeployedUrl, setEditDeployedUrl] = useState("");

  const startEditing = (sub: { _id: Id<"submissions">; name: string; description: string; projectUrl: string; demoUrl?: string; deployedUrl?: string }) => {
    setEditingId(sub._id);
    setEditName(sub.name);
    setEditDesc(sub.description);
    setEditProjUrl(sub.projectUrl);
    setEditDemoUrl(sub.demoUrl || "");
    setEditDeployedUrl(sub.deployedUrl || "");
  };

  const handleSave = async (submissionId: Id<"submissions">) => {
    if (!editName.trim() || !editDesc.trim() || !editProjUrl.trim()) return;
    try {
      await updateSubmissionOrganizer({
        submissionId,
        name: editName,
        description: editDesc,
        projectUrl: editProjUrl,
        demoUrl: editDemoUrl || undefined,
        deployedUrl: editDeployedUrl || undefined,
      });
      toast.success("Submission updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission");
    }
  };

  const teamMap = new Map(teams?.map((t) => [t._id, t.name]) ?? []);

  return (
    <div className="space-y-4">
      {!submissions || !teams ? (
        <p className="text-xs text-[#555555] uppercase tracking-wider cursor-blink">▓▓▓░░░ LOADING...</p>
      ) : submissions.length === 0 ? (
        <p className="text-xs text-[#555555] uppercase tracking-wider">NO PROJECTS SUBMITTED YET.</p>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => {
            const projectHref = safeHref(sub.projectUrl);
            const demoHref = safeHref(sub.demoUrl);
            const deployedHref = safeHref(sub.deployedUrl);
            return (
              <div
                key={sub._id}
                className="border border-[#1F1F1F] bg-[#0A0A0A] p-4 transition-colors hover:border-[#2a2a2a]"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white uppercase tracking-wide">{sub.name}</p>
                      <span className="tui-badge border-[#555555] text-[#555555]">
                        {teamMap.get(sub.teamId) ?? "UNKNOWN TEAM"}
                      </span>
                      {sub.submissionCount > 1 && (
                        <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                          v{sub.submissionCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#555555]">{sub.description}</p>
                    {sub.submissionCount > 1 && sub.changelog && sub.changelog.length > 0 && (
                      <div className="mt-2 border border-[#00B4FF]/20 bg-[#00B4FF08] px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-[#00B4FF] uppercase tracking-widest">WHAT&apos;S NEW:</p>
                          {sub.changelog.length > 1 && (
                            <button
                              onClick={() => setChangelogId(changelogId === sub._id ? null : sub._id)}
                              className="flex items-center gap-1 text-xs text-[#00B4FF]/70 hover:text-[#00B4FF] transition-colors uppercase tracking-wider"
                            >
                              <History className="h-3 w-3" />
                              {changelogId === sub._id ? "HIDE" : "VIEW ALL"} ({sub.changelog.length})
                            </button>
                          )}
                        </div>
                        {changelogId === sub._id ? (
                          <div className="space-y-2">
                            {[...sub.changelog].reverse().map((entry, i) => (
                              <div key={i} className={i > 0 ? "border-t border-[#00B4FF]/10 pt-2" : ""}>
                                <p className="text-xs text-[#00B4FF]/60 uppercase tracking-wider mb-0.5">
                                  v{entry.submissionCount} — {format(new Date(entry.submittedAt), "MMM d, yyyy h:mm a")}
                                </p>
                                <p className="text-xs text-[#AAAAAA] whitespace-pre-wrap">{entry.whatsNew}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#AAAAAA] whitespace-pre-wrap">{sub.changelog[sub.changelog.length - 1].whatsNew}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-[#333333] mt-1.5 uppercase tracking-wider">
                      Updated {format(new Date(sub.submittedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {role === "organizer" && (
                      <button
                        onClick={() => startEditing(sub)}
                        className="border border-[#1F1F1F] p-1.5 text-[#555555] hover:border-white hover:text-white transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {projectHref && (
                      <a
                        href={projectHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-[#00FF41] px-3 py-1.5 text-xs font-bold text-[#00FF41] uppercase tracking-wider hover:bg-[#00FF41] hover:text-black transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        PROJECT
                      </a>
                    )}
                    {demoHref && (
                      <a
                        href={demoHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-[#00B4FF] px-3 py-1.5 text-xs font-bold text-[#00B4FF] uppercase tracking-wider hover:bg-[#00B4FF] hover:text-black transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        VIDEO
                      </a>
                    )}
                    {deployedHref && (
                      <a
                        href={deployedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-[#AA44FF] px-3 py-1.5 text-xs font-bold text-[#AA44FF] uppercase tracking-wider hover:bg-[#AA44FF] hover:text-black transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        LIVE DEMO
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Submission Sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-300",
          editingId ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <div
          className="absolute inset-0 bg-black/70 transition-opacity duration-300"
          onClick={() => setEditingId(null)}
        />
        <div
          className={cn(
            "relative z-10 w-full max-w-md border-l border-[#1F1F1F] bg-[#0A0A0A] h-full flex flex-col transform transition-transform duration-300 ease-in-out",
            editingId ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1F1F]">
            <span className="text-xs font-bold text-white uppercase tracking-widest">── EDIT SUBMISSION</span>
            <button
              onClick={() => setEditingId(null)}
              className="p-1.5 text-[#555555] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#555555] uppercase tracking-widest">PROJECT NAME:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="tui-input mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#555555] uppercase tracking-widest">DESCRIPTION:</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={5}
                className="tui-input mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#555555] uppercase tracking-widest">PROJECT URL:</label>
              <input
                type="url"
                value={editProjUrl}
                onChange={(e) => setEditProjUrl(e.target.value)}
                className="tui-input mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#555555] uppercase tracking-widest">VIDEO URL (OPTIONAL):</label>
              <input
                type="url"
                value={editDemoUrl}
                onChange={(e) => setEditDemoUrl(e.target.value)}
                className="tui-input mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#555555] uppercase tracking-widest">DEPLOYMENT URL (OPTIONAL):</label>
              <input
                type="url"
                value={editDeployedUrl}
                onChange={(e) => setEditDeployedUrl(e.target.value)}
                className="tui-input mt-2"
              />
            </div>
          </div>

          <div className="border-t border-[#1F1F1F] px-5 py-4 flex justify-end gap-2 shrink-0">
            <button
              onClick={() => setEditingId(null)}
              className="px-4 py-1.5 text-xs text-[#555555] border border-[#1F1F1F] uppercase tracking-wider hover:border-white hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={() => editingId && handleSave(editingId)}
              disabled={!editName.trim() || !editDesc.trim() || !editProjUrl.trim()}
              className="px-4 py-1.5 text-xs font-bold text-black bg-[#00FF41] uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              [ SAVE CHANGES ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
