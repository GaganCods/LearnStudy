const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

// I will just parse the layout string I wrote
// The render looks like:
/*
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 select-none" id="pomodoro-engine-dashboard">
      ... header ...
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-12 space-y-6 max-w-4xl mx-auto w-full">
           ... tabs ...
           ... timer ...
           ... stats ...
           ... history ...
        </div>
      ...
*/
// The problem might be the grid closing tag was removed when I stripped the side panel.

let gridStart = code.indexOf('<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">');
let innerGridStart = code.indexOf('<div className="lg:col-span-12 space-y-6 max-w-4xl mx-auto w-full">');
let smartSnooze = code.indexOf('{/* Smart Snooze Overlay */}');

if (gridStart !== -1 && innerGridStart !== -1 && smartSnooze !== -1) {
  let gridContentEnd = code.substring(0, smartSnooze);
  // add the closing tags that I removed
  code = gridContentEnd + '        </div>\n      </div>\n\n      ' + code.substring(smartSnooze);
  fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
} else {
  console.log("Could not find blocks");
}

