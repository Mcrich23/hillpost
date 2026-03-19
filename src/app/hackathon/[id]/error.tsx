"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function HackathonError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error("Hackathon error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
        <p className="text-sm text-white uppercase tracking-wide">404 — Page Not Found</p>
        <p className="mt-2 text-xs text-[#555555]">
          The requested section could not be found or you do not have permission or you do not have permission to access it.
        </p>
        <button
          onClick={() => {
            window.location.href = window.location.pathname;
          }}
          className="mt-4 inline-flex items-center gap-2 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Overview
        </button>
      </div>
    </div>
  );
}
