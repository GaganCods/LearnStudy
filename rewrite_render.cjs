const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

const renderStart = code.indexOf('  return (\n    <div className="max-w-5xl mx-auto');
if (renderStart !== -1) {
  let headerCode = code.substring(0, renderStart);
  
  // We need to add state for mobile settings sheet
  if (!headerCode.includes('showSettingsSheet')) {
    headerCode = headerCode.replace(
      'const [activeSubTab, setActiveSubTab] = useState',
      'const [showSettingsSheet, setShowSettingsSheet] = useState(false);\n  const [activeSubTab, setActiveSubTab] = useState'
    );
  }
  
  // Now I will append my own clean render block
  const newRender = `  return (
    <div className="max-w-7xl mx-auto px-4 py-4 select-none" id="pomodoro-engine-dashboard">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-900/40 dark:to-zinc-900/60 p-5 rounded-3xl border border-slate-200/50 dark:border-zinc-800 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            Pomodoro Study Station
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Maintain high focus streaks, configure flexible break durations, and study without recommendations.
          </p>
        </div>

        {/* Floating Timer Toggle & Fast Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFloating(!isFloating)}
            className={\`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 \${
              isFloating 
                ? "bg-indigo-600 border-transparent text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }\`}
            title="Toggle Floating Widget Overlay"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFloating ? "Overlay: Active" : "Enable Overlay"}</span>
          </button>

          <button
            onClick={() => setFullScreen(true)}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
            title="Full Screen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {/* Mobile settings toggle */}
          <button
            onClick={() => setShowSettingsSheet(true)}
            className="lg:hidden p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Content Area (Timer/Stats/History) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: "timer", label: "Timer", icon: Clock },
              { id: "stats", label: "Statistics", icon: BarChart2 },
              { id: "history", label: "History Log", icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition border \${
                  activeSubTab === tab.id 
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                }\`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeSubTab === "timer" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative min-h-[460px]">
              {/* Session indicator */}
              <div className="absolute top-6 flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800 rounded-full">
                <span className={\`w-2.5 h-2.5 rounded-full \${activeState.mode === "focus" ? "bg-orange-500 animate-pulse" : activeState.mode === "shortBreak" ? "bg-emerald-500 animate-ping" : "bg-blue-500"}\`} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  {activeState.mode === "focus" 
                    ? \`Focus Session (\${activeState.sessionIndex}/\${settings.sessionsBeforeLongBreak})\`
                    : activeState.mode === "shortBreak" ? "Short Break" : "Long Break"
                  }
                </span>
              </div>

              {/* Circular SVG Ring */}
              <div className="relative my-8 group cursor-pointer" onClick={activeState.isPaused ? startTimer : pauseTimer}>
                <svg className="w-64 h-64 transform -rotate-90">
                  {/* Background Ring */}
                  <circle cx="128" cy="128" r={radius} className="stroke-slate-100 dark:stroke-zinc-800" strokeWidth="8" fill="none" />
                  {/* Progress Ring */}
                  <circle
                    cx="128" cy="128" r={radius}
                    className={\`\${
                      activeState.mode === "focus" 
                        ? "stroke-orange-500" 
                        : activeState.mode === "shortBreak" ? "stroke-emerald-500" : "stroke-blue-500"
                    }\${activeState.isPaused ? " opacity-50" : ""} transition-all duration-1000 ease-linear\`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={\`text-5xl font-black tracking-tight font-mono transition-colors \${
                      activeState.mode === "focus" 
                        ? "text-slate-900 dark:text-white" 
                        : activeState.mode === "shortBreak" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                    }\`}>
                    {formatTime(remainingSeconds)}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {activeState.isPaused ? "Click to Start" : "Click to Pause"}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={subMinute}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                  title="-1 Minute"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  onClick={activeState.isPaused ? startTimer : pauseTimer}
                  className={\`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 \${
                    activeState.isPaused
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }\`}
                >
                  {activeState.isPaused ? <Play className="w-6 h-6 ml-1" /> : <Pause className="w-6 h-6" />}
                </button>

                <button
                  onClick={addMinute}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
                  title="+1 Minute"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={resetTimer}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={skipSession}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  Skip
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "stats" && (
            <div className="space-y-6">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Today's Focus</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">{stats.totalFocusToday} <span className="text-xs font-semibold">mins</span></div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Today's Break</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-zinc-50 mt-1">{stats.totalBreakToday} <span className="text-xs font-semibold">mins</span></div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Streak Status</span>
                  <div className="text-2xl font-black text-orange-500 mt-1">{stats.currentStreak} <span className="text-xs font-semibold text-slate-400">Days</span></div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-sm">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Sessions</span>
                  <div className="text-2xl font-black text-emerald-500 mt-1">{stats.sessionsCompletedToday} <span className="text-xs font-semibold text-slate-400">Done</span></div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-6">Weekly Focus Trend</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-zinc-800" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} className="text-slate-400 dark:text-zinc-500" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} className="text-slate-400 dark:text-zinc-500" />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="Focus Time" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Break Time" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "history" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search history by video title or playlist..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs pl-10 pr-4 py-2.5 rounded-xl text-slate-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl cursor-pointer text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="all">All Sessions</option>
                    <option value="completed">Completed</option>
                    <option value="interrupted">Interrupted</option>
                  </select>
                  <button onClick={exportHistory} className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition" title="Export CSV">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={clearHistory} className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition" title="Clear All">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                {history.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-500">No Pomodoro history yet.</p>
                  </div>
                ) : (
                  history.filter(item => {
                    const matchSearch = (item.lectureTitle?.toLowerCase() || "").includes(historySearch.toLowerCase()) || 
                                        (item.playlistTitle?.toLowerCase() || "").includes(historySearch.toLowerCase());
                    const matchFilter = historyFilter === "all" ? true : (historyFilter === "completed" ? item.completed : !item.completed);
                    return matchSearch && matchFilter;
                  }).map(item => (
                    <div key={item.id} className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={\`w-2 h-2 rounded-full \${item.completed ? "bg-emerald-500" : "bg-amber-500"}\`} />
                          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{item.date} • {item.startTime} - {item.endTime}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">
                          Focus: <span className="font-semibold text-slate-600 dark:text-zinc-400">{item.focusDuration}m</span> | 
                          Break: <span className="font-semibold text-slate-600 dark:text-zinc-400">{item.breakDuration}m</span>
                          {item.lectureTitle && \` | \${item.lectureTitle}\`}
                        </div>
                      </div>
                      <button onClick={() => deleteHistory(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Side Panel Settings */}
        <div className="hidden lg:block lg:col-span-4 h-full">
          <div className="sticky top-6">
            <PomodoroSettingsPanel />
          </div>
        </div>

        {/* Mobile Settings Bottom Sheet */}
        {showSettingsSheet && (
          <div className="lg:hidden fixed inset-0 z-50 flex justify-center items-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettingsSheet(false)} />
            <div className="w-full max-h-[85vh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl relative flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="shrink-0 flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full" />
              </div>
              <div className="shrink-0 px-6 pb-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500" /> Settings
                </h2>
                <button onClick={() => setShowSettingsSheet(false)} className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Done</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                <PomodoroSettingsPanel />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}`;
  
  code = headerCode + newRender + '\n}\n';
  fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
}
