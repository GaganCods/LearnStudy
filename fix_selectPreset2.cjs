const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

code = code.replace(
  'const updatedSettings = {\\n      ...settings,\\n      focusDuration: focus,\\n      shortBreakDuration: short,\\n      longBreakDuration: long,\\n      selectedPresetId: name,\\n    };',
  `    const updatedSettings = {
      ...settings,
      focusDuration: focus,
      shortBreakDuration: short,
      longBreakDuration: long,
      selectedPresetId: name,
    };`
);

fs.writeFileSync('src/components/PomodoroContext.tsx', code);
