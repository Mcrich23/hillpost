"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinHackathonDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinHackathonDialog({
  isOpen,
  onClose,
}: JoinHackathonDialogProps) {
  const router = useRouter();
  const joinHackathon = useMutation(api.hackathons.join);

  const [joinCode, setJoinCode] = useState("");
  const [role, setRole] = useState<"judge" | "competitor">("competitor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }

    setIsSubmitting(true);
    try {
      const hackathonId = await joinHackathon({
        joinCode: joinCode.trim(),
        role,
      });
      toast.success("Successfully joined the hackathon!");
      setJoinCode("");
      setRole("competitor");
      onClose();
      router.push(`/hackathon/${hackathonId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join hackathon"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Join Hackathon</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.slice(0, 6))}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Join as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("competitor")}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  role === "competitor"
                    ? "border-emerald-500 bg-emerald-600/20 text-emerald-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                )}
              >
                🏗️ Competitor
                <p className="mt-1 text-xs text-gray-500">
                  Build & submit projects
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole("judge")}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  role === "judge"
                    ? "border-emerald-500 bg-emerald-600/20 text-emerald-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                )}
              >
                ⚖️ Judge
                <p className="mt-1 text-xs text-gray-500">
                  Score submissions
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || joinCode.length < 1}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? "Joining..." : "Join Hackathon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
