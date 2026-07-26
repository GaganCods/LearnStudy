const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

code = code.replace(
  /const updatedSettings = {\n      \.\.\.settings,\n      focusDuration: focus,\n      shortBreakDuration: short,\n      longBreakDuration: long,\n    };/,
  'const updatedSettings = {\\n      ...settings,\\n      focusDuration: focus,\\n      shortBreakDuration: short,\\n      longBreakDuration: long,\\n      selectedPresetId: name,\\n    };'
);

fs.writeFileSync('src/components/PomodoroContext.tsx', code);
