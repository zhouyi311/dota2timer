let timerId = null;
let totalSeconds = 0;
let isRunning = false;
let hasBeenStarted = false; // True if the timer has ever been started from a set time
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
    totalSeconds++;
    self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
    checkAndAnnounce();
}

// --- Worker Event Listener ---

self.onmessage = function(e) {
    const { command, data } = e.data;

    switch (command) {
        case 'start_or_resume':
            leadTimes = data.leadTimes;
            voiceoverSettings = data.voiceoverSettings;

            if (!hasBeenStarted) {
                // This is a fresh start from calibration time
                totalSeconds = data.timeOffset || 0;
                hasBeenStarted = true;
            }

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
            // If timer is running, just update the time and continue.
            if (isRunning) {
                totalSeconds = data.timeOffset;
            } else {
                // If timer is stopped, reset everything.
                totalSeconds = data.timeOffset;
                hasBeenStarted = false; // A new time set means the next start is a fresh one
                if (timerId) clearInterval(timerId);
                timerId = null;
                self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            }
            break;

        case 'adjust_time':
            totalSeconds += data.seconds;
            if (totalSeconds < 0) totalSeconds = 0;
            // Post back the new time immediately for UI update
            self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            break;
    }
};