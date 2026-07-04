document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    const setTimeBtn = document.getElementById('setTime');
    const leadTime1Input = document.getElementById('leadTime1');
    const leadTime2Input = document.getElementById('leadTime2');
    const leadTime3Input = document.getElementById('leadTime3');
    const leadTime7Input = document.getElementById('leadTime7');
    const startPauseBtn = document.getElementById('startPause');
    const currentTimeDisplay = document.getElementById('currentTime');
    const toggleJungle = document.getElementById('toggleJungle');
    const toggleRaverRune = document.getElementById('toggleRaverRune');
    const toggleLotus = document.getElementById('toggleLotus');
    const toggleExpRune = document.getElementById('toggleExpRune');
    const adjustTimePlusBtn = document.getElementById('adjustTimePlus');
    const adjustTimeMinusBtn = document.getElementById('adjustTimeMinus');
    const volumeControls = document.querySelectorAll('input[name="volume"]');

    // Audio Elements
    const audioObjects = {
        ding1: new Audio('audio/ding1.mp3'),
        ding2: new Audio('audio/ding2.mp3'),
        ding3: new Audio('audio/ding3.mp3'),
        special: new Audio('audio/special.mp3'),
        jungle: new Audio('audio/1 jungle.mp3'),
        raver_rune: new Audio('audio/2 raver rune.mp3'),
        lotus: new Audio('audio/3 lotus.mp3'),
        exp_rune: new Audio('audio/7 exp rune.mp3'),
    };

    let worker;
    let isRunning = false;
    let audioUnlocked = false;
    let audioQueue = [];
    let isPlayingAudio = false;

    // --- Audio Queue Functions ---

    const playNextInQueue = () => {
        if (audioQueue.length === 0) {
            isPlayingAudio = false;
            return;
        }

        isPlayingAudio = true;
        const soundName = audioQueue.shift();
        const audio = audioObjects[soundName];

        if (!audio) {
            console.warn(`Sound not found: ${soundName}`);
            playNextInQueue(); // Play next one
            return;
        }

        audio.onended = () => {
            playNextInQueue();
        };
        audio.onerror = (e) => {
            console.error(`Error playing ${soundName}`, e);
            playNextInQueue(); // Skip to next
        };
        audio.play().catch(e => {
            console.error(`Playback of ${soundName} was prevented.`, e);
            playNextInQueue();
        });
    };

    const addToQueue = (soundName) => {
        audioQueue.push(soundName);
        if (!isPlayingAudio) {
            playNextInQueue();
        }
    };


    // --- Utility Functions ---

    const formatTime = (totalSeconds) => {
        if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
            return "Error";
        }
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const getLeadTimes = () => ({
        1: parseInt(leadTime1Input.value, 10),
        2: parseInt(leadTime2Input.value, 10),
        3: parseInt(leadTime3Input.value, 10),
        7: parseInt(leadTime7Input.value, 10),
    });

    const getVoiceoverSettings = () => ({
        jungle: toggleJungle.checked,
        raver_rune: toggleRaverRune.checked,
        lotus: toggleLotus.checked,
        exp_rune: toggleExpRune.checked,
    });

    const saveLeadTimes = () => {
        const leadTimes = getLeadTimes();
        localStorage.setItem('leadTimes', JSON.stringify(leadTimes));
    };

    const saveVoiceoverSettings = () => {
        const voiceoverSettings = getVoiceoverSettings();
        localStorage.setItem('voiceoverSettings', JSON.stringify(voiceoverSettings));
    };

    const saveVolume = () => {
        const volume = document.querySelector('input[name="volume"]:checked').value;
        localStorage.setItem('dotaTimerVolume', volume);
        setVolume(volume);
    };

    const loadLeadTimes = () => {
        const saved = localStorage.getItem('leadTimes');
        if (saved) {
            const leadTimes = JSON.parse(saved);
            leadTime1Input.value = leadTimes[1] || 10;
            leadTime2Input.value = leadTimes[2] || 10;
            leadTime3Input.value = leadTimes[3] || 10;
            leadTime7Input.value = leadTimes[7] || 15;
        }
    };

    const loadVoiceoverSettings = () => {
        const saved = localStorage.getItem('voiceoverSettings');
        if (saved) {
            const voiceoverSettings = JSON.parse(saved);
            toggleJungle.checked = voiceoverSettings.jungle !== false; // default to true
            toggleRaverRune.checked = voiceoverSettings.raver_rune !== false;
            toggleLotus.checked = voiceoverSettings.lotus !== false;
            toggleExpRune.checked = voiceoverSettings.exp_rune !== false;
        }
    };

    const loadVolume = () => {
        const savedVolume = localStorage.getItem('dotaTimerVolume');
        if (savedVolume) {
            const volumeRadio = document.querySelector(`input[name="volume"][value="${savedVolume}"]`);
            if (volumeRadio) {
                volumeRadio.checked = true;
            }
            setVolume(savedVolume);
        } else {
            // Default to 60% if nothing is saved
            const defaultVolume = 0.6;
            document.querySelector(`input[name="volume"][value="${defaultVolume}"]`).checked = true;
            setVolume(defaultVolume);
        }
    };

    const unlockAudio = () => {
        if (audioUnlocked) return;
        audioUnlocked = true;

        // Play a silent sound to unlock audio
        const silentSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silentSound.play().catch(e => console.warn("Audio unlock failed.", e));
    };

    const setVolume = (volume) => {
        Object.values(audioObjects).forEach(audio => audio.volume = volume);
    }


    // --- Worker Communication ---

    const initializeWorker = () => {
        try {
            console.log("Initializing worker...");
            worker = new Worker('worker.js');

            worker.onmessage = (e) => {
                console.log("Message received from worker:", e.data);
                const { type, sounds, totalSeconds, workerIsRunning } = e.data;

                if (type === 'audio' && sounds) {
                    sounds.forEach(sound => addToQueue(sound));
                } else if (type === 'time') {
                    currentTimeDisplay.textContent = formatTime(totalSeconds);
                    // Update running state and color based on worker's status
                    isRunning = workerIsRunning;
                    if (isRunning) {
                        currentTimeDisplay.classList.remove('paused');
                        currentTimeDisplay.classList.add('running');
                    } else {
                        currentTimeDisplay.classList.remove('running');
                        currentTimeDisplay.classList.add('paused');
                    }
                }
            };

            worker.onerror = (err) => {
                console.error('Worker error:', err);
                currentTimeDisplay.textContent = "Error";
                // Invalidate the worker
                worker = null;
                isRunning = false;
                startPauseBtn.textContent = 'Start';
                startPauseBtn.classList.remove('paused');
                currentTimeDisplay.classList.remove('running', 'paused');

            };
        } catch (e) {
            console.error('Failed to initialize worker:', e);
            currentTimeDisplay.textContent = "Error";
        }
    };

    // --- Event Handlers ---

    startPauseBtn.addEventListener('click', () => {
        if (!worker) {
            initializeWorker();
            // If worker failed to initialize, worker will be null
            if (!worker) {
                alert("Failed to start timer. Web Workers may be blocked by your browser, especially when running from local file://. Please use a local web server.");
                return;
            }
        }
        
        unlockAudio();

        if (!isRunning) {
            // If timer is stopped, we need to start or resume it.
            // The worker will know if it's a fresh start or a resume.
            const timeOffset = (parseInt(minutesInput.value, 10) || 0) * 60 + (parseInt(secondsInput.value, 10) || 0);
            worker.postMessage({
                command: 'start_or_resume',
                data: {
                    timeOffset,
                    leadTimes: getLeadTimes(),
                    voiceoverSettings: getVoiceoverSettings()
                }
            });
            startPauseBtn.textContent = 'Pause';
        } else {
            // If timer is running, we pause it.
            worker.postMessage({ command: 'pause' });
            startPauseBtn.textContent = 'Start';
        }
    });

    setTimeBtn.addEventListener('click', () => {
        const timeOffset = (parseInt(minutesInput.value, 10) || 0) * 60 + (parseInt(secondsInput.value, 10) || 0);
        // If timer is not running, update UI immediately.
        if (!isRunning) {
            currentTimeDisplay.textContent = formatTime(timeOffset);
            currentTimeDisplay.classList.remove('running', 'paused');
            startPauseBtn.textContent = 'Start'; // Reset button text
        }
        worker?.postMessage({ command: 'set_time', data: { timeOffset } });
    });

    [leadTime1Input, leadTime2Input, leadTime3Input, leadTime7Input].forEach(input => {
        input.addEventListener('change', saveLeadTimes);
    });

    [toggleJungle, toggleRaverRune, toggleLotus, toggleExpRune].forEach(toggle => {
        toggle.addEventListener('change', saveVoiceoverSettings);
    });

    volumeControls.forEach(radio => {
        radio.addEventListener('change', saveVolume);
    });

    const adjustTime = (seconds) => {
        // Directly send adjustment command to the worker if it exists.
        // If worker doesn't exist, initialize it first.
        if (!worker) initializeWorker();
        if (!worker) return; // Guard against initialization failure

        // This works whether the timer is running or paused.
        unlockAudio(); // Ensure audio context is ready if user interacts first here
        worker.postMessage({
            command: 'adjust_time',
            data: { seconds }
        });
    };

    adjustTimePlusBtn.addEventListener('click', () => adjustTime(1));
    adjustTimeMinusBtn.addEventListener('click', () => adjustTime(-1));

    // --- Initialization ---

    loadLeadTimes();
    loadVoiceoverSettings();
    loadVolume();
});
