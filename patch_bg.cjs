const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

const effectPatch = `
  // Background sound effect
  useEffect(() => {
    if (activeState && !activeState.isPaused && activeState.mode !== "focus") {
      if (settings && settings.backgroundSound && settings.backgroundSound !== "none") {
        import("../utils/pomodoroSounds").then(({ startBackgroundSound }) => {
          startBackgroundSound(settings.backgroundSound, settings.backgroundVolume);
        });
      }
    } else {
      import("../utils/pomodoroSounds").then(({ stopBackgroundSound }) => {
        stopBackgroundSound();
      });
    }
  }, [activeState?.isPaused, activeState?.mode, settings?.backgroundSound, settings?.backgroundVolume]);
`;

code = code.replace(/(\/\/ References for the timestamp countdown)/, effectPatch + '\n  $1');
fs.writeFileSync('src/components/PomodoroContext.tsx', code);
