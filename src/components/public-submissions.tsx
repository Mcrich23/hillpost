import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { ExternalLink, Layers, Pencil, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PublicSubmissionsProps {
  hackathonId: Id<"hackathons">;
  role?: string;
}

export function PublicSubmissions({ hackathonId, role }: PublicSubmissionsProps) {
  const submissions = useQuery(api.submissions.list, { hackathonId });
  const teams = useQuery(api.teams.list, { hackathonId });
  const updateSubmissionOrganizer = useMutation(api.submissions.updateSubmissionOrganizer);
  const { user } = useUser();

  const [editingId, setEditingId] = useState<Id<"submissions"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editProjUrl, setEditProjUrl] = useState("");
  const [editDemoUrl, setEditDemoUrl] = useState("");

  const startEditing = (sub: any) => {
    setEditingId(sub._id);
    setEditName(sub.name);
    setEditDesc(sub.description);
    setEditProjUrl(sub.projectUrl);
    setEditDemoUrl(sub.demoUrl || "");
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
      });
      toast.success("Submission updated");
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission");
    }
  };

  const teamMap = new Map(teams?.map((t) => [t._id, t.name]) ?? []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">
          <Layers className="mr-2 inline h-5 w-5 text-emerald-400" />
          Submitted Projects
        </h3>

        {!submissions || !teams ? (
          <p className="text-sm text-gray-500">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No projects submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub._id}
                className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-white">{sub.name}</p>
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300 border border-gray-600">
                        {teamMap.get(sub.teamId) ?? "Unknown Team"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{sub.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {role === "organizer" && (
                      <button
                        onClick={() => startEditing(sub)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <a
                      href={sub.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md bg-emerald-600/10 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Project
                    </a>
                    {sub.demoUrl && (
                      <a
                        href={sub.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-blue-600/10 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-blue-600/20 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Demo
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Updated {format(new Date(sub.submittedAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Submission Sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-300",
          editingId ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setEditingId(null)}
        />
        
        {/* Slide-over panel */}
        <div
          className={cn(
            "relative z-10 w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out",
            editingId ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Edit Submission</h2>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={editProjUrl}
                    onChange={(e) => setEditProjUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Demo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editDemoUrl}
                    onChange={(e) => setEditDemoUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 px-6 py-4 flex gap-3 justify-end bg-gray-900/50">
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => editingId && handleSave(editingId)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
