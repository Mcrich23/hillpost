"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
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
  ExternalLink,
} from "lucide-react";
import { OrganizerPanel } from "@/components/organizer-panel";
import { CompetitorPanel } from "@/components/competitor-panel";
import { JudgePanel } from "@/components/judge-panel";
import { PublicSubmissions } from "@/components/public-submissions";
import { QrCodeButton } from "@/components/qr-code-overlay";

import { isSafeHttpUrl } from "@/lib/url";

const ALL_TABS = ["overview", "submissions", "compete", "judge", "manage"] as const;
type Tab = (typeof ALL_TABS)[number];
const VALID_TABS: Tab[] = ALL_TABS;

const roleColor = (role: string) => {
  switch (role) {
    case "organizer": return "border-[#FF6600] text-[#FF6600]";
    case "judge": return "border-[#00B4FF] text-[#00B4FF]";
    case "competitor": return "border-[#00FF41] text-[#00FF41]";
    default: return "border-[#555555] text-[#555555]";
  }
};

export default function HackathonDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const hackathonId = params.id as Id<"hackathons">;
  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId });

  const submissions = useQuery(api.submissions.list, { hackathonId });
  const allMembers = useQuery(api.members.listMembers, { hackathonId });
  const categories = useQuery(api.categories.list, { hackathonId });
  const sponsors = useQuery(api.sponsors.list, { hackathonId });
  const featuredSponsors = sponsors?.filter((s) => (s.displayStyle ?? "medium") === "featured") ?? [];
  const largeSponsors = sponsors?.filter((s) => (s.displayStyle ?? "medium") === "large") ?? [];
  const mediumSmallSponsors = sponsors?.filter((s) => { const d = s.displayStyle ?? "medium"; return d === "medium" || d === "small"; }) ?? [];
  const leaveHackathon = useMutation(api.members.leaveHackathon);
  const syncProfile = useMutation(api.members.syncUserProfile);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLeaving, setIsLeaving] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && membership && user?.imageUrl) {
      syncProfile({
        hackathonId,
        userImageUrl: user.imageUrl,
      }).catch(console.error);
    }
  }, [isAuthenticated, user?.imageUrl, membership, hackathonId, syncProfile]);

  const tabParam = searchParams.get("tab");
  const parsedTab = (VALID_TABS as string[]).includes(tabParam ?? "") ? (tabParam as Tab) : null;
  const activeTab: Tab = parsedTab ?? "overview";
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);

  const handleTabChange = (tab: Tab) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      newParams.delete("tab");
    } else {
      newParams.set("tab", tab);
    }
    const qs = newParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const role = membership?.role;

  const copyCompetitorJoinLink = async () => {
    if (!hackathon?.competitorJoinCode) return;
    try {
      const link = `${window.location.origin}/join/${hackathon.competitorJoinCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedJoinLink(true);
      toast.success("Join link copied!");
      setTimeout(() => setCopiedJoinLink(false), 2000);
    } catch (error) {
      console.error("Failed to copy join link to clipboard:", error);
      toast.error("Failed to copy join link. Please try again.");
    }
  };

  const pendingSubmissionsCount = React.useMemo(() => {
    if (role !== "judge" && role !== "organizer") return 0;
    if (membership?.status === "pending" || membership?.status === "rejected") return 0;
    if (!submissions || !user?.id) return 0;
    return submissions.filter((sub) => {
      const hasJudged = sub.judgedBy?.includes(user.id) ?? false;
      return !hasJudged;
    }).length;
  }, [role, membership?.status, submissions, user?.id]);

  const pendingApprovalsCount = React.useMemo(() => {
    if (role !== "organizer" || !allMembers) return 0;
    return allMembers.filter((m) => m.status === "pending").length;
  }, [role, allMembers]);

  if (hackathon === undefined || membership === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-64 border border-[#1F1F1F] bg-[#0A0A0A] flex items-center justify-center">
          <span className="text-xs text-[#555555] uppercase tracking-widest cursor-blink">
            ▓▓▓░░░ LOADING...
          </span>
        </div>
      </div>
    );
  }

  const handleLeave = async () => {
    if (!user?.id || hackathon?.organizerId === user.id) return;
    if (confirm("Are you sure you want to leave this hackathon?")) {
      setIsLeaving(true);
      try {
        await leaveHackathon({ hackathonId });
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
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-[#555555] uppercase tracking-wide">Hackathon not found</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; show: boolean; badge?: number }[] = [
    { id: "overview", label: "OVERVIEW", show: true },
    { id: "submissions", label: "SUBMISSIONS", show: role === "organizer" },
    { id: "compete", label: "COMPETE", show: role === "competitor" },
    {
      id: "judge",
      label: "JUDGE",
      show: role === "judge" || role === "organizer",
      badge: pendingSubmissionsCount,
    },
    {
      id: "manage",
      label: "MANAGE",
      show: role === "organizer",
      badge: pendingApprovalsCount,
    },
  ];

  const activeTabConfig = tabs.find((t) => t.id === activeTab);
  if (activeTabConfig && !activeTabConfig.show) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-white uppercase tracking-wide">404 — Page Not Found</p>
          <p className="mt-2 text-xs text-[#555555]">The &quot;{activeTab.toUpperCase()}&quot; section could not be found.</p>
          <button
            onClick={() => handleTabChange("overview")}
            className="mt-4 inline-flex items-center gap-2 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white uppercase tracking-wide">{hackathon.name}</h1>
            <p className="mt-1 text-xs text-[#555555]">{hackathon.description}</p>
          </div>
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
            {hackathon.isActive ? (
              <span className="flex items-center gap-2 text-xs text-[#00FF41] uppercase tracking-widest border border-[#00FF41]/30 px-2.5 py-1">
                <span className="status-pulse h-1.5 w-1.5 bg-[#00FF41] inline-block" />
                [ ACTIVE ]
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs text-[#555555] uppercase tracking-widest border border-[#1F1F1F] px-2.5 py-1">
                <span className="h-1.5 w-1.5 bg-[#555555] inline-block" />
                [ INACTIVE ]
              </span>
            )}
            {membership && hackathon.organizerId !== user?.id && (
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex items-center gap-1.5 border border-red-500/20 px-3 py-1 text-xs text-red-400 uppercase tracking-wider hover:border-red-500 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3 w-3" />
                {isLeaving ? "LEAVING..." : "[ LEAVE ]"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#555555]">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(hackathon.startDate), "MMM d, yyyy")} —{" "}
            {format(new Date(hackathon.endDate), "MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {hackathon.submissionFrequencyMinutes}min cooldown
          </span>
          {role && (
            <span className={cn("tui-badge", roleColor(role))}>
              {role.toUpperCase()}
            </span>
          )}
          <span className="tui-badge border-[#555555] text-[#555555]">
            {Math.max(0, Math.ceil((hackathon.endDate - Date.now()) / (1000 * 60 * 60 * 24)))} {Math.max(0, Math.ceil((hackathon.endDate - Date.now()) / (1000 * 60 * 60 * 24))) === 1 ? "DAY" : "DAYS"} LEFT
          </span>
        </div>
      </div>

      {/* TUI Tabs */}
      <div className="mb-6 flex gap-0 overflow-x-auto border border-[#1F1F1F]">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap border-r border-[#1F1F1F] last:border-r-0",
                activeTab === tab.id
                  ? "bg-white text-black"
                  : "bg-black text-[#555555] hover:text-white"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 text-[10px] font-bold text-[#FF6600]">
                  ●{tab.badge}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          {role === "organizer" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "BUILDERS",
                value: allMembers?.filter((m) => m.role === "competitor").length ?? "—",
                color: "#00B4FF",
                icon: Users,
              },
              {
                label: "PROJECTS",
                value: submissions?.length ?? "—",
                color: "#00FF41",
                icon: Layers,
              },
              {
                label: "CATEGORIES",
                value: categories?.length ?? "—",
                color: "#FF6600",
                icon: Star,
              },
              {
                label: "DAYS LEFT",
                value: Math.max(0, Math.ceil((hackathon.endDate - Date.now()) / (1000 * 60 * 60 * 24))),
                color: "#555555",
                icon: Clock,
              },
            ].map(({ label, value, color, icon: Icon }) => (
              <div
                key={label}
                className="border border-[#1F1F1F] bg-[#0A0A0A] p-4 text-center"
              >
                <div className="mb-1 text-xs text-[#555555] uppercase tracking-widest">
                  ─ {label} ─
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href={`/hackathon/${hackathonId}/leaderboard`}
              className="group flex flex-col justify-center gap-4 border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-colors hover:border-[#FF6600]"
            >
              <div className="flex items-center gap-4">
                <Trophy className="h-8 w-8 text-[#FF6600]" />
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#FF6600] transition-colors">
                    VIEW LEADERBOARD →
                  </p>
                  <p className="text-xs text-[#555555]">
                    See real-time rankings and scores
                  </p>
                </div>
              </div>
            </Link>

            {role === "judge" ? (
              membership?.status === "approved" ? (
                <div className="flex flex-col justify-center border border-[#1F1F1F] bg-[#0A0A0A] p-6">
                  <h3 className="mb-4 text-xs font-bold text-[#555555] uppercase tracking-widest">
                    ─ JUDGING STATUS ─
                  </h3>
                  <div className="flex items-center gap-4">
                    <Gavel className="h-8 w-8 text-[#00B4FF]" />
                    <div>
                      {pendingSubmissionsCount > 0 ? (
                        <>
                          <p className="text-xl font-bold text-white tabular-nums">
                            {pendingSubmissionsCount} PENDING
                          </p>
                          <p className="text-xs text-[#555555]">
                            Waiting to be scored
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-[#00FF41]">ALL CAUGHT UP</p>
                          <p className="text-xs text-[#555555]">
                            Check back later for more
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {pendingSubmissionsCount > 0 && (
                    <button
                      onClick={() => handleTabChange("judge")}
                      className="mt-6 w-full border border-[#00B4FF] py-2 text-xs font-bold text-[#00B4FF] uppercase tracking-wider transition-colors hover:bg-[#00B4FF] hover:text-black"
                    >
                      [ START JUDGING → ]
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-[#FF6600]/20 bg-[#FF660008] p-6 text-center">
                  <Gavel className="mb-4 h-8 w-8 text-[#FF6600]" />
                  <h3 className="mb-2 text-sm font-bold text-white uppercase">
                    APPROVAL PENDING
                  </h3>
                  <p className="text-xs text-[#555555]">
                    Your request to judge is waiting for organizer approval.
                  </p>
                </div>
              )
            ) : (role === "organizer" || role === "competitor") ? (
              <div className="flex flex-col justify-center border border-[#1F1F1F] bg-[#0A0A0A] p-6">
                <h3 className="mb-2 text-xs font-bold text-[#555555] uppercase tracking-widest">
                  ─ COMPETITOR JOIN CODE ─
                </h3>
                <div className="flex flex-col gap-2">
                  <code className="border border-[#1F1F1F] bg-black px-4 py-2 text-lg tracking-widest text-[#00FF41] font-bold break-all">
                    {hackathon?.competitorJoinCode ?? "—"}
                  </code>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyCompetitorJoinLink}
                      className="border border-[#1F1F1F] p-2 text-[#555555] hover:border-white hover:text-white transition-colors"
                      title="Copy join link"
                      aria-label="Copy join link"
                    >
                      {copiedJoinLink ? (
                        <Check className="h-4 w-4 text-[#00FF41]" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                    {hackathon?.competitorJoinCode && (
                      <QrCodeButton
                        path={`/join/${hackathon.competitorJoinCode}`}
                        label="Competitor Join QR"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#333333]">
                  Share this code or copy the join link to invite competitors.
                </p>
              </div>
            ) : null}
          </div>

          {categories && categories.length > 0 && (
            <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs text-[#555555] uppercase tracking-widest">── JUDGING CRITERIA</span>
                <div className="h-px flex-1 bg-[#1F1F1F]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((cat) => (
                  <div key={cat._id} className="border border-[#1F1F1F] bg-[#111111] p-4 transition-colors hover:border-[#2a2a2a]">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-white uppercase tracking-wide">{cat.name}</p>
                      <span className="tui-badge border-[#00FF41] text-[#00FF41]">
                        {cat.maxScore} PTS
                      </span>
                    </div>
                    <p className="text-xs text-[#555555] leading-relaxed">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sponsors Section */}
          {sponsors && sponsors.length > 0 && (
            <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs text-[#555555] uppercase tracking-widest">── SPONSORS</span>
                <div className="h-px flex-1 bg-[#1F1F1F]" />
              </div>

              {/* Featured sponsors — full-width rows */}
              {featuredSponsors.length > 0 && (
                <div className="mb-6 space-y-4">
                  {featuredSponsors.map((sponsor) => {
                    const imageContent = sponsor.bannerUrl ? (
                      <div className="relative w-full overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsor.bannerUrl} alt={`${sponsor.name} banner`} className="h-36 w-full object-cover" />
                        {sponsor.pfpUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sponsor.pfpUrl} alt={sponsor.name} className="absolute bottom-2 left-3 h-14 w-14 rounded-full border-2 border-[#0A0A0A] object-cover" />
                        )}
                      </div>
                    ) : sponsor.pfpUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sponsor.pfpUrl} alt={sponsor.name} className="h-20 w-20 rounded-full border border-[#1F1F1F] object-cover" />
                    ) : null;

                    return (
                    <div key={sponsor._id} className="flex flex-col items-start gap-3 w-full group">
                      {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) && imageContent ? (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className={sponsor.bannerUrl ? "w-full block" : "block"}>
                          {imageContent}
                        </a>
                      ) : imageContent}
                      {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-base font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors">
                          {sponsor.name}
                          {sponsor.badgeText && (
                            <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                          )}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <p className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                          {sponsor.name}
                          {sponsor.badgeText && (
                            <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )})}
                </div>
              )}

              {/* Large sponsors — own row */}
              {largeSponsors.length > 0 && (
                <div className="flex flex-wrap gap-4 items-start mb-4">
                  {largeSponsors.map((sponsor) => {
                    const imageContent = sponsor.bannerUrl ? (
                      <div className="relative w-full sm:w-72 overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsor.bannerUrl} alt={`${sponsor.name} banner`} className="h-28 w-full object-cover" />
                        {sponsor.pfpUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sponsor.pfpUrl} alt={sponsor.name} className="absolute bottom-2 left-2 h-12 w-12 rounded-full border-2 border-[#0A0A0A] object-cover" />
                        )}
                      </div>
                    ) : sponsor.pfpUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sponsor.pfpUrl} alt={sponsor.name} className="h-20 w-20 rounded-full border border-[#1F1F1F] object-cover" />
                    ) : null;

                    return (
                    <div key={sponsor._id} className="flex w-full flex-col items-start gap-2 sm:w-72 sm:items-center group">
                      {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) && imageContent ? (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className={sponsor.bannerUrl ? "w-full block" : "block"}>
                          {imageContent}
                        </a>
                      ) : imageContent}
                      {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors">
                          {sponsor.name}
                          {sponsor.badgeText && (
                            <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                          )}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1">
                          {sponsor.name}
                          {sponsor.badgeText && (
                            <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )})}
                </div>
              )}

              {/* Medium + Small sponsors — own row */}
              {mediumSmallSponsors.length > 0 && (
                <div className="flex flex-wrap gap-4 items-start">
                  {mediumSmallSponsors.map((sponsor) => {
                    const isSmall = (sponsor.displayStyle ?? "medium") === "small";

                    if (isSmall) {
                      const imageContent = sponsor.pfpUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sponsor.pfpUrl} alt={sponsor.name} className="h-12 w-12 rounded-full border border-[#1F1F1F] object-cover" />
                      ) : null;

                      return (
                        <div key={sponsor._id} className="flex flex-col items-center gap-1.5 group">
                          {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) && imageContent ? (
                            <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="block">
                              {imageContent}
                            </a>
                          ) : imageContent}
                          {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                            <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors">
                              {sponsor.name}
                              {sponsor.badgeText && (
                                <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                              )}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                              {sponsor.name}
                              {sponsor.badgeText && (
                                <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    }

                    const imageContent = sponsor.bannerUrl ? (
                      <div className="relative w-full sm:w-48 overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsor.bannerUrl} alt={`${sponsor.name} banner`} className="h-20 w-full object-cover" />
                        {sponsor.pfpUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sponsor.pfpUrl} alt={sponsor.name} className="absolute bottom-1 left-2 h-8 w-8 rounded-full border-2 border-[#0A0A0A] object-cover" />
                        )}
                      </div>
                    ) : sponsor.pfpUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sponsor.pfpUrl} alt={sponsor.name} className="h-16 w-16 rounded-full border border-[#1F1F1F] object-cover" />
                    ) : null;

                    return (
                      <div key={sponsor._id} className="flex w-full flex-col items-start gap-2 sm:w-48 sm:items-center group">
                        {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) && imageContent ? (
                          <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className={sponsor.bannerUrl ? "w-full block" : "block"}>
                            {imageContent}
                          </a>
                        ) : imageContent}
                        {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                          <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors">
                            {sponsor.name}
                            {sponsor.badgeText && (
                              <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                            )}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                            {sponsor.name}
                            {sponsor.badgeText && (
                              <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">{sponsor.badgeText}</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
