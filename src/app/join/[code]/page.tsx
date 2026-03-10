"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar,
  Loader2,
  LogIn,
  ArrowLeft,
  ArrowRight,
  Code,
  Gavel,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function JoinByLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const joinCode = params.code as string;

  const hackathon = useQuery(api.hackathons.getByJoinCode, { joinCode });
  const membership = useQuery(
    api.members.getMyMembership,
    hackathon?._id && user?.id
      ? { hackathonId: hackathon._id, userId: user.id }
      : "skip"
  );
  const joinHackathon = useMutation(api.hackathons.join);

  const [isJoining, setIsJoining] = useState(false);

  // Determine role based on which code matches
  const isCompetitorCode = hackathon?.competitorJoinCode === joinCode;
  const role = isCompetitorCode ? "competitor" : "judge";

  if (hackathon === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-gray-400">Looking up hackathon...</p>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-lg font-medium text-white">Invalid Join Link</p>
          <p className="mt-2 text-sm text-gray-400">
            This join link is not valid. Please check with the organizer for the
            correct link.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setIsJoining(true);
    try {
      const hackathonId = await joinHackathon({
        joinCode,
        userId: user.id,
        userName: user.fullName ?? user.username ?? "Unknown",
      });
      toast.success("Successfully joined the hackathon!");
      router.push(`/hackathon/${hackathonId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join hackathon";
      if (message.includes("Already a member")) {
        toast.info("You're already a member — redirecting...");
        router.push(`/hackathon/${hackathon._id}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Already a member — show a friendly message instead of the join form
  if (membership && hackathon) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              You&apos;re already in!
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              You&apos;re already a member of <span className="font-medium text-white">{hackathon.name}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/hackathon/${hackathon._id}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Go to Hackathon
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="text-center text-sm text-gray-400 hover:text-white"
            >
              Go to Dashboard instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8">
        <div className="mb-6 text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              isCompetitorCode
                ? "bg-emerald-600/20 text-emerald-400"
                : "bg-blue-600/20 text-blue-400"
            )}
          >
            {isCompetitorCode ? (
              <Code className="h-7 w-7" />
            ) : (
              <Gavel className="h-7 w-7" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            Join {hackathon.name}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {hackathon.description}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(hackathon.startDate), "MMM d, yyyy")} –{" "}
              {format(new Date(hackathon.endDate), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">You will join as:</span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                isCompetitorCode
                  ? "border-emerald-500/30 bg-emerald-600/20 text-emerald-400"
                  : "border-blue-500/30 bg-blue-600/20 text-blue-400"
              )}
            >
              {role}
            </span>
          </div>

          {!isCompetitorCode && (
            <p className="rounded-lg border border-blue-500/20 bg-blue-600/10 px-3 py-2 text-xs text-blue-300">
              Judge access requires organizer approval after joining.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Join Hackathon
              </>
            )}
          </button>
          <Link
            href="/dashboard"
            className="text-center text-sm text-gray-400 hover:text-white"
          >
            Go to Dashboard instead
          </Link>
        </div>
      </div>
    </div>
  );
}
