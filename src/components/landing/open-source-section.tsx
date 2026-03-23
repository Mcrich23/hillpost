"use client";

import { motion } from "framer-motion";
import { Github, Code, GitPullRequest } from "lucide-react";

export function OpenSourceSection() {
  return (
    <section id="open-source" className="relative border-t border-[#1F1F1F] bg-black px-4 py-24">
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-[#555555]">
            <span className="text-xs uppercase tracking-widest">## OPEN SOURCE</span>
            <div className="h-px flex-1 max-w-xs bg-[#1F1F1F]" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-white uppercase tracking-wide sm:text-3xl">
            Free Forever. Open Always.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[#555555]">
            Hillpost is built out in the open. We believe the best tools for the community should be built by the community. Run your own instance, contribute features, or just star the repo.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Card 1 */}
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-colors hover:border-[#00FF41]">
            <Code className="mb-4 h-6 w-6 text-[#00FF41]" />
            <h3 className="mb-2 text-sm font-bold text-white uppercase tracking-wide">
              [ 100% Free ]
            </h3>
            <p className="text-xs leading-relaxed text-[#aaaaaa]">
              No enterprise tiers or artificial limits. Host it yourself or use our public instance without paying a dime.
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-colors hover:border-[#00FF41]">
            <GitPullRequest className="mb-4 h-6 w-6 text-[#00B4FF]" />
            <h3 className="mb-2 text-sm font-bold text-white uppercase tracking-wide">
              [ Community Driven ]
            </h3>
            <p className="text-xs leading-relaxed text-[#aaaaaa]">
              Missing a feature? Found a bug? Open a PR. Hillpost thrives on contributions from hackers like you.
            </p>
          </div>

          {/* Card 3 - CTA */}
          <div className="flex flex-col items-start justify-center border border-[#1F1F1F] bg-[#0A0A0A] p-6 lg:col-span-1 md:col-span-2">
            <h3 className="mb-2 text-sm font-bold text-white uppercase tracking-wide">
              [ Join The Mission ]
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-[#aaaaaa]">
              Check out the source code, see our roadmap, and help us build the future of hackathon platform tools.
            </p>
            <a
              href="https://github.com/Mcrich23/hillpost"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-center gap-2 border border-[#1F1F1F] bg-black px-4 py-3 text-xs font-bold text-white uppercase tracking-wider transition-all hover:border-[#00FF41] hover:text-[#00FF41]"
            >
              <Github className="h-4 w-4" />
              <span>View Source</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
