let timerInterval = null;
let totalSeconds = 0;

const tick = () => {
    // Play sound cues at specific pre-game times
    if (totalSeconds === -10) {
        postMessage({ type: 'play_sound', soundKey: 'ding0' });
    }
    // At 0 seconds, it's the game start horn and the phase transition.
    if (totalSeconds === 0) {
        // Post the phase change message exactly when time hits 0.
        postMessage({ type: 'phase_change', newPhase: 'main-game' });
        // Also play the sound cue.
        postMessage({ type: 'play_sound', soundKey: 'ding0' });
    }

    // Post time update for UI
    postMessage({ type: 'time', totalSeconds: totalSeconds });
    // Increment time for the next tick
    totalSeconds++;
};

const startTimer = () => {
    if (timerInterval) return; // Already running
    tick(); // Execute the first tick immediately
    timerInterval = setInterval(tick, 1000); // Set interval for subsequent ticks
};

const pauseTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
};

const resetTimer = () => {
    pauseTimer();
    totalSeconds = 0;
    postMessage({ type: 'time', totalSeconds: 0 });
};

// --- Worker Event Listener ---

self.onmessage = (e) => {
    const { command, data } = e.data;

    switch (command) {
        case 'start_or_resume':
            startTimer();
            break;

        case 'pause':
            pauseTimer();
            break;

        case 'reset':
            resetTimer();
            break;

        case 'set_time':
            if (!timerInterval) { // Only allow setting time when paused
                const oldPhase = (totalSeconds < 0) ? 'pre-game' : 'main-game';

                totalSeconds = data.timeOffset;

                const newPhase = (totalSeconds < 0) ? 'pre-game' : 'main-game';

                // If setting the time caused a phase change (e.g., from -90 to 0)
                if (newPhase !== oldPhase) {
                    postMessage({ type: 'phase_change', newPhase: newPhase });
                }
                postMessage({ type: 'time', totalSeconds: totalSeconds });
            }
            break;

        case 'adjust_time':
            const oldPhase = (totalSeconds < 0) ? 'pre-game' : 'main-game';

            totalSeconds += data.seconds;

            const newPhase = (totalSeconds < 0) ? 'pre-game' : 'main-game';

            // If the time adjustment caused a phase change (e.g., from -1 to 0, or 0 to -1)
            if (newPhase !== oldPhase) {
                postMessage({ type: 'phase_change', newPhase: newPhase });
            }

            postMessage({ type: 'time', totalSeconds: totalSeconds });
            break;
    }
};
