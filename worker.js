let timerInterval = null;
let totalSeconds = 0;
let currentPhase = 'main-game';

const startTimer = () => {
    if (timerInterval) return; // Already running

    timerInterval = setInterval(() => {
        // Handle phase transition from pre-game to main-game
        if (currentPhase === 'pre-game' && totalSeconds >= 0) {
            // Switch to main game phase automatically
            currentPhase = 'main-game';
            totalSeconds = 0; // Reset to 0 for main game start
            postMessage({ type: 'phase_change', newPhase: 'main-game' });
            postMessage({ type: 'time', totalSeconds: 0 }); // Explicitly post time=0
        }

        // Post time update for UI
        postMessage({ type: 'time', totalSeconds: totalSeconds });
        // Increment time for the next tick
        totalSeconds++;
    }, 1000);
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
                totalSeconds = data.timeOffset;
                postMessage({ type: 'time', totalSeconds: totalSeconds });
            }
            break;

        case 'set_phase':
            currentPhase = data.phase;
            break;

        case 'adjust_time':
            totalSeconds += data.seconds;
            postMessage({ type: 'time', totalSeconds: totalSeconds });
            break;
    }
};
