"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ArrowRight } from "lucide-react";

export default function DiscoverPage() {
  const publicHackathons = useQuery(api.hackathons.listPublic);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 border-b border-[#1F1F1F] pb-6">
        <div className="text-xs text-[#555555] uppercase tracking-widest mb-1">~/discover</div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-wide">PUBLIC HACKATHONS</h1>
        <p className="mt-1 text-xs text-[#555555] uppercase tracking-wider">
          Browse public events and join instantly
        </p>
      </div>

      {publicHackathons === undefined ? (
        <div className="text-xs text-[#555555] uppercase tracking-widest">▓▓▓░░░ LOADING PUBLIC EVENTS...</div>
      ) : publicHackathons.length === 0 ? (
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm font-bold text-[#555555] uppercase tracking-wide">NO PUBLIC EVENTS LISTED</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {publicHackathons.map((hackathon) => (
            <Link
              key={hackathon._id}
              href={`/hackathon/${hackathon._id}`}
              className="group border border-[#1F1F1F] bg-[#0A0A0A] p-5 transition-colors hover:border-[#00FF41]"
            >
              {hackathon.openGraphImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hackathon.openGraphImageUrl}
                  alt={`${hackathon.name} banner`}
                  className="mb-3 h-32 w-full border border-[#1F1F1F] object-cover"
                />
              )}
              <h2 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#00FF41] transition-colors">
                {hackathon.name}
              </h2>
              <p className="mt-2 line-clamp-3 text-xs text-[#555555]">{hackathon.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#555555]">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(hackathon.startDate), "MMM d, yyyy")} — {format(new Date(hackathon.endDate), "MMM d, yyyy")}
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#00FF41] uppercase tracking-wider">
                VIEW EVENT <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
