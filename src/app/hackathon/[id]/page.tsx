"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Trophy,
  Settings,
  Code,
  Gavel,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Users,
  Star,
  Check,
  Link as LinkIcon,
  LogOut,
} from "lucide-react";
import { OrganizerPanel } from "@/components/organizer-panel";
import { CompetitorPanel } from "@/components/competitor-panel";
import { JudgePanel } from "@/components/judge-panel";
import { PublicSubmissions } from "@/components/public-submissions";
import { QrCodeButton } from "@/components/qr-code-overlay";

type Tab = "overview" | "submissions"| "compete" | "judge" | "manage";

export default function HackathonDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const hackathonId = params.id as Id<"hackathons">;
  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId, userId: user?.id });
  
  const submissions = useQuery(api.submissions.list, { hackathonId });
  const allMembers = useQuery(api.members.listMembers, { hackathonId });
  const categories = useQuery(api.categories.list, { hackathonId });
  const leaveHackathon = useMutation(api.members.leaveHackathon);
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);

  const role = membership?.role;

  const copyCompetitorJoinLink = async () => {
    if (!hackathon) return;
    const link = `${window.location.origin}/join/${hackathon.competitorJoinCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedJoinLink(true);
    toast.success("Join link copied!");
    setTimeout(() => setCopiedJoinLink(false), 2000);
  };

  // Calculate pending submissions for the judge badge
  const pendingSubmissionsCount = React.useMemo(() => {
    if (role !== "judge" && role !== "organizer") return 0;
    if (membership?.status === "pending" || membership?.status === "rejected") return 0;
    if (!submissions || !user?.id) return 0;

    return submissions.filter((sub) => {
      const hasJudged = sub.judgedBy?.includes(user.id) ?? false;
      return !hasJudged;
    }).length;
  }, [role, membership?.status, submissions, user?.id]);

  if (hackathon === undefined || membership === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
      </div>
    );
  }

  const handleLeave = async () => {
    if (!user?.id || hackathon?.organizerId === user.id) return;
    
    if (confirm("Are you sure you want to leave this hackathon?")) {
      setIsLeaving(true);
      try {
        await leaveHackathon({ hackathonId, userId: user.id });
        router.push("/dashboard");
      } catch (error) {
        console.error("Failed to leave hackathon:", error);
        setIsLeaving(false);
      }
    }
  };

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean; badge?: number }[] = [
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
      id: "compete",
      label: "Compete",
      icon: <Code className="h-4 w-4" />,
      show: role === "competitor",
    },
    {
      id: "judge",
      label: "Judge",
      icon: <Gavel className="h-4 w-4" />,
      show: role === "judge" || role === "organizer",
      badge: pendingSubmissionsCount,
    },
    {
      id: "manage",
      label: "Manage",
      icon: <Settings className="h-4 w-4" />,
      show: role === "organizer",
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
          <div className="flex flex-col items-end gap-2">
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
            {membership && hackathon.organizerId !== user?.id && (
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 outline-none transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isLeaving ? "Leaving..." : "Leave Hackathon"}
              </button>
            )}
          </div>
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
                "relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center transition-colors hover:border-gray-700">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-white">
                {allMembers?.filter((m) => m.role === "competitor").length ?? "-"}
              </p>
              <p className="text-xs text-gray-500">Builders</p>
            </div>
            
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center transition-colors hover:border-gray-700">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-white">
                {submissions?.length ?? "-"}
              </p>
              <p className="text-xs text-gray-500">Projects</p>
            </div>
            
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center transition-colors hover:border-gray-700">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/20 text-purple-400">
                <Star className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-white">
                {categories?.length ?? "-"}
              </p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
            
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center transition-colors hover:border-gray-700">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-600/20 text-yellow-400">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.max(0, Math.ceil((hackathon.endDate - Date.now()) / (1000 * 60 * 60 * 24)))}
              </p>
              <p className="text-xs text-gray-500">Days Left</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href={`/hackathon/${hackathonId}/leaderboard`}
              className="group flex flex-col justify-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-600/20 text-yellow-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-white group-hover:text-emerald-400">
                    View Leaderboard
                  </p>
                  <p className="text-sm text-gray-400">
                    See real-time rankings and scores
                  </p>
                </div>
              </div>
            </Link>

            {role === "judge" && membership?.status === "approved" ? (
              <div className="flex flex-col justify-center rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h3 className="mb-4 text-sm font-medium text-gray-300">
                  Judging Status
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
                    <Gavel className="h-6 w-6" />
                  </div>
                  <div>
                    {pendingSubmissionsCount > 0 ? (
                      <>
                        <p className="text-xl font-bold text-white">
                          {pendingSubmissionsCount} Project{pendingSubmissionsCount === 1 ? "" : "s"}
                        </p>
                        <p className="text-sm text-gray-400">
                          Waiting to be scored
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-white">All Caught Up</p>
                        <p className="text-sm text-gray-400">
                          Check back later for more
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {pendingSubmissionsCount > 0 && (
                  <button
                    onClick={() => setActiveTab("judge")}
                    className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                  >
                    Start Judging
                  </button>
                )}
              </div>
            ) : (role === "organizer" || role === "competitor") ? (
              <div className="flex flex-col justify-center rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h3 className="mb-2 text-sm font-medium text-gray-300">
                  Competitor Join Code
                </h3>
                <div className="flex items-center gap-3">
                  <code className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-xl tracking-widest text-emerald-400">
                    {hackathon.competitorJoinCode}
                  </code>
                  <button
                    onClick={copyCompetitorJoinLink}
                    className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                    title="Copy join link"
                  >
                    {copiedJoinLink ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </button>
                  <QrCodeButton
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${hackathon.competitorJoinCode}`}
                    label="Competitor Join QR"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Share this code, copy the join link, or show the QR code to invite competitors.
                </p>
              </div>
            ) : null}
          </div>

          {categories && categories.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 flex items-center justify-between border-b border-gray-800 pb-4">
                <h3 className="text-lg font-semibold text-white">Judging Criteria</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((cat) => (
                  <div key={cat._id} className="rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-white">{cat.name}</p>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        {cat.maxScore} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "submissions" && (
        <PublicSubmissions hackathonId={hackathonId} role={role} />
      )}

      {activeTab === "manage" && role === "organizer" && (
        <OrganizerPanel hackathonId={hackathonId} hackathon={hackathon} />
      )}

      {activeTab === "compete" && role === "competitor" && (
        <CompetitorPanel hackathonId={hackathonId} hackathon={hackathon} />
      )}

      {activeTab === "judge" && (role === "judge" || role === "organizer") && (
        <JudgePanel hackathonId={hackathonId} />
      )}
    </div>
  );
}
