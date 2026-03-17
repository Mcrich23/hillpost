"use client";

import Image from "next/image";
import { Globe } from "lucide-react";
import { motion } from "framer-motion";
import { XIcon, LinkedInIcon, GitHubIcon } from "@/components/icons";

export function TeamSection() {
  return (
    <section id="team" className="relative border-t border-[#1F1F1F] bg-[#0A0A0A] px-4 py-24">
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="mb-4 flex items-center justify-center gap-3 text-[#555555]">
          <span className="text-xs uppercase tracking-widest">## MEET THE TEAM</span>
          <div className="h-px flex-1 max-w-xs bg-[#1F1F1F]" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-white uppercase tracking-wide sm:text-3xl">
          Meet the Builders
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-sm text-[#555555]">
          The minds behind the ultimate king-of-the-hill hackathon platform.
        </p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex flex-col gap-12 text-left"
        >
          {/* Team Cards */}
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto w-full">
            {/* Morris Card */}
            <div className="group relative border border-[#1F1F1F] bg-black p-6 transition-all hover:border-[#00FF41]">
              <div className="pointer-events-none absolute -top-px -right-px w-8 h-8 border-t border-r border-transparent group-hover:border-[#00FF41] transition-colors" />
              <div className="pointer-events-none absolute -bottom-px -left-px w-8 h-8 border-b border-l border-transparent group-hover:border-[#00FF41] transition-colors" />
              
              <div className="mb-6 mx-auto w-48 h-48 md:w-full md:h-auto aspect-square overflow-hidden border border-[#1F1F1F] bg-[#111] relative">
                <Image 
                  src="/morris.jpeg" 
                  alt="Morris Richman" 
                  fill
                  className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
              </div>
              
              <h3 className="mb-1 text-xl font-bold text-white uppercase tracking-wide">
                Morris Richman
              </h3>
              <div className="mb-4 text-xs text-[#00FF41] font-mono">
                {">"} Co-Creator 
              </div>
              
              <p className="mb-6 text-sm leading-relaxed text-[#aaaaaa]">
                Hey I’m Morris, a CS B.S. student at UC Santa Cruz who loves turning random ideas into reality! Driven by the love of the game, I thrive on building tools and exploring the depths of cybersecurity research. After hosting hackathons and seeing first-hand the friction in manual judging, I teamed up with Cyrus to build Hillpost. Whether it's reverse-engineering a new piece of software or shipping platforms that bring communities together, I'm always looking for the next challenge!
              </p>
              
              <div className="flex gap-4 mt-auto">
                <a href="https://x.com/morrisinlife" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <XIcon className="h-5 w-5" />
                </a>
                <a href="https://github.com/mcrich23" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <GitHubIcon className="h-5 w-5" />
                </a>
                <a href="https://www.linkedin.com/in/morris-richman/" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <LinkedInIcon className="h-5 w-5" />
                </a>
                <a href="https://mcrich23.com" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Cyrus Card */}
            <div className="group relative border border-[#1F1F1F] bg-black p-6 transition-all hover:border-[#00FF41]">
              <div className="pointer-events-none absolute -top-px -left-px w-8 h-8 border-t border-l border-transparent group-hover:border-[#00FF41] transition-colors" />
              <div className="pointer-events-none absolute -bottom-px -right-px w-8 h-8 border-b border-r border-transparent group-hover:border-[#00FF41] transition-colors" />
              
              <div className="mb-6 mx-auto w-48 h-48 md:w-full md:h-auto aspect-square overflow-hidden border border-[#1F1F1F] bg-[#111] relative">
                <Image 
                  src="/cyrus.jpeg" 
                  alt="Cyrus Correll" 
                  fill
                  className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
              </div>
              
              <h3 className="mb-1 text-xl font-bold text-white uppercase tracking-wide">
                Cyrus Correll
              </h3>
              <div className="mb-4 text-xs text-[#00FF41] font-mono">
                {">"} Co-Creator
              </div>

              <p className="mb-6 text-sm leading-relaxed text-[#aaaaaa]">
                Hey I’m Cyrus, a CSE M.S. student at UC Santa Cruz who loves building! I specialize in AI for small biz development but tackle projects across a variety of areas, from biomedical engineering to real estate. Hackathons fuel the pursuit of innovation in a way that’s second to none, which is why I built Hillpost alongside Morris. Together we’ve hosted hackathons in SF with over 300 hackers and $1M+ in aggregate sponsorship, and we knew the judging process needed fixing. Happy building, I hope to see you at an event soon!
              </p>
              
              <div className="flex gap-4 mt-auto">
                <a href="https://www.linkedin.com/in/cyruscorrell/" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <LinkedInIcon className="h-5 w-5" />
                </a>
                <a href="https://www.cyruscorrell.com/" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
