const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

const oldPreset = `  const selectPreset = (name: "pomodoro" | "long" | "deep" | "quick" | "custom") => {
    if (!settings) return;
    let focus = 25, short = 5, long = 15;
    if (name === "long") { focus = 50; short = 10; long = 20; }
    else if (name === "deep") { focus = 90; short = 20; long = 30; }
    else if (name === "quick") { focus = 15; short = 3; long = 10; }
    else if (name === "custom") { focus = settings.focusDuration; short = settings.shortBreakDuration; long = settings.longBreakDuration; }`;

const newPreset = `  const selectPreset = (name: string) => {
    if (!settings) return;
    let focus = 25, short = 5, long = 15;
    if (name === "50/10") { focus = 50; short = 10; long = 20; }
    else if (name === "60/15") { focus = 60; short = 15; long = 20; }
    else if (name === "90/20") { focus = 90; short = 20; long = 30; }
    else if (name === "custom") { focus = settings.focusDuration; short = settings.shortBreakDuration; long = settings.longBreakDuration; }
    else {
      // Find custom preset
      const customPreset = settings.customPresets?.find(p => p.id === name);
      if (customPreset) {
        focus = customPreset.focusDuration;
        short = customPreset.shortBreakDuration;
        long = customPreset.longBreakDuration;
      }
    }`;

code = code.replace(oldPreset, newPreset);
fs.writeFileSync('src/components/PomodoroContext.tsx', code);
