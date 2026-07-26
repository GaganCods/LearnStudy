const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

// Add import
if (!code.includes('PomodoroSettingsPanel')) {
  code = code.replace(
    'import { usePomodoro } from "./PomodoroContext";',
    'import { usePomodoro } from "./PomodoroContext";\nimport { PomodoroSettingsPanel } from "./PomodoroSettingsPanel";'
  );
}

// Replace the old settings panel
const startSettings = `{activeSubTab === "settings" && (`;
const endSettings = `      {/* Empty State History */}`;
let idxStart = code.indexOf(startSettings);

if (idxStart !== -1) {
  // Find the end of settings panel by searching for the start of history empty state or just slicing
  let replaceSegment = `      {activeSubTab === "settings" && (
        <PomodoroSettingsPanel />
      )}`;
  
  // We need to cut out the huge old settings block
  // Let's just use regex to replace between `{activeSubTab === "settings" && (` and the end of its block.
  // The block ends right before `{activeSubTab === "history" && (`.
  let historyStart = code.indexOf('{activeSubTab === "history" && (');
  if (historyStart !== -1) {
    let beforeSettings = code.substring(0, idxStart);
    let afterSettings = code.substring(historyStart);
    code = beforeSettings + replaceSegment + '\n\n      ' + afterSettings;
  }
}

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
