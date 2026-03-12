"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { cn, safeHref } from "@/lib/utils";
import { toast } from "sonner";

export default function SubmissionDetailPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;
  const submissionId = params.submissionId as Id<"submissions">;

  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const submission = useQuery(api.submissions.get, { submissionId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId });
  const updateSubmissionOrganizer = useMutation(api.submissions.updateSubmissionOrganizer);

  const teamId = submission?.teamId;
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editProjUrl, setEditProjUrl] = useState("");
  const [editDemoUrl, setEditDemoUrl] = useState("");
  const [editDeployedUrl, setEditDeployedUrl] = useState("");

  const startEditing = () => {
    if (!submission) return;
    setEditName(submission.name);
    setEditDesc(submission.description);
    setEditProjUrl(submission.projectUrl);
    setEditDemoUrl(submission.demoUrl || "");
    setEditDeployedUrl(submission.deployedUrl || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editDesc.trim() || !editProjUrl.trim() || !submission) return;
    try {
      await updateSubmissionOrganizer({
        submissionId: submission._id,
        name: editName,
        description: editDesc,
        projectUrl: editProjUrl,
        demoUrl: editDemoUrl || undefined,
        deployedUrl: editDeployedUrl || undefined,
      });
      toast.success("Submission updated");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission");
    }
  };

  if (hackathon === undefined || submission === undefined || (teamId && team === undefined)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-xs text-[#555555] uppercase tracking-widest">▓▓▓░░░ LOADING...</p>
      </div>
    );
  }

  if (!hackathon || !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-[#555555] uppercase tracking-wider">SUBMISSION NOT FOUND</p>
          <Link
            href={`/hackathon/${hackathonId}/leaderboard`}
            className="mt-4 inline-flex items-center gap-1 text-xs text-[#00FF41] hover:text-white transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3 w-3" />
            BACK TO LEADERBOARD
          </Link>
        </div>
      </div>
    );
  }

  const projectHref = safeHref(submission.projectUrl);
  const demoHref = safeHref(submission.demoUrl);
  const deployedHref = safeHref(submission.deployedUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back nav */}
      <Link
        href={`/hackathon/${hackathonId}/leaderboard`}
        className="mb-6 inline-flex items-center gap-1 text-xs text-[#555555] hover:text-white transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="h-3 w-3" />
        BACK TO LEADERBOARD
      </Link>

      {/* Header */}
      <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">{submission.name}</h1>
              {team && (
                <span className="tui-badge border-[#555555] text-[#555555]">{team.name}</span>
              )}
              {submission.submissionCount > 1 && (
                <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">v{submission.submissionCount}</span>
              )}
            </div>
            <p className="text-xs text-[#555555]">
              Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            {membership?.role === "organizer" && (
              <button
                onClick={startEditing}
                className="border border-[#1F1F1F] p-1.5 text-[#555555] hover:border-white hover:text-white transition-colors"
                title="Edit Submission"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[#555555] uppercase tracking-widest">── ABOUT THE PROJECT</span>
          <div className="h-px flex-1 bg-[#1F1F1F]" />
        </div>
        <div className="text-sm text-[#AAAAAA] leading-relaxed whitespace-pre-wrap">
          {submission.description}
        </div>
      </div>

      {/* What's New */}
      {submission.submissionCount > 1 && submission.whatsNew && (
        <div className="border border-[#00B4FF]/20 bg-[#00B4FF08] p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-[#00B4FF] uppercase tracking-widest">── WHAT&apos;S NEW IN v{submission.submissionCount}</span>
            <div className="h-px flex-1 bg-[#00B4FF]/20" />
          </div>
          <div className="text-sm text-[#AAAAAA] leading-relaxed whitespace-pre-wrap">
            {submission.whatsNew}
          </div>
        </div>
      )}

      {/* Team Members */}
      {team && team.members && team.members.length > 0 && (
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-[#555555] uppercase tracking-widest">── TEAM MEMBERS</span>
            <div className="h-px flex-1 bg-[#1F1F1F]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {team.members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-3 border border-[#1F1F1F] bg-[#111111] px-3 py-2"
              >
                <div className="h-8 w-8 overflow-hidden bg-[#1F1F1F] flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.userImageUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${member.userName || "User"}`}
                    alt={member.userName || "User"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white uppercase tracking-wide truncate">
                    {member.userName || "Team Member"}
                  </p>
                  <p className="text-xs text-[#555555] uppercase tracking-wider">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Submission Panel */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-300",
          isEditing ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <div
          className="absolute inset-0 bg-black/70 transition-opacity duration-300"
          onClick={() => setIsEditing(false)}
        />
        <div
          className={cn(
            "relative z-10 w-full max-w-md border-l border-[#1F1F1F] bg-[#0A0A0A] h-full flex flex-col transform transition-transform duration-300 ease-in-out",
            isEditing ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1F1F]">
            <span className="text-xs font-bold text-white uppercase tracking-widest">── EDIT SUBMISSION</span>
            <button
              onClick={() => setIsEditing(false)}
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
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 text-xs text-[#555555] border border-[#1F1F1F] uppercase tracking-wider hover:border-white hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
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
