document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const preGameBtn = document.getElementById('preGameBtn');
    const mainGameBtn = document.getElementById('mainGameBtn');
    const currentMinutesInput = document.getElementById('currentMinutes');
    const currentSecondsInput = document.getElementById('currentSeconds');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    const leadTime1Input = document.getElementById('leadTime1');
    const leadTime2Input = document.getElementById('leadTime2');
    const leadTime3Input = document.getElementById('leadTime3');
    const leadTime7Input = document.getElementById('leadTime7');
    
    const toggleJungle = document.getElementById('toggleJungle');
    const toggleRaverRune = document.getElementById('toggleRaverRune');
    const toggleLotus = document.getElementById('toggleLotus');
    const toggleExpRune = document.getElementById('toggleExpRune');
    
    const adjustTimePlusBtn = document.getElementById('adjustTimePlus');
    const adjustTimeMinusBtn = document.getElementById('adjustTimeMinus');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const timeInputs = [currentMinutesInput, currentSecondsInput];

    // Audio Elements
    const audioObjects = {
        ding1: new Audio('audio/ding1.mp3'),
        ding2: new Audio('audio/ding2.mp3'),
        ding3: new Audio('audio/ding3.mp3'),
        special: new Audio('audio/special.mp3'),
        jungle: new Audio('audio/1-jungle.mp3'),
        raver_rune: new Audio('audio/2-power-rune.mp3'),
        lotus: new Audio('audio/3-lotus.mp3'),
        exp_rune: new Audio('audio/7-wisdom-rune.mp3'),
    };

    let worker;
    let isRunning = false;
    let currentPhase = 'pre-game';
    let audioUnlocked = false;
    let audioQueue = [];
    let isPlayingAudio = false;

    // --- Audio Queue ---
    const playNextInQueue = () => {
        if (audioQueue.length === 0) { isPlayingAudio = false; return; }
        isPlayingAudio = true;
        const soundName = audioQueue.shift();
        const audio = audioObjects[soundName];
        if (!audio) { playNextInQueue(); return; }
        audio.onended = () => playNextInQueue();
        audio.onerror = (e) => { console.error(`Error playing ${soundName}`, e); playNextInQueue(); };
        audio.play().catch(e => { console.error(`Playback of ${soundName} was prevented.`, e); playNextInQueue(); });
    };
    const addToQueue = (soundName) => {
        audioQueue.push(soundName);
        if (!isPlayingAudio) playNextInQueue();
    };

    // --- Getters & Setters ---
    const getLeadTimes = () => ({
        1: parseInt(leadTime1Input.value, 10), 2: parseInt(leadTime2Input.value, 10),
        3: parseInt(leadTime3Input.value, 10), 7: parseInt(leadTime7Input.value, 10),
    });
    const getVoiceoverSettings = () => ({
        jungle: toggleJungle.checked, raver_rune: toggleRaverRune.checked,
        lotus: toggleLotus.checked, exp_rune: toggleExpRune.checked,
    });

    // --- Local Storage ---
    const saveLeadTimes = () => localStorage.setItem('leadTimes', JSON.stringify(getLeadTimes()));
    const saveVoiceoverSettings = () => localStorage.setItem('voiceoverSettings', JSON.stringify(getVoiceoverSettings()));
    const saveVolume = () => {
        const volume = volumeSlider.value;
        localStorage.setItem('dotaTimerVolume', volume);
        setVolume(volume);
    };
    const loadSettings = () => {
        const savedLeadTimes = localStorage.getItem('leadTimes');
        if (savedLeadTimes) {
            const leadTimes = JSON.parse(savedLeadTimes);
            leadTime1Input.value = leadTimes[1] || 10; leadTime2Input.value = leadTimes[2] || 10;
            leadTime3Input.value = leadTimes[3] || 10; leadTime7Input.value = leadTimes[7] || 15;
        }
        const savedVoiceovers = localStorage.getItem('voiceoverSettings');
        if (savedVoiceovers) {
            const vs = JSON.parse(savedVoiceovers);
            toggleJungle.checked = vs.jungle !== false; toggleRaverRune.checked = vs.raver_rune !== false;
            toggleLotus.checked = vs.lotus !== false; toggleExpRune.checked = vs.exp_rune !== false;
        }
        const savedVolume = localStorage.getItem('dotaTimerVolume') || "0.6";
        volumeSlider.value = savedVolume;
        volumeValue.textContent = savedVolume;
        setVolume(savedVolume);
    };

    const setVolume = (volume) => Object.values(audioObjects).forEach(audio => audio.volume = volume);

    // --- Worker Communication ---
    const initializeWorker = () => {
        if (worker) return;
        try {
            worker = new Worker('worker.js');
            worker.onmessage = (e) => {
                const { type, sounds, totalSeconds, newPhase } = e.data;
                if (type === 'audio' && sounds) sounds.forEach(addToQueue);
                else if (type === 'time') updateDisplayTime(totalSeconds);
                else if (type === 'phase_change' && newPhase) switchPhase(newPhase, false); // Crucially, false here
            };
            worker.onerror = (err) => { console.error('Worker error:', err); worker = null; updateUIState(false); };
        } catch (e) {
            console.error('Failed to initialize worker:', e);
            alert("Failed to start timer. Web Workers may be blocked by your browser.");
        }
    };

    const updateDisplayTime = (totalSeconds) => {
        const displaySeconds = Math.abs(totalSeconds);
        const minutes = Math.floor(displaySeconds / 60);
        const seconds = displaySeconds % 60;
        if (document.activeElement !== currentMinutesInput && document.activeElement !== currentSecondsInput) {
            currentMinutesInput.value = String(minutes).padStart(2, '0');
            currentSecondsInput.value = String(seconds).padStart(2, '0');
        }
    };

    const updateUIState = (running, isEditing = false) => {
        isRunning = running;
        startBtn.disabled = isRunning;
        pauseBtn.disabled = !isRunning;
        
        // Determine the correct paused class based on the current stage
        const pausedClass = currentPhase === 'pre-game' ? 'pre-game-paused' : 'paused';

        timeInputs.forEach(input => {
            input.classList.remove('running', 'paused', 'pre-game-color', 'pre-game-edit', 'pre-game-paused');
            if (isEditing && currentPhase === 'pre-game') {
                input.classList.add('pre-game-edit');
                return;
            }

            if (currentPhase === 'pre-game') { // Strategy Stage
                input.classList.add(isRunning ? 'pre-game-color' : pausedClass);
            } else { // main-game
                input.classList.add(isRunning ? 'running' : pausedClass);
            }
        });
    };

    const switchPhase = (newPhase, notifyWorker = true) => {
        currentPhase = newPhase;
        
        if (currentPhase === 'pre-game') {
            preGameBtn.classList.add('active');
            mainGameBtn.classList.remove('active');
            
            let minutes = parseInt(currentMinutesInput.value, 10) || 0;
            let seconds = parseInt(currentSecondsInput.value, 10) || 0;
            const totalSec = minutes * 60 + seconds;

            if (totalSec > 90 || totalSec <= 0) {
                currentMinutesInput.value = "01";
                currentSecondsInput.value = "30";
            }
        } else { // 'main-game'
            mainGameBtn.classList.add('active');
            preGameBtn.classList.remove('active');
            currentMinutesInput.value = "00";
            currentSecondsInput.value = "00";
        }
        
        // If the switch is manual (user click), pause the timer and update time from inputs.
        if (notifyWorker) {
            if (isRunning) handlePause();
            updateTimeFromInputs();
        } else { // If the switch is automatic (from worker), just update the UI state.
            updateUIState(isRunning);
        }

        if (worker && notifyWorker) {
            worker.postMessage({ command: 'set_phase', data: { phase: currentPhase } });
        }
    };

    // --- Event Handlers ---
    const handleStart = () => {
        if (!audioUnlocked) {
            const silentSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
            silentSound.play().catch(e => console.warn("Audio unlock failed.", e));
            audioUnlocked = true;
        }
        
        // Get current time to check for the special case
        const minutes = parseInt(currentMinutesInput.value, 10) || 0;
        const seconds = parseInt(currentSecondsInput.value, 10) || 0;

        // BUG FIX: If starting at 0:00 in Strategy Stage, switch to Gameplay Stage immediately.
        if (currentPhase === 'pre-game' && minutes === 0 && seconds === 0) {
            switchPhase('main-game'); // This handles UI, sets worker phase, and sets time to 0.
            addToQueue('ding1');      // Manually trigger the transition sound.
        }

        updateTimeFromInputs(); // Sync time before starting
        worker.postMessage({
            command: 'start_or_resume',
            data: { leadTimes: getLeadTimes(), voiceoverSettings: getVoiceoverSettings() }
        });
        updateUIState(true);
    };

    const handlePause = () => {
        if (!worker) return;
        worker.postMessage({ command: 'pause' });
        updateUIState(false);
    };
    
    const updateTimeFromInputs = () => {
        // More robust validation: treat any non-number as 0.
        let minutes = parseInt(currentMinutesInput.value, 10) || 0;
        let seconds = parseInt(currentSecondsInput.value, 10) || 0;
        
        currentMinutesInput.value = String(minutes).padStart(2, '0');
        currentSecondsInput.value = String(seconds).padStart(2, '0');
        
        let timeOffset = minutes * 60 + seconds;
        if (currentPhase === 'pre-game') timeOffset = -timeOffset;
        
        if (worker) {
            worker.postMessage({ command: 'set_time', data: { timeOffset } });
        } else {
            updateDisplayTime(timeOffset);
        }
        if (!isRunning) {
            updateUIState(false);
        }
    };

    // --- Initialization ---
    const init = () => {
        loadSettings();
        initializeWorker();
        
        startBtn.addEventListener('click', handleStart);
        pauseBtn.addEventListener('click', handlePause);
        preGameBtn.addEventListener('click', () => switchPhase('pre-game'));
        mainGameBtn.addEventListener('click', () => switchPhase('main-game'));

        timeInputs.forEach(input => {
            input.addEventListener('focus', () => { 
                if (isRunning) handlePause();
                updateUIState(false, true); // Enter editing mode
            });
            input.addEventListener('blur', updateTimeFromInputs);
        });

        [leadTime1Input, leadTime2Input, leadTime3Input, leadTime7Input].forEach(i => i.addEventListener('change', saveLeadTimes));
        [toggleJungle, toggleRaverRune, toggleLotus, toggleExpRune].forEach(t => t.addEventListener('change', saveVoiceoverSettings));
        
        volumeSlider.addEventListener('input', (e) => {
            const newVolume = e.target.value;
            volumeValue.textContent = newVolume;
            setVolume(newVolume);
        });
        volumeSlider.addEventListener('change', saveVolume); // Save only when user releases slider

        adjustTimePlusBtn.addEventListener('click', () => worker.postMessage({ command: 'adjust_time', data: { seconds: 1 } }));
        adjustTimeMinusBtn.addEventListener('click', () => worker.postMessage({ command: 'adjust_time', data: { seconds: -1 } }));

        const setTimeZero = document.getElementById('setTimeZero');
        const setTimeNinety = document.getElementById('setTimeNinety');

        setTimeZero.addEventListener('click', () => {
            currentMinutesInput.value = "00";
            currentSecondsInput.value = "00";
            updateTimeFromInputs();
        });

        setTimeNinety.addEventListener('click', () => {
            currentMinutesInput.value = "01";
            currentSecondsInput.value = "30";
            updateTimeFromInputs();
        });

        // Default to main game as requested
        switchPhase('main-game', false);
        
        if (worker) {
            // Wait a moment for worker to be ready before setting phase
            setTimeout(() => {
                worker.postMessage({ command: 'set_phase', data: { phase: 'main-game' } });
                updateTimeFromInputs(); // Ensure time is set to 0
            }, 100);
        }
    };

    init();
});
