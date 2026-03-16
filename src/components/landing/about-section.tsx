"use client";

import { Terminal } from "lucide-react";
import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <section id="about" className="relative border-t border-[#1F1F1F] bg-[#0A0A0A] px-4 py-24">
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-4 flex items-center justify-center gap-3 text-[#555555]">
          <span className="text-xs uppercase tracking-widest">## ABOUT US</span>
          <div className="h-px flex-1 max-w-xs bg-[#1F1F1F]" />
        </div>
        <h2 className="mb-8 text-2xl font-bold text-white uppercase tracking-wide sm:text-3xl">
          Built For Hackers, By Hackers
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-3xl flex-col gap-6 text-left"
        >
          <div className="border border-[#1F1F1F] bg-black p-8 font-mono text-sm leading-relaxed text-[#aaaaaa]">
            <div className="mb-4 flex items-center gap-2 border-b border-[#1F1F1F] pb-4">
              <Terminal className="h-4 w-4 text-[#00FF41]" />
              <span className="text-xs text-[#555555]">sysadmin@hillpost:~$ cat mission.txt</span>
            </div>
            <p className="mb-4">
              Traditional hackathon judging is slow, opaque, and often relies on disconnected spreadsheets or clunky enterprise software.
            </p>
            <p className="mb-4">
              <span className="text-white">We built Hillpost to fix that.</span> Our goal is to bring the excitement of a live sporting event to the hackathon judging process. With real-time leaderboards, transparent scoring updates, and a dedicated judge interface, the wait for the closing ceremony is finally over.
            </p>
            <p className="mb-8 text-[#00FF41] opacity-80">
              {">"} System optimized for high-intensity, king-of-the-hill competition.
            </p>
            
            <div className="flex justify-center sm:justify-start">
              <a
                href="/team"
                className="group flex items-center gap-2 border border-[#00FF41] bg-[#00FF41] px-6 py-2.5 text-xs font-bold text-black uppercase tracking-wider transition-all hover:bg-white hover:border-white"
              >
                [ MEET THE TEAM → ]
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
