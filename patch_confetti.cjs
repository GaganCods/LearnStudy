const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

const oldCode = `    if (isFocus) {
      if (currentSettings.skipBreaks) {
        nextMode = "focus";
        nextIndex = nextIndex >= currentSettings.sessionsBeforeLongBreak ? 1 : nextIndex + 1;
      } else {
        if (nextIndex >= currentSettings.sessionsBeforeLongBreak) {
          nextMode = "longBreak";
          nextIndex = 1;
        } else {
          nextMode = "shortBreak";
          nextIndex = nextIndex + 1;
        }
      }
    }`;

const newCode = `    if (isFocus) {
      if (currentSettings.skipBreaks) {
        nextMode = "focus";
        nextIndex = nextIndex >= currentSettings.sessionsBeforeLongBreak ? 1 : nextIndex + 1;
      } else {
        if (nextIndex >= currentSettings.sessionsBeforeLongBreak) {
          nextMode = "longBreak";
          nextIndex = 1;
          import("canvas-confetti").then((confetti) => {
            confetti.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          });
        } else {
          nextMode = "shortBreak";
          nextIndex = nextIndex + 1;
        }
      }
    }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/PomodoroContext.tsx', code);
