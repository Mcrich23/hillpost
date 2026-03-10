"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Layers, Users, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SubmissionDetailPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;
  const submissionId = params.submissionId as Id<"submissions">;

  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const submission = useQuery(api.submissions.get, { submissionId });
  
  // We only fetch team if submission is loaded, using undefined check
  const teamId = submission?.teamId;
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip");

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
            <div className="flex items-center gap-3 mb-2">
              <Layers className="h-8 w-8 text-emerald-400" />
              <h1 className="text-3xl font-bold text-white tracking-tight">{submission.name}</h1>
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
                Watch Demo
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
                  {/* Assuming member has some identifier, otherwise just display a placeholder */}
                  <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-800 border border-gray-600 font-medium">
                    {/* Using an initial would be nice, but we just have userId. Let's show a generic icon. */}
                    <Users className="h-5 w-5" />
                  </div>
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
          <div className="mt-4 flex rounded-md bg-blue-500/10 p-4">
             <div className="flex-1 text-sm text-blue-400">
                Note: Participant names aren't securely exposed to everyone by default. Team members shown based on role.
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
