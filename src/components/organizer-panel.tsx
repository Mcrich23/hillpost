"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Shield,
  UserX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface OrganizerPanelProps {
  hackathonId: Id<"hackathons">;
  hackathon: {
    name: string;
    joinCode: string;
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
      <CategoriesSection hackathonId={hackathonId} />
      <MembersSection hackathonId={hackathonId} />
    </div>
  );
}

function HackathonInfoSection({
  hackathonId,
  hackathon,
}: OrganizerPanelProps) {
  const updateHackathon = useMutation(api.hackathons.update);
  const [copied, setCopied] = useState(false);

  const copyJoinCode = async () => {
    await navigator.clipboard.writeText(hackathon.joinCode);
    setCopied(true);
    toast.success("Join code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleActive = async () => {
    try {
      await updateHackathon({
        hackathonId,
        isActive: !hackathon.isActive,
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

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Hackathon Info
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-300">
            Join Code
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 font-mono text-lg tracking-widest text-emerald-400">
              {hackathon.joinCode}
            </code>
            <button
              onClick={copyJoinCode}
              className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
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

        <div className="text-sm text-gray-400">
          Submission cooldown: {hackathon.submissionFrequencyMinutes} minutes
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
    if (!newName || !newDescription) return;
    try {
      await createCategory({
        hackathonId,
        name: newName,
        description: newDescription,
        maxScore: newMaxScore,
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
    try {
      await updateCategory({
        categoryId,
        name: editName,
        description: editDescription,
        maxScore: editMaxScore,
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
    try {
      await removeCategory({ categoryId });
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

function MembersSection({
  hackathonId,
}: {
  hackathonId: Id<"hackathons">;
}) {
  const members = useQuery(api.members.listMembers, { hackathonId });
  const updateRole = useMutation(api.members.updateRole);
  const removeMember = useMutation(api.members.removeMember);

  const [changingRole, setChangingRole] = useState<Id<"hackathonMembers"> | null>(null);

  const handleRoleChange = async (
    memberId: Id<"hackathonMembers">,
    newRole: "organizer" | "judge" | "competitor"
  ) => {
    try {
      await updateRole({ memberId, role: newRole });
      toast.success("Role updated");
      setChangingRole(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleRemove = async (memberId: Id<"hackathonMembers">) => {
    try {
      await removeMember({ memberId });
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
          {members.map((member) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
