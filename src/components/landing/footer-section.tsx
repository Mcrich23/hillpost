import { Crown } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Crown className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium">Hillpost</span>
        </div>
        <p className="text-sm text-gray-500">
          Built for hackathons. Powered by real-time collaboration.
        </p>
      </div>
    </footer>
  );
}
