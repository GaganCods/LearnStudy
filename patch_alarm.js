const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroContext.tsx', 'utf8');

const oldPlayAlert = `  const playAlert = (type: string) => {
    if (!settings) return;
    playPomodoroSound(type, settings.volume);
  };`;

const newAlarmLogic = `
  const stopAlarm = () => {
    if (alarmRef.current) clearInterval(alarmRef.current);
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    alarmRef.current = null;
    alarmTimeoutRef.current = null;
    setIsAlarmRinging(false);
  };

  const triggerAlarm = (isFocus: boolean) => {
    if (!settings) return;
    stopAlarm();
    
    if (settings.voiceReminders) {
      import("../utils/pomodoroSounds").then(({ speakVoiceReminder }) => {
        speakVoiceReminder(isFocus ? "Study session completed." : "Break is over. Time to focus.");
      });
    }

    import("../utils/pomodoroSounds").then(({ playPomodoroSound }) => {
      playPomodoroSound(settings.notificationSound, settings.volume);
      
      if (settings.loopAlarm !== "off" && settings.loopAlarm !== "once") {
        setIsAlarmRinging(true);
        let intervalSecs = settings.loopInterval || 5;
        if (settings.loopAlarm === "until_stopped") intervalSecs = 5;
        
        alarmRef.current = setInterval(() => {
          playPomodoroSound(settings.notificationSound, settings.volume);
          if (settings.enableVibration) triggerVibration();
        }, intervalSecs * 1000);
        
        let maxDur = settings.maxRepeatDuration || 30;
        if (settings.autoStopAlarm === 30) maxDur = 30;
        else if (settings.autoStopAlarm === 60) maxDur = 60;
        
        if (settings.autoStopAlarm !== "never" && settings.autoStopAlarm !== "one_ring") {
          alarmTimeoutRef.current = setTimeout(() => {
            stopAlarm();
          }, maxDur * 1000);
        }
      } else if (settings.loopAlarm === "once" || settings.autoStopAlarm === "one_ring") {
        // Just plays once, no interval needed
      }
    });
  };
`;

code = code.replace(oldPlayAlert, newAlarmLogic);
fs.writeFileSync('src/components/PomodoroContext.tsx', code);
