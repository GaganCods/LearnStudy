import React, { useState } from "react";
import { 
  Play, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Bookmark, 
  FileText, 
  AlarmClock, 
  Sparkles, 
  ArrowRight, 
  ListOrdered, 
  History, 
  Layers, 
  GraduationCap, 
  ChevronDown, 
  ExternalLink,
  Search,
  ShieldCheck,
  Zap,
  Laptop,
  Check,
  Share2,
  FolderOpen
} from "lucide-react";

interface LandingPageProps {
  onNavigateToApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToApp }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "/app") {
      e.preventDefault();
      onNavigateToApp();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (href.startsWith("#")) {
      e.preventDefault();
      const elem = document.querySelector(href);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const faqs = [
    {
      q: "What is LearnStudy?",
      a: "LearnStudy is a specialized study environment designed for students who learn through online lectures and YouTube playlists. It strips away distractions like algorithmic clickbait, unrelated recommendations, and noisy comment sections, turning video lectures into an organized, course-like study experience with built-in notes, timestamp bookmarks, and progress tracking."
    },
    {
      q: "How does LearnStudy work?",
      a: "Simply open LearnStudy and paste any public or unlisted YouTube playlist or video link. The platform instantly parses the lectures, organizes them into a structured chapter syllabus, remembers your progress automatically as you watch, and lets you jot down timestamped notes side-by-side with the player."
    },
    {
      q: "Can I study YouTube playlists with LearnStudy?",
      a: "Yes, full playlist support is a core feature of LearnStudy. You can load entire course playlists from teachers, professors, or exam coaching channels. LearnStudy calculates the total duration, tracks completed lectures with checkmarks, and auto-queues the next lecture when you finish."
    },
    {
      q: "Does LearnStudy track lecture progress?",
      a: "Yes. Every time you pause or switch lectures, LearnStudy remembers the exact second you stopped. When you return to any playlist or lecture, you can resume immediately from your exact timestamp with zero guesswork."
    },
    {
      q: "Does LearnStudy require an account?",
      a: "No mandatory account is required. LearnStudy works out-of-the-box using local browser storage, keeping your playlists, progress, and notes private and available immediately. You can also optionally sign in with Google to synchronize your study data to the cloud."
    },
    {
      q: "Can I use LearnStudy for exam preparation?",
      a: "Absolutely. LearnStudy is crafted specifically for intensive exam revision and structured curriculum prep, including JEE, NEET, IIT Madras online degree courses, college semester exams, coding bootcamps, and competitive certifications."
    },
    {
      q: "Does LearnStudy have a Pomodoro timer?",
      a: "Yes. An integrated Pomodoro study timer is available directly on the top navigation bar. You can run 25-minute or custom focus blocks with automated short/long rest intervals, audio notifications, and logged study streaks to maintain discipline."
    },
    {
      q: "Can I take notes while studying?",
      a: "Yes. LearnStudy features a dedicated note-taking panel with markdown formatting and one-click timestamp bookmarks. Clicking any timestamp bookmark instantly jumps the video playback back to that key explanation or formula."
    }
  ];

  const features = [
    {
      icon: <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: "YouTube Lecture Player",
      desc: "Distraction-free, responsive video player built specifically for online study sessions without algorithmic interruptions."
    },
    {
      icon: <ListOrdered className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      title: "Playlist Learning",
      desc: "Import multi-hour YouTube playlists and navigate cleanly through numbered chapters, continuous lectures, and overall syllabus progress."
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: "Lecture Progress Tracking",
      desc: "Never lose your place. LearnStudy auto-saves exact playback positions and calculates completion percentages for every course."
    },
    {
      icon: <History className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      title: "Lecture History",
      desc: "Quickly access recent study materials and lectures remembered safely in your browser storage so you can resume in one tap."
    },
    {
      icon: <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      title: "Notes",
      desc: "Rich markdown notes editor docked alongside your video so you can capture insights, key formulas, and lecture summaries easily."
    },
    {
      icon: <Bookmark className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      title: "Timestamp Bookmarks",
      desc: "Save important moments with interactive timestamps. Click any bookmark to jump right back to the exact second in the lecture."
    },
    {
      icon: <AlarmClock className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
      title: "Pomodoro Timer",
      desc: "Stay focused and prevent burnout with customizable study intervals, break alarms, and daily streak tracking."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />,
      title: "Student-Friendly Interface",
      desc: "Clean, fast, mobile-friendly design with Dark and Light mode support tailored to late-night study sessions."
    }
  ];

  const audienceGroups = [
    { title: "JEE & NEET Aspirants", desc: "Organize physics, chemistry, biology, and math lecture series into systematic daily study checklists." },
    { title: "College & University Students", desc: "Turn university lecture recordings into structured subject folders with timestamped revision points." },
    { title: "IIT Madras Online Degree Learners", desc: "Follow course playlists, foundation terms, and graded assignment lecture series without distractions." },
    { title: "Online Course & Tech Learners", desc: "Learn programming, web development, data science, and engineering playlists at your own pace." },
    { title: "Competitive Exam Candidates", desc: "Structure high-yield topic marathons, master formulas, and keep revision cheat sheets accessible." },
    { title: "Self-Paced YouTube Learners", desc: "Convert any educational YouTube series into an organized digital classroom with progress metrics." }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <img src="/favicon.svg" alt="LearnStudy Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Learn<span className="text-blue-600 dark:text-blue-400">Study</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                Study Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-zinc-300">
            <a href="#about" onClick={(e) => handleLinkClick(e, "#about")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              What is LearnStudy
            </a>
            <a href="#features" onClick={(e) => handleLinkClick(e, "#features")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={(e) => handleLinkClick(e, "#how-it-works")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              How It Works
            </a>
            <a href="#for-students" onClick={(e) => handleLinkClick(e, "#for-students")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Who It's For
            </a>
            <a href="#faq" onClick={(e) => handleLinkClick(e, "#faq")} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            <a
              href="/app"
              onClick={(e) => handleLinkClick(e, "/app")}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/60 dark:border-zinc-800/60">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Distraction-Free YouTube Study Environment</span>
            </div>

            {/* Single Clear H1 */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-[900] tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              LearnStudy — Study Smarter With YouTube Lectures
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-xl text-slate-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              Turn YouTube lectures and playlists into an organized study experience. Track your progress, continue where you left off, take notes, bookmark important timestamps, and stay focused with built-in study tools.
            </p>

            {/* Short Product Description */}
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto">
              LearnStudy is a study platform designed specifically for students and self-learners who study through online video lectures and YouTube playlists.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <a
                href="/app"
                onClick={(e) => handleLinkClick(e, "/app")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-black text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Start Learning</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#features"
                onClick={(e) => handleLinkClick(e, "#features")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm sm:text-base bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
              >
                <span>Explore Features</span>
              </a>
            </div>

            {/* Quick Proof Highlights */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Zero Ads or Distractions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Auto-Resumes Exact Timestamps</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Full Playlist Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Free & No Sign-up Required</span>
              </div>
            </div>
          </div>

          {/* Interactive UI Mockup Showcase */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl p-2 sm:p-4 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 border border-slate-300/80 dark:border-zinc-700/80 shadow-2xl">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 text-white">
              {/* Fake Window Header */}
              <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">learnstudy.app/app</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] font-medium">
                  <span className="flex items-center gap-1">
                    <AlarmClock className="w-3.5 h-3.5 text-orange-400" /> 25:00 Focus
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    Active Session
                  </span>
                </div>
              </div>

              {/* Workspace Mockup Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[320px] sm:min-h-[400px]">
                {/* Playlist Sidebar */}
                <div className="md:col-span-4 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-blue-400" />
                      <span>Course Playlist Syllabus</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                      65% Completed
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-left flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        03
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">Lecture 03: Core Concepts & Practice</div>
                        <div className="text-[10px] text-blue-300 font-medium">Resume at 14:25 / 45:10</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left flex items-start gap-2.5 opacity-80">
                      <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-300 truncate">Lecture 02: Fundamentals & Examples</div>
                        <div className="text-[10px] text-emerald-400">Finished (100%)</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left flex items-start gap-2.5 opacity-80">
                      <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-300 truncate">Lecture 01: Course Orientation</div>
                        <div className="text-[10px] text-emerald-400">Finished (100%)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Player & Notes Panel */}
                <div className="md:col-span-8 p-4 sm:p-6 flex flex-col justify-between space-y-4 bg-slate-900">
                  {/* Mock Video Card */}
                  <div className="relative rounded-2xl bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center overflow-hidden group shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    <div className="w-14 h-14 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                      <div className="font-semibold">Lecture 03: Core Concepts & Formulas</div>
                      <div className="font-mono text-[11px] bg-black/60 px-2 py-0.5 rounded">14:25 / 45:10</div>
                    </div>
                  </div>

                  {/* Timestamped Note Preview */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-[11px] shrink-0 cursor-pointer">
                        14:25
                      </span>
                      <span className="text-slate-300 truncate">
                        Key formula derivation & practice problem notes
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">
                      Saved Note
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 1: What is LearnStudy? */}
      <section id="about" className="py-16 md:py-24 bg-slate-50/50 dark:bg-zinc-900/30 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              What is LearnStudy?
            </h2>
            <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              A dedicated digital study desk created to make learning from online video lectures organized, trackable, and free from algorithmic distractions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-sm sm:text-base text-slate-600 dark:text-zinc-300 leading-relaxed">
              <p>
                Millions of students learn online every single day through outstanding lectures published on YouTube by professors, educators, and institutions. However, YouTube is built primarily as an entertainment platform with sidebars designed to keep users scrolling.
              </p>
              <p>
                <strong>LearnStudy changes this experience completely.</strong> By importing your chosen lecture playlist into LearnStudy, you enter a distraction-free digital classroom.
              </p>
              <p>
                The app indexes full courses, calculates your remaining hours, keeps your exact playback timestamps saved across sessions, and lets you take structured notes with clickable timestamps.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Designed For Serious Study
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Algorithmic Recommendations:</strong> No gaming feeds, shorts, or trending distractions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Full Course Indexing:</strong> Numbered lecture syllabus with total playlist study duration.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Active Note Taking:</strong> Instant timestamp bookmarks tied to specific seconds in the video.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Built-in Focus Discipline:</strong> Pomodoro timer with audible intervals and streak counters.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sections 2-6: Detailed Core Workflows */}
      <section className="py-16 md:py-24 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          
          {/* Section 2: Study YouTube Playlists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <ListOrdered className="w-4 h-4" />
                <span>Full Syllabus Structure</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Study YouTube Playlists In Order
              </h2>
              <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
                Paste any YouTube playlist link and LearnStudy turns it into a structured, numbered course curriculum. See all lectures, individual video durations, and the aggregate hours required to finish the course.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" /> One-click playlist import with automatic metadata
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" /> Total playlist duration & aggregate time calculation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" /> Seamless auto-play next lecture upon completion
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2 bg-gradient-to-tr from-indigo-500/10 to-blue-500/10 p-6 sm:p-8 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Organic Chemistry Complete Series</span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-zinc-400">42 Lectures • 38h 20m</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">01. IUPAC Nomenclature Basics</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Done (100%)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xs border border-blue-200 dark:border-blue-900/60">
                    <span className="font-bold text-blue-700 dark:text-blue-300">02. Reaction Mechanisms Part 1</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">24:10 / 52:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Track Your Lecture Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 p-6 sm:p-8 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Course Completion Status</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">82% Complete</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-[82%]" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                    <div className="text-sm font-black text-slate-900 dark:text-white">28</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">Finished</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                    <div className="text-sm font-black text-slate-900 dark:text-white">6</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">In Progress</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                    <div className="text-sm font-black text-slate-900 dark:text-white">12.4h</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">Time Studied</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Guesswork</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Track Your Lecture Progress Accurately
              </h2>
              <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
                Never ask "where did I stop last time?" LearnStudy automatically records the exact second you paused or left any video. Return at any time and resume with one click.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> Automatic timestamp caching down to the exact second
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> Visual progress meters and completion checkboxes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> Real-time study streak and total minutes calculated
                </li>
              </ul>
            </div>
          </div>

          {/* Section 4 & 5: History, Notes & Timestamp Bookmarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* History */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Lecture History & Instant Resume
              </h2>
              <p className="text-slate-600 dark:text-zinc-300 text-sm leading-relaxed">
                All recently watched lectures and opened playlists are saved in your browser history. Pick up your study session without having to search or paste URLs again.
              </p>
            </div>

            {/* Notes & Bookmarks */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Bookmark className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Notes & Timestamp Bookmarks
              </h2>
              <p className="text-slate-600 dark:text-zinc-300 text-sm leading-relaxed">
                Take comprehensive notes directly alongside the video player. Add interactive timestamp tags to save important formulas and derivations for quick exam revision.
              </p>
            </div>
          </div>

          {/* Section 6: Pomodoro Study Timer */}
          <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 rounded-3xl border border-orange-200/60 dark:border-orange-900/40 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 text-xs font-bold">
                <AlarmClock className="w-4 h-4" />
                <span>Integrated Productivity</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Built-in Pomodoro Focus Timer
              </h2>
              <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
                Study in disciplined blocks with automated rest cycles. Track daily focus streaks, customize interval durations, and maintain long-term stamina for intense study sessions.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm text-center min-w-[240px]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Current Focus Session</div>
              <div className="text-4xl font-mono font-black text-orange-600 dark:text-orange-400 my-2">25:00</div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 py-1 px-2 rounded-lg">
                3 Cycles Completed Today
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 7: Features Grid */}
      <section id="features" className="py-16 md:py-24 bg-slate-50/50 dark:bg-zinc-900/30 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Essential Tools for Focused Online Study
            </h2>
            <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto">
              Everything you need to turn YouTube lecture playlists into a productive personal study station.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 space-y-3 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Section 8: How LearnStudy Works */}
      <section id="how-it-works" className="py-16 md:py-24 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              How LearnStudy Works
            </h2>
            <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base max-w-xl mx-auto">
              Get started in seconds with 4 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 text-left relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-2">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1 — Open LearnStudy
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Launch the application in your browser. No mandatory sign-up or credit card required.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 text-left relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center mb-2">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 2 — Add a YouTube lecture or playlist
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Paste any public or unlisted YouTube video or playlist link into the search or import bar.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 text-left relative">
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-black text-sm flex items-center justify-center mb-2">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 3 — Study and track your progress
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Watch in distraction-free mode, jot down timestamped notes, and run the Pomodoro timer.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 text-left relative">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-2">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 4 — Continue learning whenever you return
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                Come back anytime. LearnStudy automatically loads your exact second and finished checkmarks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section 9: Who Is LearnStudy For? */}
      <section id="for-students" className="py-16 md:py-24 bg-slate-50/50 dark:bg-zinc-900/30 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Who Is LearnStudy For?
            </h2>
            <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto">
              Built for students and online learners across rigorous academic and competitive preparation programs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {audienceGroups.map((g, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-2 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  {g.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {g.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Explicit Independence / Fair-Use Disclaimer per guidelines */}
          <div className="mt-10 p-4 rounded-2xl bg-slate-100 dark:bg-zinc-850/80 border border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-500 dark:text-zinc-400 max-w-3xl mx-auto">
            <p>
              <strong>Disclaimer:</strong> LearnStudy is an independent learning and productivity utility. LearnStudy is not officially affiliated with, endorsed by, or sponsored by YouTube, Google LLC, IIT Madras, NTA JEE, NEET, or any mentioned educational institutions. All trademarks and brand names belong to their respective owners.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Section 10: FAQ */}
      <section id="faq" className="py-16 md:py-24 border-b border-slate-200/70 dark:border-zinc-800/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-zinc-300 text-sm sm:text-base">
              Clear answers about LearnStudy features, playlist support, progress tracking, and accounts.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-850/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed border-t border-slate-100 dark:border-zinc-850">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Section 11: Final CTA */}
      <section className="py-20 bg-gradient-to-b from-blue-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-[900] tracking-tight leading-tight">
            Start Learning With LearnStudy
          </h2>
          <p className="text-base sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Organize your lectures, stay focused, and make your study sessions more productive.
          </p>
          <div className="pt-4">
            <a
              href="/app"
              onClick={(e) => handleLinkClick(e, "/app")}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-base sm:text-lg bg-white text-blue-700 hover:bg-blue-50 shadow-2xl active:scale-[0.98] transition-all cursor-pointer group"
            >
              <span>Open LearnStudy</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <p className="text-xs text-blue-200 font-medium">
            Free forever for students • No installation required
          </p>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="LearnStudy Logo" className="w-6 h-6 object-contain" />
            <span className="font-extrabold text-sm text-white">LearnStudy</span>
            <span className="text-slate-500">| Study Smarter With YouTube Lectures</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <a href="/app" onClick={(e) => handleLinkClick(e, "/app")} className="hover:text-white transition-colors">
              Open App
            </a>
            <a href="#about" onClick={(e) => handleLinkClick(e, "#about")} className="hover:text-white transition-colors">
              About
            </a>
            <a href="#features" onClick={(e) => handleLinkClick(e, "#features")} className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={(e) => handleLinkClick(e, "#how-it-works")} className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#faq" onClick={(e) => handleLinkClick(e, "#faq")} className="hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          <div className="text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} LearnStudy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
