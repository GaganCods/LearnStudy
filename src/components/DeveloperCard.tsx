import React from "react";
import { Github, Linkedin, Twitter, Globe, Award, Coffee } from "lucide-react";
import { DeveloperAvatar } from "./DeveloperAvatar";

interface DeveloperCardProps {
  onViewProfile: () => void;
  sidebarCollapsed?: boolean;
}

export function DeveloperCard({ onViewProfile, sidebarCollapsed = false }: DeveloperCardProps) {
  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center justify-center pt-4 mt-4 border-t border-slate-100 dark:border-zinc-900/60 w-full">
        <button
          onClick={onViewProfile}
          className="relative group flex items-center justify-center w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-800 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
          title="Gagan Pratap - Creator of LearnStudy"
        >
          <DeveloperAvatar size="sm" showStatusIndicator={false} />
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          
          {/* Subtle glowing pulse */}
          <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-900/60 shrink-0 w-full">
      <div 
        onClick={onViewProfile}
        className="group relative rounded-[18px] p-5 cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15] hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-blue-950/20"
      >
        {/* Glowing overlay */}
        <div className="absolute -inset-px rounded-[18px] bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Top bar with stats badges */}
        <div className="flex flex-wrap gap-1.5 mb-3.5 pointer-events-none">
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            🚀 v1.0
          </span>
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
            ❤️ For Students
          </span>
        </div>

        {/* Avatar, Name & Subtitle */}
        <div className="flex items-start gap-3.5 mb-3">
          <DeveloperAvatar size="md" showStatusIndicator={true} />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Gagan Pratap
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              Creator of LearnStudy
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-zinc-300 mb-4 pointer-events-none line-clamp-2">
          Building tools that help students learn smarter and study distraction-free.
        </p>

        {/* Social Icons row - stop propagation so buttons aren't intercepted */}
        <div className="flex items-center gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-450 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-450 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            title="X (Twitter)"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-450 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-450 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          <a
            href="https://gaganpratap.dev"
            target="_blank"
            rel="noopener noreferrer"
            title="Portfolio / Website"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-450 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Globe className="w-4 h-4" />
          </a>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:translate-y-0.5 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-blue-500/20 flex items-center justify-center gap-1.5"
        >
          View Full Profile
          <Award className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
