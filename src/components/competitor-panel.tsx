"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Users,
  Plus,
  LogOut,
  Send,
  Clock,
  ExternalLink,
} from "lucide-react";

interface CompetitorPanelProps {
  hackathonId: Id<"hackathons">;
  hackathon: {
    submissionFrequencyMinutes: number;
  };
}

export function CompetitorPanel({
  hackathonId,
  hackathon,
}: CompetitorPanelProps) {
  return (
    <div className="space-y-6">
      <TeamSection hackathonId={hackathonId} />
      <SubmitSection hackathonId={hackathonId} hackathon={hackathon} />
    </div>
  );
}

function TeamSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const { user } = useUser();
  const myTeam = useQuery(api.teams.getMyTeam, { hackathonId });
  const teams = useQuery(api.teams.list, { hackathonId });
  const createTeam = useMutation(api.teams.create);
  const joinTeam = useMutation(api.teams.joinTeam);
  const leaveTeam = useMutation(api.teams.leaveTeam);

  const [teamName, setTeamName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !user?.id) return;
    try {
      await createTeam({ hackathonId, name: teamName.trim() });
      toast.success("Team created!");
      setTeamName("");
      setShowCreateForm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create team"
      );
    }
  };

  const handleJoinTeam = async (teamId: Id<"teams">) => {
    if (!user?.id) return;
    try {
      await joinTeam({ teamId });
      toast.success("Joined team!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join team"
      );
    }
  };

  const handleLeaveTeam = async () => {
    if (!user?.id) return;
    try {
      await leaveTeam({ hackathonId });
      toast.success("Left team");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave team"
      );
    }
  };

  if (myTeam === undefined) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <p className="text-sm text-gray-500">Loading team info...</p>
      </div>
    );
  }

  if (myTeam) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            <Users className="mr-2 inline h-5 w-5 text-emerald-400" />
            My Team: {myTeam.name}
          </h3>
          <button
            onClick={handleLeaveTeam}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
          >
            <LogOut className="h-4 w-4" />
            Leave
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-300">Members:</p>
          {myTeam.members.map((m) => (
            <p key={m._id} className="text-sm text-gray-400">
              • {m.userName}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">
        <Users className="mr-2 inline h-5 w-5 text-emerald-400" />
        Join or Create a Team
      </h3>

      <div className="mb-4">
        {showCreateForm ? (
          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Create New Team
          </button>
        )}
      </div>

      {teams && teams.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-300">
            Or join an existing team:
          </p>
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team._id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              >
                <div>
                  <p className="text-white">{team.name}</p>
                  <p className="text-xs text-gray-500">
                    {team.members.length} member(s)
                  </p>
                </div>
                <button
                  onClick={() => handleJoinTeam(team._id)}
                  className="rounded-lg bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitSection({
  hackathonId,
  hackathon,
}: CompetitorPanelProps) {
  const { user } = useUser();
  const myTeam = useQuery(api.teams.getMyTeam, { hackathonId });
  const latestSubmission = useQuery(
    api.submissions.getLatestForTeam,
    myTeam ? { hackathonId, teamId: myTeam._id } : "skip"
  );
  const createSubmission = useMutation(api.submissions.create);
  const updateDetails = useMutation(api.submissions.updateDetails);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Pre-fill form if they already have a submission
  useEffect(() => {
    if (latestSubmission) {
      setName(latestSubmission.name);
      setDescription(latestSubmission.description);
      setProjectUrl(latestSubmission.projectUrl);
      setDemoUrl(latestSubmission.demoUrl || "");
    }
  }, [latestSubmission]);

  useEffect(() => {
    if (!latestSubmission || !hackathon.submissionFrequencyMinutes) return;

    const cooldownMs = hackathon.submissionFrequencyMinutes * 60 * 1000;
    const updateCooldown = () => {
      const elapsed = Date.now() - latestSubmission.submittedAt;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCooldownRemaining(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [latestSubmission, hackathon.submissionFrequencyMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !user?.id) return;

    setIsSubmitting(true);
    try {
      await createSubmission({
        hackathonId,
        teamId: myTeam._id,
        name,
        description,
        projectUrl,
        demoUrl: demoUrl || undefined,
      });
      toast.success(latestSubmission ? "Project resubmitted!" : "Submission created!");
      // Don't clear fields on resubmit since they'll just look at them
      if (!latestSubmission) {
        setName("");
        setDescription("");
        setProjectUrl("");
        setDemoUrl("");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !user?.id || !latestSubmission) return;

    setIsUpdating(true);
    try {
      await updateDetails({
        submissionId: latestSubmission._id,
        name,
        description,
        projectUrl,
        demoUrl: demoUrl || undefined,
      });
      toast.success("Project details saved!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update details"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const isOnCooldown = cooldownRemaining > 0;
  const totalSeconds = Math.ceil(cooldownRemaining / 1000);
  const cooldownMinutes = Math.floor(totalSeconds / 60);
  const cooldownSeconds = totalSeconds % 60;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">
        <Send className="mr-2 inline h-5 w-5 text-emerald-400" />
        {latestSubmission ? "Project Details" : "Submit Project"}
      </h3>

      {!myTeam ? (
        <p className="text-sm text-gray-500">
          Join a team before submitting a project.
        </p>
      ) : (
        <>
          <form
            onSubmit={latestSubmission ? handleUpdateDetails : handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Cool Project"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your project do?"
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Project URL
              </label>
              <input
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Demo URL <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://my-demo.vercel.app"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {latestSubmission ? (
              <div className="flex items-center gap-3 border-t border-gray-800 pt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Details"}
                </button>
                <p className="text-xs text-gray-400">
                  Saving details does not alert judges or trigger rate limits.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || isOnCooldown}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Project"}
              </button>
            )}
          </form>

          {latestSubmission && (
            <div className="mt-8 rounded-xl border border-blue-900 bg-blue-950/20 p-5">
              <div className="mb-3 flex flex-col gap-1">
                <h4 className="flex items-center gap-2 text-base font-semibold text-blue-400">
                  <ExternalLink className="h-4 w-4" />
                  Judging Resubmission
                </h4>
                <p className="text-sm text-gray-400">
                  Made significant changes to your project code? Request a new evaluation
                  from the judges. This will reset the judging queue.
                </p>
              </div>
              {isOnCooldown && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-600/10 px-3 py-2 text-sm text-yellow-400">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  Cooldown active: {cooldownMinutes > 0
                    ? `${cooldownMinutes}m ${cooldownSeconds}s`
                    : `${cooldownSeconds}s`}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isOnCooldown}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Resubmitting..." : "Resubmit for Judging"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

