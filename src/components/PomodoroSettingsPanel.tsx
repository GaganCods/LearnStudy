import React, { useState } from "react";
import { usePomodoro } from "./PomodoroContext";
import { 
  Bell, Volume2, Repeat, AlarmClock, Music, MonitorPlay, Save, CheckCircle2, Play
} from "lucide-react";

export function PomodoroSettingsPanel() {
  const { settings, updateSettings, selectPreset } = usePomodoro();
  const [testSoundId, setTestSoundId] = useState<string | null>(null);

  const presets = [
    { id: "25/5", label: "25 / 5 (Classic)" },
    { id: "50/10", label: "50 / 10" },
    { id: "60/15", label: "60 / 15" },
    { id: "90/20", label: "90 / 20" },
    { id: "custom", label: "Custom Mode" },
    ...(settings.customPresets || []).map(p => ({ id: p.id, label: p.name }))
  ];

  const alarmSounds = [
    { id: "soft_bell", label: "Soft Bell" },
    { id: "school_bell", label: "School Bell" },
    { id: "digital_beep", label: "Digital Beep" },
    { id: "piano", label: "Piano" },
    { id: "nature", label: "Nature" },
    { id: "chime", label: "Chime" },
    { id: "rain", label: "Rain" },
    { id: "forest", label: "Forest" },
    { id: "notification_tone", label: "Notification Tone" }
  ];

  const backgroundSounds = [
    { id: "none", label: "Silent" },
    { id: "white_noise", label: "White Noise" },
    { id: "rain", label: "Rain" },
    { id: "forest", label: "Forest Sounds" },
    { id: "ocean", label: "Ocean Waves" },
    { id: "cafe", label: "Cafe Ambience" }
  ];

  const testSound = (soundId: string) => {
    setTestSoundId(soundId);
    import("../utils/pomodoroSounds").then(({ playPomodoroSound }) => {
      playPomodoroSound(soundId, settings.volume);
      setTimeout(() => setTestSoundId(null), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      
      {/* Presets */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2">
          Timer Presets
        </h3>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => {
                selectPreset(p.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                settings.selectedPresetId === p.id 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {settings.selectedPresetId === p.id && <CheckCircle2 className="w-3.5 h-3.5" />}
              {p.label}
            </button>
          ))}
        </div>

        {settings.selectedPresetId === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                <span>Focus Duration</span>
                <span className="text-indigo-600 dark:text-indigo-400">{settings.focusDuration} mins</span>
              </label>
              <input
                type="range" min={5} max={180} step={5}
                value={settings.focusDuration}
                onChange={(e) => updateSettings({ focusDuration: parseInt(e.target.value) })}
                className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                <span>Short Break</span>
                <span className="text-emerald-600 dark:text-emerald-400">{settings.shortBreakDuration} mins</span>
              </label>
              <input
                type="range" min={1} max={30} step={1}
                value={settings.shortBreakDuration}
                onChange={(e) => updateSettings({ shortBreakDuration: parseInt(e.target.value) })}
                className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                <span>Long Break</span>
                <span className="text-blue-600 dark:text-blue-400">{settings.longBreakDuration} mins</span>
              </label>
              <input
                type="range" min={5} max={60} step={5}
                value={settings.longBreakDuration}
                onChange={(e) => updateSettings({ longBreakDuration: parseInt(e.target.value) })}
                className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                <span>Sessions Before Long Break</span>
                <span className="text-orange-600 dark:text-orange-400">{settings.sessionsBeforeLongBreak}</span>
              </label>
              <input
                type="range" min={1} max={10} step={1}
                value={settings.sessionsBeforeLongBreak}
                onChange={(e) => updateSettings({ sessionsBeforeLongBreak: parseInt(e.target.value) })}
                className="w-full mt-1.5 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alarm Settings */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Alarm Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 block">Alarm Sound</label>
              <div className="grid grid-cols-2 gap-2">
                {alarmSounds.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => updateSettings({ notificationSound: sound.id })}
                    className={`text-left px-3 py-2 rounded-xl border text-xs font-bold flex justify-between items-center transition ${
                      settings.notificationSound === sound.id
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate pr-2">{sound.label}</span>
                    <div 
                      onClick={(e) => { e.stopPropagation(); testSound(sound.id); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        testSoundId === sound.id ? "bg-indigo-500 text-white" : "bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300"
                      } hover:bg-indigo-400 hover:text-white transition cursor-pointer`}
                    >
                      <Play className="w-3 h-3 ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                <span>Alarm Volume</span>
                <span className="text-slate-500">{settings.volume}%</span>
              </label>
              <div className="flex items-center gap-3 mt-1.5">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <input
                  type="range" min={0} max={100}
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 block">Repeat Alarm</label>
              <select 
                value={settings.loopAlarm}
                onChange={(e) => updateSettings({ loopAlarm: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="off">Off (Play once)</option>
                <option value="once">Once (One ring)</option>
                <option value="until_stopped">Until Stopped</option>
                <option value="custom">Custom Interval</option>
              </select>

              {settings.loopAlarm === "custom" && (
                <div className="mt-2 flex items-center justify-between pl-2">
                  <span className="text-xs text-slate-500">Repeat Every:</span>
                  <select
                    value={settings.loopInterval}
                    onChange={(e) => updateSettings({ loopInterval: parseInt(e.target.value) })}
                    className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-200 focus:outline-none"
                  >
                    {[5, 10, 15, 20, 25, 30].map(sec => (
                      <option key={sec} value={sec}>{sec} sec</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {(settings.loopAlarm === "until_stopped" || settings.loopAlarm === "custom") && (
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 block">Maximum Duration</label>
                <select 
                  value={settings.autoStopAlarm}
                  onChange={(e) => updateSettings({ autoStopAlarm: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value={30}>30 sec</option>
                  <option value={60}>1 min</option>
                  <option value="never">Unlimited (Until stopped)</option>
                </select>
              </div>
            )}

          </div>
        </div>

        {/* Break & Behavior Settings */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
              <Music className="w-4 h-4" /> During Break
            </h3>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 block">Background Sound</label>
              <select 
                value={settings.backgroundSound}
                onChange={(e) => updateSettings({ backgroundSound: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
              >
                {backgroundSounds.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            {settings.backgroundSound !== "none" && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex justify-between">
                  <span>Background Volume</span>
                  <span className="text-slate-500">{settings.backgroundVolume}%</span>
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <input
                    type="range" min={0} max={100}
                    value={settings.backgroundVolume}
                    onChange={(e) => updateSettings({ backgroundVolume: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
              <MonitorPlay className="w-4 h-4" /> Automation & Notifications
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.autoStartNextFocus} 
                  onChange={(e) => updateSettings({ autoStartNextFocus: e.target.checked })} 
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${settings.autoStartNextFocus ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-700'}`}></div>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoStartNextFocus ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Auto-start next focus</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.autoStartBreaks} 
                  onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })} 
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${settings.autoStartBreaks ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-700'}`}></div>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.autoStartBreaks ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Auto-start breaks</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.voiceReminders} 
                  onChange={(e) => updateSettings({ voiceReminders: e.target.checked })} 
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${settings.voiceReminders ? 'bg-blue-500' : 'bg-slate-200 dark:bg-zinc-700'}`}></div>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.voiceReminders ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition block">Voice Reminders</span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">"Time to focus", "Break is over"</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.enableBrowserNotifications} 
                  onChange={(e) => {
                    if (e.target.checked && 'Notification' in window) {
                      Notification.requestPermission().then(perm => {
                        updateSettings({ enableBrowserNotifications: perm === 'granted' });
                      });
                    } else {
                      updateSettings({ enableBrowserNotifications: e.target.checked });
                    }
                  }} 
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${settings.enableBrowserNotifications ? 'bg-orange-500' : 'bg-slate-200 dark:bg-zinc-700'}`}></div>
                <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.enableBrowserNotifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition block">Desktop Notifications</span>
            </label>

          </div>
        </div>
      </div>
    </div>
  );
}
