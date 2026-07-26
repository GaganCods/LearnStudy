const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroTimer.tsx', 'utf8');

code = code.replace(/        <\/div>\n\n                <\/div>\n      <\/div>/, '        </div>\n      </div>');

fs.writeFileSync('src/components/PomodoroTimer.tsx', code);
