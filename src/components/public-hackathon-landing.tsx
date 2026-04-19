"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Clock, ExternalLink, UserPlus, Trophy } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/url";
import type { Id } from "../../convex/_generated/dataModel";

// ─── Structural prop types ────────────────────────────────────────────────────

type PublicHackathon = {
  _id: Id<"hackathons">;
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  isActive: boolean;
  isPublic?: boolean;
  openGraphImageUrl?: string;
  scoresVisible?: boolean;
};

type PublicCategory = {
  _id: Id<"categories">;
  name: string;
  description: string;
  maxScore: number;
};

type PublicSponsor = {
  _id: Id<"sponsors">;
  name: string;
  pfpUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  badgeText?: string;
  displayStyle?: "featured" | "large" | "medium" | "small";
};

type PublicJudge = {
  _id: Id<"hackathonMembers">;
  userName: string;
  userImageUrl?: string;
};

export interface PublicHackathonLandingProps {
  hackathon: PublicHackathon;
  hackathonId: Id<"hackathons">;
  categories: PublicCategory[] | undefined;
  sponsors: PublicSponsor[] | undefined;
  publicJudges: PublicJudge[] | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EventStatus = "live" | "upcoming" | "ended";

function getEventStatus(
  startDate: number,
  endDate: number,
  isActive: boolean,
  now: number
): EventStatus {
  if (!isActive || now > endDate) return "ended";
  if (now < startDate) return "upcoming";
  return "live";
}

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
        status === "live"
          ? "border-[#00FF41]/40 bg-[#00FF4110] text-[#00FF41]"
          : status === "upcoming"
          ? "border-[#00B4FF]/40 bg-[#00B4FF10] text-[#00B4FF]"
          : "border-[#555555]/40 text-[#555555]"
      )}
    >
      {status === "live" && (
        <span className="status-pulse h-1.5 w-1.5 bg-[#00FF41] inline-block" />
      )}
      {status === "live" ? "LIVE NOW" : status === "upcoming" ? "UPCOMING" : "ENDED"}
    </span>
  );
}

function JoinButton({
  hackathonId,
  size = "lg",
}: {
  hackathonId: Id<"hackathons">;
  size?: "sm" | "lg";
}) {
  return (
    <SignInButton
      mode="redirect"
      forceRedirectUrl={`/hackathon/${hackathonId}`}
    >
      <button
        className={cn(
          "inline-flex items-center gap-2 border border-[#00FF41] bg-[#00FF41] font-bold text-black uppercase tracking-wider transition-all hover:bg-white hover:border-white",
          size === "lg" ? "px-8 py-3 text-sm" : "px-4 py-2 text-xs"
        )}
      >
        <UserPlus className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {size === "lg" ? "[ REGISTER AS COMPETITOR → ]" : "JOIN AS COMPETITOR"}
      </button>
    </SignInButton>
  );
}

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mb-6 border border-[#1F1F1F] bg-[#0A0A0A] p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs text-[#555555] uppercase tracking-widest">
          ── {title}
        </span>
        <div className="h-px flex-1 bg-[#1F1F1F]" />
      </div>
      {children}
    </motion.div>
  );
}

