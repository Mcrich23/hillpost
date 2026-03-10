"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Settings,
  Code,
  Gavel,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
} from "lucide-react";
import { OrganizerPanel } from "@/components/organizer-panel";
import { CompetitorPanel } from "@/components/competitor-panel";
import { JudgePanel } from "@/components/judge-panel";
import { PublicSubmissions } from "@/components/public-submissions";

type Tab = "overview" | "submissions" | "manage" | "compete" | "judge";

export default function HackathonDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const hackathonId = params.id as Id<"hackathons">;
  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId, userId: user?.id });

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (hackathon === undefined || membership === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-lg text-gray-400">Hackathon not found</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const role = membership?.role;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <Trophy className="h-4 w-4" />,
      show: true,
    },
    {
      id: "submissions",
      label: "Submissions",
      icon: <Layers className="h-4 w-4" />,
      show: true,
    },
    {
      id: "manage",
      label: "Manage",
      icon: <Settings className="h-4 w-4" />,
      show: role === "organizer",
    },
    {
      id: "compete",
      label: "Compete",
      icon: <Code className="h-4 w-4" />,
      show: role === "competitor",
    },
    {
      id: "judge",
      label: "Judge",
      icon: <Gavel className="h-4 w-4" />,
      show: role === "judge",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{hackathon.name}</h1>
            <p className="mt-1 text-gray-400">{hackathon.description}</p>
          </div>
          {hackathon.isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-600/20 px-3 py-1 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-gray-600/20 px-3 py-1 text-sm text-gray-400">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Inactive
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(hackathon.startDate), "MMM d, yyyy")} –{" "}
            {format(new Date(hackathon.endDate), "MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {hackathon.submissionFrequencyMinutes}min submission cooldown
          </span>
          {role && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                role === "organizer"
                  ? "border-purple-500/30 bg-purple-600/20 text-purple-400"
                  : role === "judge"
                    ? "border-blue-500/30 bg-blue-600/20 text-blue-400"
                    : "border-emerald-500/30 bg-emerald-600/20 text-emerald-400"
              )}
            >
              {role}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 p-1">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <Link
            href={`/hackathon/${hackathonId}/leaderboard`}
            className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-emerald-500/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-600/20 text-yellow-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-white group-hover:text-emerald-400">
                View Leaderboard
              </p>
              <p className="text-sm text-gray-400">
                See real-time rankings and scores
              </p>
            </div>
          </Link>

          {role === "organizer" && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-2 text-sm font-medium text-gray-300">
                Join Code
              </h3>
              <code className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-lg tracking-widest text-emerald-400">
                {hackathon.joinCode}
              </code>
              <p className="mt-2 text-xs text-gray-500">
                Share this code with participants to join
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "submissions" && (
        <PublicSubmissions hackathonId={hackathonId} />
      )}

      {activeTab === "manage" && role === "organizer" && (
        <OrganizerPanel hackathonId={hackathonId} hackathon={hackathon} />
      )}

      {activeTab === "compete" && role === "competitor" && (
        <CompetitorPanel hackathonId={hackathonId} hackathon={hackathon} />
      )}

      {activeTab === "judge" && role === "judge" && (
        <JudgePanel hackathonId={hackathonId} />
      )}
    </div>
  );
}
