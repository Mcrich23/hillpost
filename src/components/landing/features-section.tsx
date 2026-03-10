import { Trophy, Users, Gavel, LayoutGrid } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "Real-time Leaderboard",
    description:
      "Watch scores update live as judges evaluate submissions. Rankings shift in real-time with beautiful animations.",
  },
  {
    icon: Users,
    title: "Team Submissions",
    description:
      "Teams register, form groups, and submit their projects. Track every submission with version history and timestamps.",
  },
  {
    icon: Gavel,
    title: "Live Judging",
    description:
      "Judges score across multiple categories with a streamlined interface. Weighted scoring ensures fair evaluation.",
  },
  {
    icon: LayoutGrid,
    title: "Custom Categories",
    description:
      "Define custom judging categories with individual weights. From innovation to design — score what matters most.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative border-t border-gray-800 bg-gray-950 px-4 py-24"
    >
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Everything you need to run a hackathon
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            From team registration to final scores, manage every aspect of your
            hackathon judging in one place.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-gray-900/80 hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {/* Icon container */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-colors group-hover:bg-emerald-500/20">
                <feature.icon className="h-6 w-6" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