// Wraps sponsor content in a link if a valid website URL is present.
function SponsorLink({
  sponsor,
  children,
}: {
  sponsor: PublicSponsor;
  children: React.ReactNode;
}) {
  if (sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl)) {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full block"
        aria-label={`${sponsor.name} website`}
      >
        {children}
      </a>
    );
  }
  return <>{children}</>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PublicHackathonLanding({
  hackathon,
  hackathonId,
  categories,
  sponsors,
  publicJudges,
}: PublicHackathonLandingProps) {
  const now = Date.now();
  const status = getEventStatus(
    hackathon.startDate,
    hackathon.endDate,
    hackathon.isActive,
    now
  );
  const daysUntilStart = Math.max(
    0,
    Math.ceil((hackathon.startDate - now) / (1000 * 60 * 60 * 24))
  );
  const daysLeft = Math.max(
    0,
    Math.ceil((hackathon.endDate - now) / (1000 * 60 * 60 * 24))
  );

  const featuredSponsors =
    sponsors?.filter((s) => (s.displayStyle ?? "medium") === "featured") ?? [];
  const largeSponsors =
    sponsors?.filter((s) => (s.displayStyle ?? "medium") === "large") ?? [];
  const mediumSponsors =
    sponsors?.filter((s) => (s.displayStyle ?? "medium") === "medium") ?? [];
  const smallSponsors =
    sponsors?.filter((s) => (s.displayStyle ?? "medium") === "small") ?? [];
  const hasSponsors = (sponsors?.length ?? 0) > 0;

  const totalPoints = categories?.reduce((sum, c) => sum + c.maxScore, 0) ?? 0;

  const statsItems = [
    {
      label:
        status === "upcoming"
          ? "STARTS IN"
          : status === "live"
          ? "DAYS LEFT"
          : "ENDED ON",
      value:
        status === "ended"
          ? format(new Date(hackathon.endDate), "MMM d")
          : status === "upcoming"
          ? `${daysUntilStart}d`
          : `${daysLeft}d`,
      color:
        status === "live"
          ? "#00FF41"
          : status === "upcoming"
          ? "#00B4FF"
          : "#555555",
    },
    {
      label: "REGISTRATION",
      value: status === "ended" ? "CLOSED" : "OPEN",
      color: status === "ended" ? "#555555" : "#00FF41",
    },
    {
      label: "CATEGORIES",
      value: (categories?.length ?? 0) > 0 ? String(categories!.length) : "—",
      color: "#FF6600",
    },
    {
      label: "JUDGES",
      value: (publicJudges?.length ?? 0) > 0 ? String(publicJudges!.length) : "—",
      color: "#00B4FF",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
        >
          ← HILLPOST
        </Link>
        <SignInButton mode="redirect" forceRedirectUrl={`/hackathon/${hackathonId}`}>
          <button className="text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors border border-[#1F1F1F] px-3 py-1.5 hover:border-white">
            SIGN IN
          </button>
        </SignInButton>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden border border-[#1F1F1F]"
      >
        {hackathon.openGraphImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hackathon.openGraphImageUrl}
              alt={hackathon.name}
              className="h-72 w-full object-cover sm:h-80 md:h-96"
            />
            {/* Dark gradient overlay so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
              <StatusBadge status={status} />
              <h1 className="mt-3 text-3xl font-bold text-white uppercase tracking-tight sm:text-4xl md:text-5xl leading-tight">
                {hackathon.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(hackathon.startDate), "MMM d")} —{" "}
                  {format(new Date(hackathon.endDate), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Public event
                </span>
              </div>
              {status !== "ended" && (
                <div className="mt-6">
                  <JoinButton hackathonId={hackathonId} size="lg" />
                </div>
              )}
            </div>
          </>
        ) : (
          /* No banner — dot-grid fallback with corner brackets */
          <div className="relative dot-grid px-6 py-14 sm:px-10 sm:py-20">
            <div className="pointer-events-none absolute inset-3 hidden sm:block">
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-[#1F1F1F]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#1F1F1F]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#1F1F1F]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-[#1F1F1F]" />
            </div>
            <div className="relative z-10">
              <StatusBadge status={status} />
              <h1 className="mt-4 text-3xl font-bold text-white uppercase tracking-tight sm:text-4xl md:text-5xl leading-tight">
                {hackathon.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#555555]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(hackathon.startDate), "MMM d, yyyy")} —{" "}
                  {format(new Date(hackathon.endDate), "MMM d, yyyy")}
                </span>
                <span className="tui-badge border-[#555555] text-[#555555]">
                  PUBLIC EVENT
                </span>
              </div>
              {status !== "ended" && (
                <div className="mt-6 flex flex-col items-start gap-2">
                  <JoinButton hackathonId={hackathonId} size="lg" />
                  <p className="text-[11px] text-[#333333] uppercase tracking-wider">
                    No invite code required · Sign in to register
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {statsItems.map(({ label, value, color }) => (
          <div
            key={label}
            className="border border-[#1F1F1F] bg-[#0A0A0A] p-4 text-center"
          >
            <div className="mb-1 text-[10px] text-[#555555] uppercase tracking-widest">
              ── {label} ──
            </div>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color }}
            >
              {value}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <Section title="ABOUT THIS HACKATHON" delay={0.14}>
        <p className="text-sm text-[#AAAAAA] leading-relaxed whitespace-pre-wrap">
          {hackathon.description}
        </p>
      </Section>

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <Section title="TIMELINE" delay={0.2}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              phase: "REGISTRATION",
              date: status !== "ended" ? "OPEN NOW" : "CLOSED",
              detail: "Public · No invite code",
              phaseStatus: status !== "ended" ? ("active" as const) : ("done" as const),
              color: "#00FF41",
            },
            {
              phase: "EVENT STARTS",
              date: format(new Date(hackathon.startDate), "MMM d, yyyy"),
              detail: format(new Date(hackathon.startDate), "EEEE"),
              phaseStatus: now >= hackathon.startDate ? ("done" as const) : ("future" as const),
              color: "#00B4FF",
            },
            {
              phase: "SUBMISSIONS CLOSE",
              date: format(new Date(hackathon.endDate), "MMM d, yyyy"),
              detail: format(new Date(hackathon.endDate), "EEEE"),
              phaseStatus: now >= hackathon.endDate ? ("done" as const) : ("future" as const),
              color: "#FF6600",
            },
          ].map(({ phase, date, detail, phaseStatus, color }) => (
            <div
              key={phase}
              className="flex items-start gap-3 border border-[#1F1F1F] bg-[#111111] p-4"
            >
              <div
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  phaseStatus === "active" && "status-pulse"
                )}
                style={{
                  backgroundColor:
                    phaseStatus === "future" ? "#333333" : color,
                }}
              />
              <div>
                <p className="text-[10px] text-[#555555] uppercase tracking-widest">
                  {phase}
                </p>
                <p className="mt-1 text-sm font-bold text-white uppercase">
                  {date}
                </p>
                <p className="text-[10px] text-[#333333] uppercase tracking-wider mt-0.5">
                  {detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Mid-page CTA ────────────────────────────────────────────────── */}
      {status !== "ended" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.26 }}
          className="mb-6 flex flex-col items-center gap-4 border border-[#00FF41]/20 bg-[#00FF4108] px-4 py-10 text-center"
        >
          <div className="flex items-center gap-2 text-xs text-[#00FF41] uppercase tracking-widest">
            <span className="status-pulse h-1.5 w-1.5 bg-[#00FF41] inline-block" />
            Registration is open
          </div>
          <JoinButton hackathonId={hackathonId} size="lg" />
          <p className="text-[11px] text-[#333333] uppercase tracking-wider">
            Public event · No invite code required · Sign in to compete
          </p>
        </motion.div>
      )}

      {/* ── Judging Criteria ────────────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <Section title="JUDGING CRITERIA" delay={0.32}>
          {totalPoints > 0 && (
            <p className="mb-4 text-xs text-[#555555] uppercase tracking-widest">
              {totalPoints} total points across {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="border border-[#1F1F1F] bg-[#111111] p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-white uppercase tracking-wide">
                    {cat.name}
                  </p>
                  <span className="shrink-0 tui-badge border-[#00FF41] text-[#00FF41]">
                    {cat.maxScore} PTS
                  </span>
                </div>
                <p className="text-xs text-[#555555] leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Leaderboard link (if scores are public) ─────────────────────── */}
      {hackathon.scoresVisible !== false && status !== "upcoming" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.36 }}
          className="mb-6"
        >
          <Link
            href={`/hackathon/${hackathonId}/leaderboard`}
            className="group flex items-center justify-between border border-[#1F1F1F] bg-[#0A0A0A] px-6 py-5 transition-colors hover:border-[#FF6600]"
          >
            <div className="flex items-center gap-4">
              <Trophy className="h-7 w-7 text-[#FF6600]" />
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#FF6600] transition-colors">
                  VIEW LEADERBOARD →
                </p>
                <p className="text-xs text-[#555555]">
                  See real-time rankings and scores
                </p>
              </div>
            </div>
            <span className="text-xs text-[#333333] uppercase tracking-wider group-hover:text-[#FF6600] transition-colors">
              PUBLIC
            </span>
          </Link>
        </motion.div>
      )}

      {/* ── Judges ──────────────────────────────────────────────────────── */}
      {publicJudges && publicJudges.length > 0 && (
        <Section title="JUDGES" delay={0.38}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publicJudges.map((judge) => (
              <div
                key={judge._id}
                className="flex items-center gap-3 border border-[#1F1F1F] bg-[#111111] p-4"
              >
                {judge.userImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={judge.userImageUrl}
                    alt={judge.userName}
                    className="h-10 w-10 shrink-0 rounded-full border border-[#1F1F1F] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1F1F1F] text-xs font-bold text-[#555555] uppercase">
                    {judge.userName[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wide leading-tight">
                    {judge.userName}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#555555] uppercase tracking-widest">
                    Judge
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Sponsors ────────────────────────────────────────────────────── */}
      {hasSponsors && sponsors && (
        <Section title="SPONSORS" delay={0.42}>
          {/* Featured sponsors — full-width rows */}
          {featuredSponsors.length > 0 && (
            <div className="mb-6 space-y-4">
              {featuredSponsors.map((sponsor) => {
                const imageContent = sponsor.bannerUrl ? (
                  <div className="relative w-full overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sponsor.bannerUrl}
                      alt={`${sponsor.name} banner`}
                      className="h-36 w-full object-cover"
                    />
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="absolute bottom-2 left-3 h-14 w-14 rounded-full border-2 border-[#0A0A0A] object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center h-36 border border-[#1F1F1F] bg-[#111111]">
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="h-20 w-20 rounded-full border border-[#1F1F1F] object-cover"
                      />
                    )}
                  </div>
                );
                return (
                  <div
                    key={sponsor._id}
                    className="group flex flex-col items-start gap-3 w-full"
                  >
                    <SponsorLink sponsor={sponsor}>{imageContent}</SponsorLink>
                    {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-base font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Large sponsors */}
          {largeSponsors.length > 0 && (
            <div className="flex flex-wrap gap-4 items-start mb-4">
              {largeSponsors.map((sponsor) => {
                const imageContent = sponsor.bannerUrl ? (
                  <div className="relative w-full overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sponsor.bannerUrl}
                      alt={`${sponsor.name} banner`}
                      className="h-28 w-full object-cover"
                    />
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="absolute bottom-2 left-2 h-12 w-12 rounded-full border-2 border-[#0A0A0A] object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center h-28 border border-[#1F1F1F] bg-[#111111]">
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="h-16 w-16 rounded-full border border-[#1F1F1F] object-cover"
                      />
                    )}
                  </div>
                );
                return (
                  <div
                    key={sponsor._id}
                    className="group flex w-72 max-w-full min-w-0 flex-col items-start gap-2 overflow-hidden"
                  >
                    <SponsorLink sponsor={sponsor}>{imageContent}</SponsorLink>
                    {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1">
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Medium sponsors */}
          {mediumSponsors.length > 0 && (
            <div className="flex flex-wrap gap-4 items-start mb-4">
              {mediumSponsors.map((sponsor) => {
                const imageContent = sponsor.bannerUrl ? (
                  <div className="relative w-full overflow-hidden border border-[#1F1F1F] bg-[#111111]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sponsor.bannerUrl}
                      alt={`${sponsor.name} banner`}
                      className="h-20 w-full object-cover"
                    />
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="absolute bottom-1 left-2 h-8 w-8 rounded-full border-2 border-[#0A0A0A] object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center h-20 border border-[#1F1F1F] bg-[#111111]">
                    {sponsor.pfpUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="h-12 w-12 rounded-full border border-[#1F1F1F] object-cover"
                      />
                    )}
                  </div>
                );
                return (
                  <div
                    key={sponsor._id}
                    className="group flex w-48 max-w-full min-w-0 flex-col items-start gap-2 overflow-hidden"
                  >
                    <SponsorLink sponsor={sponsor}>{imageContent}</SponsorLink>
                    {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                        {sponsor.name}
                        {sponsor.badgeText && (
                          <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                            {sponsor.badgeText}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Small sponsors */}
          {smallSponsors.length > 0 && (
            <div className="flex flex-wrap gap-4 items-start">
              {smallSponsors.map((sponsor) => (
                <div
                  key={sponsor._id}
                  className="group flex flex-col items-start gap-1.5"
                >
                  {sponsor.pfpUrl &&
                    (sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sponsor.pfpUrl}
                          alt={sponsor.name}
                          className="h-12 w-12 rounded-full border border-[#1F1F1F] object-cover"
                        />
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.pfpUrl}
                        alt={sponsor.name}
                        className="h-12 w-12 rounded-full border border-[#1F1F1F] object-cover"
                      />
                    ))}
                  {sponsor.websiteUrl && isSafeHttpUrl(sponsor.websiteUrl) ? (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00B4FF] transition-colors"
                    >
                      {sponsor.name}
                      {sponsor.badgeText && (
                        <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                          {sponsor.badgeText}
                        </span>
                      )}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                      {sponsor.name}
                      {sponsor.badgeText && (
                        <span className="tui-badge border-[#00B4FF] text-[#00B4FF]">
                          {sponsor.badgeText}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.46 }}
        className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center sm:p-12"
      >
        <div className="pointer-events-none mb-2 text-[10px] text-[#333333] uppercase tracking-widest">
          ~/hillpost/events
        </div>
        <h2 className="mb-1 text-2xl font-bold text-white uppercase tracking-wide sm:text-3xl">
          {hackathon.name}
        </h2>
        <p className="mb-4 text-xs text-[#555555] uppercase tracking-widest">
          {format(new Date(hackathon.startDate), "MMMM d, yyyy")} —{" "}
          {format(new Date(hackathon.endDate), "MMMM d, yyyy")}
        </p>
        <div className="mb-6 flex items-center justify-center gap-2">
          <StatusBadge status={status} />
          <span className="tui-badge border-[#555555] text-[#555555]">
            PUBLIC EVENT
          </span>
        </div>
        {status !== "ended" ? (
          <>
            <JoinButton hackathonId={hackathonId} size="lg" />
            <p className="mt-3 text-[11px] text-[#333333] uppercase tracking-wider">
              Public event · No invite code required · Sign in to register as a
              competitor
            </p>
          </>
        ) : (
          <p className="text-sm text-[#555555] uppercase tracking-wider">
            This event has ended.
          </p>
        )}
      </motion.div>
    </div>
  );
}
