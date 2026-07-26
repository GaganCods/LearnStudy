import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Github, Linkedin, Twitter, Globe, Award, Coffee, 
  ArrowLeft, Heart, Code, Sparkles, Send, ShieldCheck, 
  Terminal, Flame, CheckCircle, RefreshCw, Layers, Star
} from "lucide-react";
import { DeveloperAvatar } from "./DeveloperAvatar";

interface DeveloperProfileProps {
  onBackToHome: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export function DeveloperProfile({ onBackToHome, soundEnabled, setSoundEnabled }: DeveloperProfileProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("gagan52526@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const skills = [
    { name: "Full-Stack React", level: "Expert" },
    { name: "TypeScript", level: "Expert" },
    { name: "AI/LLM Integrations", level: "Intermediate" },
    { name: "Tailwind CSS & UI/UX", level: "Expert" },
    { name: "Performance Optimization", level: "Advanced" },
    { name: "API Architectures", level: "Advanced" }
  ];

  const changelog = [
    {
      version: "v1.0.0",
      date: "July 2026",
      badge: "Initial Release",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450",
      changes: [
        "Interactive Study Player with Notes, Bookmarks & Custom playback state",
        "Deep Gemini AI integrations: Summarization, Quiz generation & Flashcards",
        "Durable browser local cache database utilizing local storage",
        "Pomodoro Timer with study metrics, interactive graphs & daily logs",
        "YouTube live diagnostic & retry mechanism for robust offline resilience"
      ]
    },
    {
      version: "v1.0.1",
      date: "Current Build",
      badge: "Developer Update",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      changes: [
        "Subtle, highly premium Developer Profile section in Settings and desktop sidebar",
        "Dynamic client-side YouTube API backup fallback if production keys error or quota hit",
        "Enhanced accessibility with interactive tooltips, high contrasts & smooth lift motions",
        "Upgraded layout responsiveness across mobile viewport widths"
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-4xl mx-auto space-y-8 py-4 px-1"
    >
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="group flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
          DEVELOPER HUB • ACTIVE
        </span>
      </div>

      {/* Hero Banner Grid */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 border border-slate-200 dark:border-zinc-800 text-white p-6 md:p-8 shadow-xl">
        {/* Abstract shapes background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div className="p-1 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 shadow-2xl">
              <DeveloperAvatar size="lg" showStatusIndicator={true} />
            </div>
            
            {/* Developer Tag */}
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-black tracking-widest uppercase py-0.5 px-2 rounded-full text-white shadow-md border border-blue-400/30 whitespace-nowrap z-30">
              Creator
            </span>
          </div>

          {/* Name & Quick Details */}
          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Gagan Pratap</h1>
              <div className="flex gap-1 justify-center">
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-slate-300">India</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-[10px] font-bold text-blue-400 border border-blue-500/20">Full-Stack</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 font-semibold max-w-xl leading-relaxed">
              Crafting premium distraction-free learning environments & modern productivity tools.
            </p>

            {/* Micro badges */}
            <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5 text-blue-400" /> Web Engineer</span>
              <span className="flex items-center gap-1"><Code className="w-3.5 h-3.5 text-indigo-400" /> UI/UX Designer</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Explorer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Mission & Background */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-amber-500" />
              The Mission behind LearnStudy
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              We live in an age of hyper-distraction. Online education platforms—primarily YouTube—are optimized for keeping users on the site to watch ads, rather than helping them actually comprehend, review, and master challenging educational courses.
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              LearnStudy was born out of a desire to create a premium, distraction-free study terminal. It strips away recommendation sidebar loops, comments, and attention-grabbing banners. Instead, it overlays high-performance utilities: notes synced with playback, timestamped bookmarking, structured curriculum maps, and automated Gemini AI study-coaching to accelerate active recall.
            </p>
            <blockquote className="border-l-2 border-blue-500 pl-3 py-1 bg-slate-50 dark:bg-zinc-950 rounded-r-xl text-xs font-medium text-slate-500 dark:text-zinc-400 italic">
              "The best learning happens when technology steps out of the way and lets you focus on what truly matters: deep comprehension."
            </blockquote>
          </div>

          {/* Technical Skills Map */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-blue-500" />
              Developer Tech Stack & Skills
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {skills.map((skill, i) => (
                <div key={i} className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-850 flex flex-col gap-1 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-zinc-100">{skill.name}</span>
                  <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">{skill.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connect & Social Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-zinc-50">Let's Connect</h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Get in touch or check out more projects.</p>
            </div>

            {/* Social Grid */}
            <div className="grid grid-cols-2 gap-2">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 hover:border-blue-500/30 rounded-xl text-xs text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all group font-semibold"
              >
                <Github className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform text-slate-500 dark:text-zinc-450" />
                GitHub
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 hover:border-blue-500/30 rounded-xl text-xs text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all group font-semibold"
              >
                <Linkedin className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform text-slate-500 dark:text-zinc-450" />
                LinkedIn
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 hover:border-blue-500/30 rounded-xl text-xs text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all group font-semibold"
              >
                <Twitter className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform text-slate-500 dark:text-zinc-450" />
                X / Twitter
              </a>
              <a 
                href="https://gaganpratap.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-150 dark:border-zinc-850 hover:border-blue-500/30 rounded-xl text-xs text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all group font-semibold"
              >
                <Globe className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform text-slate-500 dark:text-zinc-450" />
                Website
              </a>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-2">
              <a 
                href="https://gaganpratap.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 hover:-translate-y-0.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                Visit Portfolio Website
              </a>

              <button 
                onClick={handleCopyEmail}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                {copiedEmail ? "✓ Email Copied!" : "Copy Developer Email"}
              </button>
            </div>

            {/* Coffee Support Section */}
            <div className="border-t border-slate-100 dark:border-zinc-850 pt-4 flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Coffee className="w-4 h-4 animate-bounce" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Support the Project</span>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">If LearnStudy has helped you lock into your lectures and score higher grades, consider showing your support!</p>
              <a 
                href="https://buymeacoffee.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-300 dark:border-amber-900/30 bg-amber-500/5 hover:bg-amber-500/10 text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider transition-colors cursor-pointer"
              >
                ☕ Buy Me a Coffee
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Changelog & History */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-zinc-50 flex items-center gap-2">
            <RefreshCw className="w-4.5 h-4.5 text-indigo-500" />
            Build Changelog & Versions
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Track the progression and feature expansions of LearnStudy.</p>
        </div>

        <div className="space-y-6 relative border-l-2 border-slate-100 dark:border-zinc-800 ml-3 pl-6 py-1">
          {changelog.map((log, index) => (
            <div key={index} className="relative space-y-2">
              {/* Circle dot marker */}
              <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white dark:border-zinc-950 ring-4 ring-slate-50 dark:ring-zinc-900" />
              
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-black text-slate-900 dark:text-zinc-50">{log.version}</span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">{log.date}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${log.badgeColor}`}>
                  {log.badge}
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                {log.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Local Architecture Statement */}
      <div className="rounded-3xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-900 p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/25 text-emerald-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 uppercase tracking-wide block">Privacy & Security Certified</span>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed mt-0.5 max-w-xl">
              LearnStudy values your trust. 100% of your notes, playlist library, watch history, bookmarks, and Gemini AI API Keys stay securely stored locally within your browser. There is no tracking, no registration databases, and no telemetry cookies.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-850 px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            100% Free
          </span>
        </div>
      </div>
    </motion.div>
  );
}
