"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus,
  LogIn,
  Calendar,
  Sparkles,
} from "lucide-react";
import { CreateHackathonDialog } from "@/components/create-hackathon-dialog";
import { JoinHackathonDialog } from "@/components/join-hackathon-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const hackathons = useQuery(api.hackathons.listMine);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case "organizer":
        return "bg-purple-600/20 text-purple-400 border-purple-500/30";
      case "judge":
        return "bg-blue-600/20 text-blue-400 border-blue-500/30";
      case "competitor":
        return "bg-emerald-600/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="mt-1 text-gray-400">
          Manage your hackathons and competitions
        </p>
      </div>

      {/* Action buttons */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-emerald-500/50 hover:bg-gray-900/80"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white">Create Hackathon</p>
            <p className="text-sm text-gray-400">
              Organize a new competition
            </p>
          </div>
        </button>

        <button
          onClick={() => setShowJoinDialog(true)}
          className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-emerald-500/50 hover:bg-gray-900/80"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600/30">
            <LogIn className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white">Join Hackathon</p>
            <p className="text-sm text-gray-400">
              Enter with a join code
            </p>
          </div>
        </button>
      </div>

      {/* My Hackathons */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">
          My Hackathons
        </h2>

        {hackathons === undefined ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-gray-800 bg-gray-900"
              />
            ))}
          </div>
        ) : (() => {
          const validHackathons = hackathons.filter(
            (h): h is NonNullable<typeof h> => h !== null
          );
          return validHackathons.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
            <Sparkles className="mb-4 h-16 w-16 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-400">
              No hackathons yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create or join a hackathon to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {validHackathons.map((h) => (
              <button
                key={h._id}
                onClick={() => router.push(`/hackathon/${h._id}`)}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-5 text-left transition-colors hover:border-emerald-500/50"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white group-hover:text-emerald-400">
                    {h.name}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                      roleBadgeClass(h.myRole)
                    )}
                  >
                    {h.myRole}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(h.startDate), "MMM d")} –{" "}
                    {format(new Date(h.endDate), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {h.isActive ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-gray-600/20 px-2 py-0.5 text-xs text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      Inactive
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        );
        })()}
      </div>

      <CreateHackathonDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
      <JoinHackathonDialog
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
      />
    </div>
  );
}
