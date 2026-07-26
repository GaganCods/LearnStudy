const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroSettingsPanel.tsx', 'utf8');

code = code.replace(
  'updateSettings({ selectedPresetId: p.id });\\n                selectPreset(p.id);',
  'selectPreset(p.id);'
);
code = code.replace(
  'updateSettings({ selectedPresetId: p.id });\n                selectPreset(p.id);',
  'selectPreset(p.id);'
);

fs.writeFileSync('src/components/PomodoroSettingsPanel.tsx', code);
