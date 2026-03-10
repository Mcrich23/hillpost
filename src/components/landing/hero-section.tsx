"use client";

import Link from "next/link";
import { SignUpButton, useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { ArrowRight, ChevronDown } from "lucide-react";

export function HeroSection() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-600/20 blur-[120px]" />
        <div className="absolute -bottom-20 left-1/4 h-[300px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute right-1/4 top-1/3 h-[250px] w-[350px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live Hackathon Judging Platform
        </div>

        {/* Title */}
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
          Hacker of the Hill{" "}
          <span className="inline-block animate-bounce" role="img" aria-label="crown">👑</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          The ultimate{" "}
          <span className="font-semibold text-emerald-400">
            king-of-the-hill
          </span>{" "}
          style hackathon judging platform. Teams compete, judges score in
          real-time, and the leaderboard updates live. May the best hackers
          reign supreme.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {isAuthenticated && user ? (
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="group flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </SignUpButton>
          )}
          <Link
            href="#features"
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-8 py-3.5 text-base font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700/50 hover:text-white"
          >
            Learn More
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-6 w-6 text-gray-500" />
      </div>
    </section>
  );
}
