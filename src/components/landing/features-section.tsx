"use client";

import { Trophy, Users, Gavel, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Trophy,
    title: "REAL-TIME LEADERBOARD",
    description:
      "Watch scores update live as judges evaluate submissions. Rankings shift in real-time.",
    color: "#FF6600",
  },
  {
    icon: Users,
    title: "TEAM SUBMISSIONS",
    description:
      "Teams register, form groups, and submit their projects. Track every submission with timestamps.",
    color: "#00B4FF",
  },
  {
    icon: Gavel,
    title: "LIVE JUDGING",
    description:
      "Judges score across multiple categories with a streamlined interface. Weighted scoring.",
    color: "#00FF41",
  },
  {
    icon: LayoutGrid,
    title: "CUSTOM CATEGORIES",
    description:
      "Define custom judging categories with individual weights. Score what matters most.",
    color: "#00FF41",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative border-t border-[#1F1F1F] bg-black px-4 py-8 md:py-16"
    >
      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-6 md:mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-[#555555]">
            <span className="text-xs uppercase tracking-widest">## FEATURES</span>
            <div className="h-px flex-1 max-w-xs bg-[#1F1F1F]" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-white uppercase tracking-wide sm:text-3xl">
            Everything you need to run a hackathon
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[#555555]">
            From team registration to final scores, manage every aspect of your
            hackathon judging in one place.
          </p>
        </div>

        {/* Feature cards */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-colors duration-100 hover:border-white"
            >
              {/* Icon */}
              <div className="mb-4">
                <feature.icon className="h-6 w-6 transition-colors group-hover:text-[#FF6600]" style={{ color: feature.color }} />
              </div>

              <h3 className="mb-2 text-xs font-bold text-white uppercase tracking-wider">
                [{feature.title}]
              </h3>
              <p className="text-xs leading-relaxed text-[#555555]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
