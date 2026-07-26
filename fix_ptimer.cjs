const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

// I'll manually find the start of the duplicate blocks or just replace everything from "return (" to the end with a clean version.

// Wait, let's just find and remove the duplicate blocks.
let firstHistoryIdx = code.indexOf('{activeSubTab === "history" && (');
let secondHistoryIdx = code.indexOf('{activeSubTab === "history" && (', firstHistoryIdx + 1);

if (secondHistoryIdx !== -1) {
  // It seems my previous replace just inserted the new block but didn't remove the old block properly, or there are multiple history tabs.
  console.log("Found duplicate history block at", secondHistoryIdx);
}

// Let's replace everything after the tabs rendering with a clean switch.
const renderStart = code.indexOf('{/* TIMER VIEW */}');
if (renderStart !== -1) {
  code = code.substring(0, renderStart);
}
