"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { ExternalLink, Layers } from "lucide-react";

interface PublicSubmissionsProps {
  hackathonId: Id<"hackathons">;
}

export function PublicSubmissions({ hackathonId }: PublicSubmissionsProps) {
  const submissions = useQuery(api.submissions.list, { hackathonId });
  const teams = useQuery(api.teams.list, { hackathonId });

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
                  <div className="flex gap-2 shrink-0">
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
    </div>
  );
}
