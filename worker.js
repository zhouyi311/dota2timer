let timerId = null;
let totalSeconds = 0;
let isRunning = false;
let gamePhase = 'pre-game'; // 'pre-game' or 'main-game'
let leadTimes = {};
let voiceoverSettings = {};


/**
 * Checks for upcoming events and queues audio announcements.
 * Implements a priority system (7 > 3 > 2 > 1) to avoid multiple announcements at the same time.
 * Also ensures that no announcements are made for events happening at or before 0:00 game time.
 */
function checkAndAnnounce() {
    // This function is called every second. We need to find which event, if any, is being announced.
    const events = [
        { interval: 7, lead: leadTimes[7], voice: 'exp_rune', sound: 'special', setting: voiceoverSettings.exp_rune },
        { interval: 3, lead: leadTimes[3], voice: 'lotus', sound: 'ding3', setting: voiceoverSettings.lotus },
        { interval: 2, lead: leadTimes[2], voice: 'raver_rune', sound: 'ding2', setting: voiceoverSettings.raver_rune },
        { interval: 1, lead: leadTimes[1], voice: 'jungle', sound: 'ding1', setting: voiceoverSettings.jungle },
    ];

    let triggeredEvent = null;

    // Find the highest priority event that is being announced RIGHT NOW.
    for (const event of events) {
        const nextEventTime = Math.ceil((totalSeconds + 1) / (event.interval * 60)) * (event.interval * 60);
        const announceTime = nextEventTime - event.lead;

        if (totalSeconds === announceTime && nextEventTime > 0) {
            triggeredEvent = event;
            break; // Found the highest priority trigger
        }
    }

    if (triggeredEvent) {
        const soundsToPlay = [];
        const targetMinute = Math.ceil((totalSeconds + 1) / 60);

        // 1. Add the single, highest-priority base sound
        soundsToPlay.push(triggeredEvent.sound);

        // 2. Check ALL events to build the voiceover chain
        for (const event of events) {
            // If the target minute is a multiple of the interval and the voiceover is checked
            if (targetMinute % event.interval === 0 && event.setting) {
                soundsToPlay.push(event.voice);
            }
        }

        self.postMessage({ type: 'audio', sounds: soundsToPlay });
    }
}

/**
 * The main timer loop, executed every second.
 */
function tick() {
    if (gamePhase === 'pre-game') {
        // If time is 0 or positive while in pre-game, it's time to switch.
        // This check happens only when the timer is running.
        if (totalSeconds >= 0) {
            // Transition from pre-game to main-game
            gamePhase = 'main-game';
            totalSeconds = 0; // Ensure we start main-game at exactly 0
            self.postMessage({ type: 'phase_change', newPhase: 'main-game' });
            self.postMessage({ type: 'audio', sounds: ['ding1'] });
        }
        totalSeconds++; // Count up from negative, or from 0 if we just switched.
    } else { // 'main-game'
        totalSeconds++;
        checkAndAnnounce();
    }
    
    self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
}

// --- Worker Event Listener ---

self.onmessage = function(e) {
    const { command, data } = e.data;

    switch (command) {
        case 'start_or_resume':
            if (data.leadTimes) leadTimes = data.leadTimes;
            if (data.voiceoverSettings) voiceoverSettings = data.voiceoverSettings;

            if (!isRunning) {
                isRunning = true;
                if (timerId) clearInterval(timerId);
                self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
                timerId = setInterval(tick, 1000);
            }
            break;

        case 'pause':
            if (isRunning) {
                isRunning = false;
                clearInterval(timerId);
                timerId = null;
                self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            }
            break;

        case 'set_time':
            totalSeconds = data.timeOffset;
            if (!isRunning) {
                // When paused, simply update the time display without any side effects.
                self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            }
            break;

        case 'set_phase':
            gamePhase = data.phase;
            // When phase is set manually, time is already set by main thread.
            // We just need to acknowledge the phase.
            break;

        case 'adjust_time':
            totalSeconds += data.seconds;
             // Prevent main game time from going below 0, but allow pre-game time to be negative
            if (gamePhase === 'main-game' && totalSeconds < 0) {
                totalSeconds = 0;
            }
            self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            break;
    }
};
