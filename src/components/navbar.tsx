"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { Crown, LayoutDashboard, Trophy, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const isAuthenticated = !!isSignedIn;
  const isLoading = !isLoaded;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Crown className="h-7 w-7 text-emerald-500" />
          <span className="text-lg font-bold text-white">
            Hillpost
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </>
          )}
        </div>

        {/* Auth Section */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-800" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {user.firstName || user.username}
              </span>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="rounded-lg px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-gray-800 transition-all duration-300 md:hidden",
          mobileMenuOpen ? "max-h-64" : "max-h-0 border-t-0"
        )}
      >
        <div className="space-y-1 px-4 py-3">
          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Link>
            </>
          )}
          {!isAuthenticated && !isLoading && (
            <div className="flex flex-col gap-2 pt-2">
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="w-full rounded-lg px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          )}
          {isAuthenticated && user && (
            <div className="flex items-center gap-3 border-t border-gray-800 pt-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
              <span className="text-sm text-gray-400">
                {user.firstName || user.username}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
