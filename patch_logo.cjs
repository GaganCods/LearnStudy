const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<img src="/favicon.svg" alt="LearnStudy" className="w-8 h-8 object-contain shrink-0" referrerPolicy="no-referrer" />\n              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">\n                LearnStudy\n              </span>',
  `<img src="/favicon.svg" alt="LearnStudy" className="w-6 h-6 object-contain shrink-0" referrerPolicy="no-referrer" />
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Learn<span className="text-blue-600 dark:text-blue-500">Study</span>
              </span>`
);

code = code.replace(
  '<img src="/favicon.svg" alt="LearnStudy" className="w-7 h-7 object-contain shrink-0" referrerPolicy="no-referrer" />\n                <span className="font-extrabold text-lg text-slate-900 dark:text-white">LearnStudy</span>',
  `<img src="/favicon.svg" alt="LearnStudy" className="w-5 h-5 object-contain shrink-0" referrerPolicy="no-referrer" />
                <span className="font-extrabold text-lg text-slate-900 dark:text-white">Learn<span className="text-blue-600 dark:text-blue-500">Study</span></span>`
);

fs.writeFileSync('src/App.tsx', code);
