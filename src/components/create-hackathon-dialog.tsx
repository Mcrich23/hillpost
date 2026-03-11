"use client";

import { useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { X } from "lucide-react";

interface CreateHackathonDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateHackathonDialog({ isOpen, onClose }: CreateHackathonDialogProps) {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const createHackathon = useMutation(api.hackathons.create);

  const today = new Date().toISOString().split("T")[0];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [submissionFrequency, setSubmissionFrequency] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Please sign in first");
      return;
    }
    setIsSubmitting(true);
    try {
      const hackathonId = await createHackathon({
        name,
        description,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        submissionFrequencyMinutes: submissionFrequency,
        userImageUrl: user?.imageUrl,
      });
      toast.success("Hackathon created successfully!");
      setName(""); setDescription(""); setStartDate(today); setEndDate(today); setSubmissionFrequency(60);
      onClose();
      router.push(`/hackathon/${hackathonId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create hackathon");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg border border-[#1F1F1F] bg-black p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-[#1F1F1F] pb-4">
          <div>
            <div className="text-xs text-[#555555] uppercase tracking-widest mb-1">── NEW EVENT</div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">CREATE HACKATHON</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#555555] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#555555] uppercase tracking-widest">
              NAME: <span className="text-[#FF6600]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Hackathon"
              className="tui-input"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#555555] uppercase tracking-widest">
              DESCRIPTION: <span className="text-[#FF6600]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your hackathon..."
              rows={3}
              className="tui-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#555555] uppercase tracking-widest">
                START DATE: <span className="text-[#FF6600]">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="tui-input"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#555555] uppercase tracking-widest">
                END DATE: <span className="text-[#FF6600]">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="tui-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#555555] uppercase tracking-widest">
              SUBMISSION COOLDOWN (MINUTES):
            </label>
            <input
              type="number"
              value={submissionFrequency}
              onChange={(e) => setSubmissionFrequency(Number(e.target.value))}
              min={1}
              className="tui-input"
            />
            <p className="mt-1 text-xs text-[#333333]">
              Minimum time between submissions per team
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#1F1F1F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#555555] border border-[#1F1F1F] uppercase tracking-wider hover:border-white hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isAuthenticated}
              className="px-4 py-2 text-xs font-bold text-black bg-[#FF6600] uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "CREATING..." : "[ CREATE HACKATHON ]"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
