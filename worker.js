let timerId = null;
let totalSeconds = 0;
let isRunning = false;
let gamePhase = 'pre-game'; // 'pre-game' or 'main-game'
let leadTimes = {};
let voiceoverSettings = {};
let announcementSchedule = [];

/**
 * Generates a schedule of upcoming announcements.
 * This function calculates the exact second each event should be announced
 * and what sounds to play, respecting event priority.
 */
function generateSchedule() {
    const scheduleHorizon = totalSeconds + 3 * 60; // Look ahead 3 minutes
    const events = [
        { interval: 7, lead: leadTimes[7], voice: 'exp_rune', sound: 'special', setting: voiceoverSettings.exp_rune },
        { interval: 3, lead: leadTimes[3], voice: 'lotus', sound: 'ding3', setting: voiceoverSettings.lotus },
        { interval: 2, lead: leadTimes[2], voice: 'raver_rune', sound: 'ding2', setting: voiceoverSettings.raver_rune },
        { interval: 1, lead: leadTimes[1], voice: 'jungle', sound: 'ding1', setting: voiceoverSettings.jungle },
    ];

    const scheduledMinutes = {}; // Key: minute, Value: highest priority event for that minute

    // Determine the highest priority event for each upcoming minute
    const startMinute = Math.floor(totalSeconds / 60) + 1;
    const endMinute = Math.floor(scheduleHorizon / 60);

    for (let minute = startMinute; minute <= endMinute; minute++) {
        for (const event of events) {
            if (minute > 0 && minute % event.interval === 0) {
                scheduledMinutes[minute] = event; // The first event found is the highest priority
                break;
            }
        }
    }

    // Now, build the final schedule from the prioritized minutes
    const newSchedule = [];
    for (const minute in scheduledMinutes) {
        const event = scheduledMinutes[minute];
        const eventTimeInSeconds = minute * 60;
        const announceTime = eventTimeInSeconds - event.lead;

        const soundsToPlay = [event.sound];
        if (event.setting) soundsToPlay.push(event.voice);
        
        newSchedule.push({ announceTime, sounds: soundsToPlay });
    }

    announcementSchedule = newSchedule
        .sort((a, b) => a.announceTime - b.announceTime);
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

        // Safeguard: Discard any scheduled announcements that have been missed due to time jumps.
        while (announcementSchedule.length > 0 && totalSeconds > announcementSchedule[0].announceTime) {
            announcementSchedule.shift();
        }

        // If the schedule is running low, or we just cleared it, regenerate.
        if (announcementSchedule.length < 3) {
            generateSchedule();
        }

        // Now, check if the (now guaranteed to be correct) next event should be announced.
        if (announcementSchedule.length > 0 && totalSeconds === announcementSchedule[0].announceTime) {
            self.postMessage({ type: 'audio', sounds: announcementSchedule[0].sounds });
            announcementSchedule.shift(); // Remove the event we just announced.
        }
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
            generateSchedule(); // Generate the initial schedule

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
                if (gamePhase === 'main-game') generateSchedule(); // Regenerate schedule if time is changed while paused
                // When paused, simply update the time display without any side effects.
                self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            }
            break;

        case 'set_phase':
            gamePhase = data.phase;
            if (gamePhase === 'main-game') generateSchedule();
            // When phase is set manually, time is already set by main thread.
            // We just need to acknowledge the phase.
            break;

        case 'adjust_time':
            totalSeconds += data.seconds;
             // Prevent main game time from going below 0, but allow pre-game time to be negative
            if (gamePhase === 'main-game' && totalSeconds < 0) {
                totalSeconds = 0;
            }
            if (gamePhase === 'main-game') generateSchedule(); // Time was adjusted, schedule might be off
            self.postMessage({ type: 'time', totalSeconds, workerIsRunning: isRunning });
            break;
    }
};
