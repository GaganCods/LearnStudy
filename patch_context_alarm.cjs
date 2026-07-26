const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

// Add to interface
code = code.replace(
  '  setActiveVideoInfo: (info: { playlistTitle?: string; lectureTitle?: string } | null) => void;\n}',
  '  setActiveVideoInfo: (info: { playlistTitle?: string; lectureTitle?: string } | null) => void;\n  isAlarmRinging: boolean;\n  stopAlarm: () => void;\n  snoozeAlarm: (mins: number) => void;\n}'
);

const snoozeLogic = `
  const snoozeAlarm = (mins: number) => {
    stopAlarm();
    if (!activeState) return;
    const newState = {
      ...activeState,
      isPaused: false,
      remainingMs: activeState.remainingMs + (mins * 60 * 1000),
      lastTimestamp: Date.now()
    };
    setActiveState(newState);
    endTimeRef.current = Date.now() + newState.remainingMs;
  };
`;

code = code.replace(
  '  const stopAlarm = () => {',
  snoozeLogic + '\n  const stopAlarm = () => {'
);

code = code.replace(
  '    exportHistory,\n    activeVideoInfo,\n    setActiveVideoInfo\n  };',
  '    exportHistory,\n    activeVideoInfo,\n    setActiveVideoInfo,\n    isAlarmRinging,\n    stopAlarm,\n    snoozeAlarm\n  };'
);

fs.writeFileSync('src/components/PomodoroContext.tsx', code);
