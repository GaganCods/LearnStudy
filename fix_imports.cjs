const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

code = code.replace(/import \{ Clock, /g, 'import { ');

// add Clock to lucide-react import
code = code.replace('import { \n  Play', 'import { Clock, \n  Play');

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
