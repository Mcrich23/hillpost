"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Layers, Users, Clock, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SubmissionDetailPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;
  const submissionId = params.submissionId as Id<"submissions">;

  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const submission = useQuery(api.submissions.get, { submissionId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId });
  const updateSubmissionOrganizer = useMutation(api.submissions.updateSubmissionOrganizer);
  
  // We only fetch team if submission is loaded, using undefined check
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
  
  // We only fetch team if submission is loaded, using undefined check

  if (hackathon === undefined || submission === undefined || (teamId && team === undefined)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
      </div>
    );
  }

  if (!hackathon || !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-lg text-gray-400">Submission not found</p>
          <Link
            href={`/hackathon/${hackathonId}/leaderboard`}
            className="mt-4 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header & Back Navigation */}
      <div className="mb-8">
        <Link
          href={`/hackathon/${hackathonId}/leaderboard`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leaderboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 w-full justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-emerald-400" />
                <h1 className="text-3xl font-bold text-white tracking-tight">{submission.name}</h1>
              </div>
              {membership?.role === "organizer" && (
                <button
                  onClick={startEditing}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  title="Edit Submission"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-4">
              {team && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-medium text-gray-300">{team.name}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Submitted on {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap gap-3 shrink-0">
            {submission.projectUrl && (
              <a
                href={submission.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 shadow-sm shadow-emerald-900/20"
              >
                <ExternalLink className="h-4 w-4" />
                View Project
              </a>
            )}
            {submission.demoUrl && (
              <a
                href={submission.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Watch Video
              </a>
            )}
            {submission.deployedUrl && (
              <a
                href={submission.deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-4">About the Project</h2>
        <div className="prose prose-invert max-w-none text-gray-300">
          {submission.description.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-4 leading-relaxed whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      
      {/* Team Members Section */}
      {team && team.members && team.members.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            Team Members
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {team.members.map((member) => (
              <div 
                key={member._id} 
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 p-3"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-700 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.userImageUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${member.userName || "User"}`}
                    alt={member.userName || "User"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">
                    {member.userName || "Team Member"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Submission Sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-end transition-all duration-300",
          isEditing ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsEditing(false)}
        />
        
        {/* Slide-over panel */}
        <div
          className={cn(
            "relative z-10 w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out",
            isEditing ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Edit Submission</h2>
              <button
                onClick={() => setIsEditing(false)}
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
                    Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editDemoUrl}
                    onChange={(e) => setEditDemoUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Deployment URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editDeployedUrl}
                    onChange={(e) => setEditDeployedUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editName.trim() || !editDesc.trim() || !editProjUrl.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
