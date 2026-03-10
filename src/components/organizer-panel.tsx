"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Shield,
  UserX,
  ChevronUp,
  Link as LinkIcon,
} from "lucide-react";
import { QrCodeButton } from "@/components/qr-code-overlay";

interface OrganizerPanelProps {
  hackathonId: Id<"hackathons">;
  hackathon: {
    name: string;
    description: string;
    competitorJoinCode: string;
    judgeJoinCode: string;
    startDate: number;
    endDate: number;
    isActive: boolean;
    submissionFrequencyMinutes: number;
  };
}

export function OrganizerPanel({
  hackathonId,
  hackathon,
}: OrganizerPanelProps) {
  return (
    <div className="space-y-6">
      <HackathonInfoSection hackathonId={hackathonId} hackathon={hackathon} />
      <PendingApprovalsSection hackathonId={hackathonId} />
      <CategoriesSection hackathonId={hackathonId} />
      <TeamsAndProjectsSection hackathonId={hackathonId} />
      <MembersSection hackathonId={hackathonId} />
    </div>
  );
}

function HackathonInfoSection({
  hackathonId,
  hackathon,
}: OrganizerPanelProps) {
  const updateHackathon = useMutation(api.hackathons.update);
  const { user } = useUser();
  const [copiedCompetitor, setCopiedCompetitor] = useState(false);
  const [copiedJudge, setCopiedJudge] = useState(false);
  const [copiedCompetitorLink, setCopiedCompetitorLink] = useState(false);
  const [copiedJudgeLink, setCopiedJudgeLink] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(hackathon.name);
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newDesc, setNewDesc] = useState(hackathon.description);
  
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState(
    format(new Date(hackathon.startDate), "yyyy-MM-dd")
  );
  const [newEndDate, setNewEndDate] = useState(
    format(new Date(hackathon.endDate), "yyyy-MM-dd")
  );

  const [isEditingCooldown, setIsEditingCooldown] = useState(false);
  const [newCooldown, setNewCooldown] = useState(hackathon.submissionFrequencyMinutes);

  const copyCompetitorCode = async () => {
    await navigator.clipboard.writeText(hackathon.competitorJoinCode);
    setCopiedCompetitor(true);
    toast.success("Competitor code copied!");
    setTimeout(() => setCopiedCompetitor(false), 2000);
  };

  const copyJudgeCode = async () => {
    await navigator.clipboard.writeText(hackathon.judgeJoinCode);
    setCopiedJudge(true);
    toast.success("Judge code copied!");
    setTimeout(() => setCopiedJudge(false), 2000);
  };

  const copyCompetitorLink = async () => {
    try {
      const link = `${window.location.origin}/join/${hackathon.competitorJoinCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedCompetitorLink(true);
      toast.success("Competitor join link copied!");
      setTimeout(() => setCopiedCompetitorLink(false), 2000);
    } catch (error) {
      console.error("Failed to copy competitor link to clipboard:", error);
      toast.error("Failed to copy link. Please try again.");
    }
  };

  const copyJudgeLink = async () => {
    try {
      const link = `${window.location.origin}/join/${hackathon.judgeJoinCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedJudgeLink(true);
      toast.success("Judge join link copied!");
      setTimeout(() => setCopiedJudgeLink(false), 2000);
    } catch (error) {
      console.error("Failed to copy judge link to clipboard:", error);
      toast.error("Failed to copy link. Please try again.");
    }
  };

  const toggleActive = async () => {
    if (!user?.id) return;
    try {
      await updateHackathon({
        hackathonId,
        isActive: !hackathon.isActive,
        userId: user.id,
      });
      toast.success(
        hackathon.isActive ? "Hackathon deactivated" : "Hackathon activated"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update"
      );
    }
  };

  const saveCooldown = async () => {
    if (!user?.id || newCooldown < 0) return;
    try {
      await updateHackathon({
        hackathonId,
        submissionFrequencyMinutes: newCooldown,
        userId: user.id,
      });
      toast.success("Cooldown updated");
      setIsEditingCooldown(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update cooldown"
      );
    }
  };

  const saveName = async () => {
    if (!user?.id || !newName.trim()) return;
    try {
      await updateHackathon({
        hackathonId,
        name: newName.trim(),
        userId: user.id,
      });
      toast.success("Name updated");
      setIsEditingName(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update name"
      );
    }
  };

  const saveDesc = async () => {
    if (!user?.id || !newDesc.trim()) return;
    try {
      await updateHackathon({
        hackathonId,
        description: newDesc.trim(),
        userId: user.id,
      });
      toast.success("Description updated");
      setIsEditingDesc(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update description"
      );
    }
  };

  const saveDates = async () => {
    if (!user?.id || !newStartDate || !newEndDate) return;
    const start = new Date(newStartDate).getTime();
    const end = new Date(newEndDate).getTime();
    
    if (end <= start) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      await updateHackathon({
        hackathonId,
        startDate: start,
        endDate: end,
        userId: user.id,
      });
      toast.success("Dates updated");
      setIsEditingDates(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update dates"
      );
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Hackathon Info
      </h3>
      <div className="space-y-6">
        
        {/* Name Edit */}
        <div>
          <label className="text-sm font-medium text-gray-300">Name</label>
          {isEditingName ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={saveName}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-3">
              <span className="text-base text-white">{hackathon.name}</span>
              <button
                onClick={() => setIsEditingName(true)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Description Edit */}
        <div>
          <label className="text-sm font-medium text-gray-300">Description</label>
          {isEditingDesc ? (
            <div className="mt-1 flex items-end gap-2">
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={saveDesc}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-start gap-3">
              <span className="text-sm text-gray-400 flex-1">{hackathon.description}</span>
              <button
                onClick={() => setIsEditingDesc(true)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dates Edit */}
        <div className="border-t border-gray-800 pt-4">
          <label className="text-sm font-medium text-gray-300">Hackathon Dates</label>
          {isEditingDates ? (
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none block w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">End Date</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none block w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveDates}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingDates(false)}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm text-white">
                {format(new Date(hackathon.startDate), "MMM d, yyyy")} –{" "}
                {format(new Date(hackathon.endDate), "MMM d, yyyy")}
              </span>
              <button
                onClick={() => {
                  setNewStartDate(format(new Date(hackathon.startDate), "yyyy-MM-dd"));
                  setNewEndDate(format(new Date(hackathon.endDate), "yyyy-MM-dd"));
                  setIsEditingDates(true);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row border-t border-gray-800 pt-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-300">
              Competitor Join Code
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-lg tracking-widest text-emerald-400">
                {hackathon.competitorJoinCode}
              </code>
              <button
                onClick={copyCompetitorCode}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Copy code"
              >
                {copiedCompetitor ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={copyCompetitorLink}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Copy join link"
              >
                {copiedCompetitorLink ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </button>
              <QrCodeButton
                path={`/join/${hackathon.competitorJoinCode}`}
                label="Competitor Join QR"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-300">
              Judge Join Code
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-lg tracking-widest text-blue-400 border-blue-500/30">
                {hackathon.judgeJoinCode}
              </code>
              <button
                onClick={copyJudgeCode}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Copy code"
              >
                {copiedJudge ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={copyJudgeLink}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                title="Copy join link"
              >
                {copiedJudgeLink ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </button>
              <QrCodeButton
                path={`/join/${hackathon.judgeJoinCode}`}
                label="Judge Join QR"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">Status</label>
            <p className="text-sm text-gray-500">
              {hackathon.isActive
                ? "Hackathon is currently active"
                : "Hackathon is inactive"}
            </p>
          </div>
          <button
            onClick={toggleActive}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white",
              hackathon.isActive
                ? "bg-red-600 hover:bg-red-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            )}
          >
            {hackathon.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Submission Cooldown</label>
            <p className="text-xs text-gray-500">
              Time (in minutes) competitors must wait before resubmitting.
            </p>
          </div>
          {isEditingCooldown ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={newCooldown}
                onChange={(e) => setNewCooldown(Number(e.target.value))}
                className="w-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={saveCooldown}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingCooldown(false)}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white">{hackathon.submissionFrequencyMinutes} minutes</span>
              <button
                onClick={() => {
                  setNewCooldown(hackathon.submissionFrequencyMinutes);
                  setIsEditingCooldown(true);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const categories = useQuery(api.categories.list, { hackathonId });
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);
  const { user } = useUser();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMaxScore, setNewMaxScore] = useState(10);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMaxScore, setEditMaxScore] = useState(10);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDescription || !user?.id) return;
    try {
      await createCategory({
        hackathonId,
        name: newName,
        description: newDescription,
        maxScore: newMaxScore,
        userId: user.id,
      });
      toast.success("Category added");
      setNewName("");
      setNewDescription("");
      setNewMaxScore(10);
      setShowAddForm(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add category"
      );
    }
  };

  const handleEdit = async (categoryId: Id<"categories">) => {
    if (!user?.id) return;
    try {
      await updateCategory({
        categoryId,
        name: editName,
        description: editDescription,
        maxScore: editMaxScore,
        userId: user.id,
      });
      toast.success("Category updated");
      setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update category"
      );
    }
  };

  const handleRemove = async (categoryId: Id<"categories">) => {
    if (!user?.id) return;
    try {
      await removeCategory({ categoryId, userId: user.id });
      toast.success("Category removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove category"
      );
    }
  };

  const startEditing = (cat: {
    _id: Id<"categories">;
    name: string;
    description: string;
    maxScore: number;
  }) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditDescription(cat.description);
    setEditMaxScore(cat.maxScore);
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Judging Categories
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
        >
          {showAddForm ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showAddForm ? "Cancel" : "Add"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            required
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            required
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Max Score:</label>
            <input
              type="number"
              value={newMaxScore}
              onChange={(e) => setNewMaxScore(Number(e.target.value))}
              min={1}
              className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
          >
            Add Category
          </button>
        </form>
      )}

      {!categories ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          No categories yet. Add one to start judging.
        </p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="rounded-lg border border-gray-700 bg-gray-800 p-3"
            >
              {editingId === cat._id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Max:</label>
                    <input
                      type="number"
                      value={editMaxScore}
                      onChange={(e) => setEditMaxScore(Number(e.target.value))}
                      min={1}
                      className="w-24 rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(cat._id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{cat.name}</p>
                    <p className="text-sm text-gray-400">{cat.description}</p>
                    <p className="text-xs text-gray-500">
                      Max score: {cat.maxScore}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(cat)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(cat._id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingApprovalsSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const members = useQuery(api.members.listMembers, { hackathonId });
  const updateStatus = useMutation(api.members.updateStatus);
  const { user } = useUser();

  const handleStatusChange = async (
    memberId: Id<"hackathonMembers">,
    newStatus: "approved" | "rejected"
  ) => {
    if (!user?.id) return;
    try {
      await updateStatus({ memberId, status: newStatus, userId: user.id });
      toast.success(`Judge ${newStatus}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  const pendingMembers = members?.filter((m) => m.status === "pending") ?? [];

  if (!members || pendingMembers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          Pending Approvals
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {pendingMembers.length}
          </span>
        </h3>
      </div>
      <div className="space-y-2">
        {pendingMembers.map((member) => (
          <div
            key={member._id}
            className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-gray-900 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-white">{member.userName}</span>
              <span className="rounded-full border border-blue-500/30 bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                {member.role}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(member._id, "approved")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange(member._id, "rejected")}
                className="rounded-lg bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-600/30"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const members = useQuery(api.members.listMembers, { hackathonId });
  const updateRole = useMutation(api.members.updateRole);
  const updateStatus = useMutation(api.members.updateStatus);
  const removeMember = useMutation(api.members.removeMember);
  const { user } = useUser();

  const [changingRole, setChangingRole] = useState<Id<"hackathonMembers"> | null>(null);

  const handleRoleChange = async (
    memberId: Id<"hackathonMembers">,
    newRole: "organizer" | "judge" | "competitor"
  ) => {
    if (!user?.id) return;
    try {
      await updateRole({ memberId, role: newRole, userId: user.id });
      toast.success("Role updated");
      setChangingRole(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleStatusChange = async (
    memberId: Id<"hackathonMembers">,
    newStatus: "approved" | "rejected"
  ) => {
    if (!user?.id) return;
    try {
      await updateStatus({ memberId, status: newStatus, userId: user.id });
      toast.success(`Judge ${newStatus}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  const handleRemove = async (memberId: Id<"hackathonMembers">) => {
    if (!user?.id) return;
    try {
      await removeMember({ memberId, userId: user.id });
      toast.success("Member removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

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
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Members</h3>
      {!members ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            if (member.status === "pending") return null;
            return (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white">{member.userName}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium",
                      roleBadgeClass(member.role)
                    )}
                  >
                    {member.role}
                  </span>
                  {member.status === "rejected" && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-500">
                      rejected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {changingRole === member._id ? (
                    <div className="flex gap-1">
                      {(["organizer", "judge", "competitor"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => handleRoleChange(member._id, r)}
                          className={cn(
                            "rounded px-2 py-1 text-xs",
                            member.role === r
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                      <button
                        onClick={() => setChangingRole(null)}
                        className="ml-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setChangingRole(member._id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                        title="Change role"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(member._id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                        title="Remove member"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamsAndProjectsSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const teams = useQuery(api.teams.list, { hackathonId });
  const updateTeamName = useMutation(api.teams.updateTeamName);
  const { user } = useUser();

  const [editingTeamId, setEditingTeamId] = useState<Id<"teams"> | null>(null);
  const [editTeamName, setEditTeamName] = useState("");

  const startEditingTeam = (team: any) => {
    setEditingTeamId(team._id);
    setEditTeamName(team.name);
  };

  const handleSaveTeamName = async (teamId: Id<"teams">) => {
    if (!user?.id || !editTeamName.trim()) return;
    try {
      await updateTeamName({ teamId, name: editTeamName, userId: user.id });
      toast.success("Team name updated");
      setEditingTeamId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update team");
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Teams</h3>
      {!teams ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-gray-500">No teams have joined yet.</p>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            return (
              <div
                key={team._id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                {/* Team Name Section */}
                {editingTeamId === team._id ? (
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      placeholder="Team Name"
                    />
                    <button
                      onClick={() => handleSaveTeamName(team._id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTeamId(null)}
                      className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-base font-medium text-white">
                      Team: {team.name}
                    </h4>
                    <button
                      onClick={() => startEditingTeam(team)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Team Members List */}
                <div className="flex flex-wrap gap-2">
                  {team.members?.map((m: any) => (
                    <span
                      key={m._id}
                      className="rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs text-gray-300"
                    >
                      {m.userName}
                    </span>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <span className="text-xs text-gray-500">No members</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
