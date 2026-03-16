import Image from "next/image";
import { Github, Linkedin } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-black px-4 py-24 dot-grid">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-[#555555]">
            <span className="text-xs uppercase tracking-widest">## TEAM</span>
            <div className="h-px flex-1 max-w-xs bg-[#1F1F1F]" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white uppercase tracking-wide sm:text-5xl">
            Meet the Builders
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-[#555555]">
            The minds behind the ultimate king-of-the-hill hackathon platform.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Morris Card */}
          <div className="group relative border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-all hover:border-[#00FF41]">
            <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 border-t border-r border-[#1F1F1F] group-hover:border-[#00FF41] transition-colors" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#1F1F1F] group-hover:border-[#00FF41] transition-colors" />
            
            <div className="mb-6 aspect-square overflow-hidden border border-[#1F1F1F] bg-[#111] relative">
              <Image 
                src="/morris.jpeg" 
                alt="Morris Richman" 
                fill
                className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
              />
            </div>
            
            <h2 className="mb-1 text-xl font-bold text-white uppercase tracking-wide">
              Morris Richman
            </h2>
            <div className="mb-4 text-xs text-[#00FF41] font-mono">
              {">"} Co-Creator 
            </div>
            
            <p className="mb-6 text-sm leading-relaxed text-[#aaaaaa]">
              Hey I’m Morris, a CS B.S. student at UC Santa Cruz who loves turning random ideas into reality! Driven by the love of the game, I thrive on building tools and exploring the depths of cybersecurity research. After hosting hackathons and seeing first-hand the friction in manual judging, I teamed up with Cyrus to build Hillpost. Whether it's reverse-engineering a new protocol or shipping platforms that bring communities together, I'm always looking for the next challenge!
            </p>
            
            <div className="flex gap-4">
              <a href="https://github.com/Mcrich23" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Cyrus Card */}
          <div className="group relative border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-all hover:border-[#00FF41]">
            <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 border-t border-l border-[#1F1F1F] group-hover:border-[#00FF41] transition-colors" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 border-b border-r border-[#1F1F1F] group-hover:border-[#00FF41] transition-colors" />
            
            <div className="mb-6 aspect-square overflow-hidden border border-[#1F1F1F] bg-[#111] relative">
              <Image 
                src="/cyrus.jpeg" 
                alt="Cyrus Correll" 
                fill
                className="object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
              />
            </div>
            
            <h2 className="mb-1 text-xl font-bold text-white uppercase tracking-wide">
              Cyrus Correll
            </h2>
            <div className="mb-4 text-xs text-[#00FF41] font-mono">
              {">"} Co-Creator
            </div>

            <p className="mb-6 text-sm leading-relaxed text-[#aaaaaa]">
              Hey I’m Cyrus, a CSE M.S. student at UC Santa Cruz who loves building! I specialize in AI for small biz development but tackle projects across a variety of areas, from biomedical engineering to real estate. Hackathons fuel the pursuit of innovation in a way that’s second to none, which is why I built Hillpost alongside Morris. Together we’ve hosted hackathons in SF with over 300 hackers and $1M+ in aggregate sponsorship, and we knew the judging process needed fixing. Happy building, I hope to see you at an event soon!
            </p>
            
            <div className="flex gap-4">
              <a href="https://www.linkedin.com/in/cyruscorrell/" target="_blank" rel="noopener noreferrer" className="text-[#555555] hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
