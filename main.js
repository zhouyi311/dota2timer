document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerCore = document.querySelector('.timer-core');
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
    
    const enableJungle = document.getElementById('enableJungle');
    const enablePowerRune = document.getElementById('enablePowerRune');
    const enableLotus = document.getElementById('enableLotus');
    const enableWisdomRune = document.getElementById('enableWisdomRune');

    const toggleJungle = document.getElementById('toggleJungle');
    const toggleRaverRune = document.getElementById('toggleRaverRune');
    const toggleLotus = document.getElementById('toggleLotus');
    const toggleExpRune = document.getElementById('toggleExpRune');
    const adjustTimePlusBtn = document.getElementById('adjustTimePlus');
    const adjustTimeMinusBtn = document.getElementById('adjustTimeMinus');
    const setTimeZeroBtn = document.getElementById('setTimeZero');
    const setTimeNinetyBtn = document.getElementById('setTimeNinety');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const autoStopTimeEl = document.getElementById('autoStopTime');

    const timeInputs = [currentMinutesInput, currentSecondsInput];

    // Audio Elements
    let audioObjects = {};
    const audioFileNames = {
        ding1: 'ding1.mp3',
        ding2: 'ding2.mp3',
        ding3: 'ding3.mp3',
        special: 'special.mp3',
        jungle: '1-jungle.mp3',
        raver_rune: '2-power-rune.mp3',
        lotus: '3-lotus.mp3',
        exp_rune: '7-wisdom-rune.mp3',
    };
    const localizableAudioKeys = ['jungle', 'raver_rune', 'lotus', 'exp_rune'];

    let worker;
    let isRunning = false;
    let currentPhase = 'pre-game';
    let audioUnlocked = false;
    let audioQueue = [];
    let isPlayingAudio = false;
    let currentLang = 'en';

    // --- Audio Queue ---
    const playNextInQueue = () => {
        if (audioQueue.length === 0 || !audioUnlocked) {
            isPlayingAudio = false;
            return;
        }

        const event = audioQueue.shift();

        // If audio is already playing (i.e., this is not the first sound in the sequence)
        // and the next event is an 'alert', skip it.
        if (isPlayingAudio && event.type === 'alert') {
            playNextInQueue();
            return;
        }
        isPlayingAudio = true; // Set the flag only AFTER we decide to play something.

        const audioKey = event.payload;

        const audio = audioObjects[audioKey];

        if (audio) {
            audio.onended = playNextInQueue;
            audio.onerror = (e) => {
                console.error(`Error playing ${audioKey}`, e);
                playNextInQueue(); // Continue queue on error
            };
            audio.play().catch(e => {
                // This error is common if the user hasn't interacted with the page yet.
                // It's logged as a warning instead of an error.
                console.warn(`Playback of ${audioKey} was prevented.`, e);
                playNextInQueue(); // Continue queue on play rejection
            });
        } else {
            // If audio object doesn't exist, immediately try to play the next in queue
            console.warn(`Audio key "${audioKey}" not found.`);
            playNextInQueue();
        }
    };
    const addToQueue = (events) => {
        // The queue now accepts all events without any filtering.
        audioQueue.push(...events);
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
    const getMasterToggles = () => ({
        jungle: enableJungle.checked,
        power: enablePowerRune.checked,
        lotus: enableLotus.checked,
        wisdom: enableWisdomRune.checked,
    });
    const getAutoStopSettings = () => ({
        time: parseInt(autoStopTimeEl.value, 10) || 120,
    });

    // --- Local Storage ---
    const saveLeadTimes = () => localStorage.setItem('leadTimes', JSON.stringify(getLeadTimes()));
    const saveVoiceoverSettings = () => localStorage.setItem('voiceoverSettings', JSON.stringify(getVoiceoverSettings()));
    const saveMasterToggles = () => localStorage.setItem('masterToggles', JSON.stringify(getMasterToggles()));
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
        const savedMasterToggles = localStorage.getItem('masterToggles');
        if (savedMasterToggles) {
            const mt = JSON.parse(savedMasterToggles);
            enableJungle.checked = mt.jungle !== false;
            enablePowerRune.checked = mt.power !== false;
            enableLotus.checked = mt.lotus !== false;
            enableWisdomRune.checked = mt.wisdom !== false;
        }
        const savedVolume = localStorage.getItem('dotaTimerVolume') || "0.6";
        volumeSlider.value = savedVolume;
        volumeValue.textContent = savedVolume;
        setVolume(savedVolume);

        const savedAutoStop = localStorage.getItem('autoStopSettings');
        if (savedAutoStop) {
            const as = JSON.parse(savedAutoStop);
            autoStopTimeEl.value = as.time || 120; // Default to 120 if not set
        }
    };

    const setVolume = (volume) => {
        Object.values(audioObjects).forEach(audio => {
            if (audio) audio.volume = volume;
        });
    };

    const loadAudioForLanguage = (lang) => {
        const isEnglish = (lang === 'en' || !lang);
        const langPath = isEnglish ? '' : `${lang}/`;

        for (const key in audioFileNames) {
            const fileName = audioFileNames[key];
            let audio;

            // Only apply localization logic to specified voice-over files
            if (localizableAudioKeys.includes(key) && !isEnglish) {
                const defaultPath = `audio/${fileName}`;
                const langPathFull = `audio/${langPath}${fileName}`;
                audio = new Audio(langPathFull);
                // Set up a fallback to the English audio on error (e.g., 404 Not Found)
                audio.onerror = () => { audio.src = defaultPath; };
            } else {
                // For universal sounds (dings) or English, load directly
                audio = new Audio(`audio/${fileName}`);
            }
            audioObjects[key] = audio;
        }
        setVolume(volumeSlider.value); // Re-apply current volume to new audio objects
    };

    // --- Timeline Generation ---
    const generateTimeline = () => {
        console.log("Generating new timeline...");
        const timeline = {};
        const leadTimes = getLeadTimes();
        const voiceovers = getVoiceoverSettings();
        const masterToggles = getMasterToggles();
        const autoStop = getAutoStopSettings();
        const maxTime = (autoStop.time + 1) * 60; // Generate timeline up to the auto-stop time

        const addEvent = (time, event) => {
            if (time < 0) return;
            if (!timeline[time]) timeline[time] = [];
            timeline[time].push(event);
        };

        // This is where you can add future fine-grained toggles
        const soundToggles = {
            ding1: true, ding2: true, ding3: true, special: true,
            jungle: voiceovers.jungle,
            raver_rune: voiceovers.raver_rune,
            lotus: voiceovers.lotus,
            exp_rune: voiceovers.exp_rune,
        };

        const createEvent = (baseName, dingName) => {
            const event = [];
            if (soundToggles[dingName]) event.push({ type: 'alert', payload: dingName });
            if (soundToggles[baseName]) event.push({ type: 'voice', payload: baseName });
            return event;
        };

        for (let min = 1; min * 60 < maxTime; min++) {
            // Wisdom Rune (every 7 mins, starting at min 7) - HIGHEST PRIORITY
            if (masterToggles.wisdom && min >= 7 && min % 7 === 0) {
                const triggerTime = min * 60 - leadTimes[7];
                addEvent(triggerTime, createEvent('exp_rune', 'special'));
            }
            // Lotus (every 3 mins, starting at min 3)
            if (masterToggles.lotus && min >= 3 && min % 3 === 0) {
                const triggerTime = min * 60 - leadTimes[3];
                addEvent(triggerTime, createEvent('lotus', 'ding3'));
            }
            // Power Rune (every 2 mins, starting at min 2)
            if (masterToggles.power && min >= 2 && min % 2 === 0) {
                const triggerTime = min * 60 - leadTimes[2];
                addEvent(triggerTime, createEvent('raver_rune', 'ding2'));
            }
            // Jungle (every 1 min)
            if (masterToggles.jungle) {
                const triggerTime = min * 60 - leadTimes[1];
                addEvent(triggerTime, createEvent('jungle', 'ding1'));
            }
        }

        // Add auto-stop command
        addEvent(autoStop.time * 60, [{ type: 'command', payload: 'stop_timer' }]);

        return timeline;
    };

    let timeline = {};

    // --- Worker Communication ---
    const initializeWorker = () => {
        if (worker) return;
        try {
            worker = new Worker('worker.js');
            worker.onmessage = (e) => {
                const { type, totalSeconds, newPhase } = e.data;
                if (type === 'time') {
                    updateDisplayTime(totalSeconds);
                    scheduleEvents(totalSeconds); // The "Planning Engine" hook
                } else if (type === 'phase_change' && newPhase) {
                    switchPhase(newPhase, false);
                }
            };
            worker.onerror = (err) => { console.error('Worker error:', err); worker = null; updateUIState(false); };
        } catch (e) {
            console.error('Failed to initialize worker:', e);
            alert("Failed to start timer. Web Workers may be blocked by your browser.");
        }
    };
    
    // The "Planning Engine"
    const scheduleEvents = (totalSeconds) => {
        const eventsAtThisSecond = timeline[totalSeconds];
        if (!eventsAtThisSecond) return;

        // Flatten the array of events and add to the queue
        // e.g., [[{type:'alert', payload:'ding1'}, {type:'voice', payload:'jungle'}]]
        const eventsToPlay = [];
        const masterToggles = getMasterToggles(); // Get the CURRENT state of the master toggles

        eventsAtThisSecond.forEach(event => {
            if (Array.isArray(event)) {
                // User's suggestion implemented here: Check master toggle before adding to queue
                const voiceEvent = event.find(e => e.type === 'voice');
                if (voiceEvent) {
                    const eventKey = voiceEvent.payload.replace('_rune', ''); // 'exp_rune' -> 'exp', 'raver_rune' -> 'raver'
                    const masterKey = eventKey === 'raver' ? 'power' : eventKey; // Map 'raver' to 'power' toggle
                    if (masterToggles[masterKey]) {
                        eventsToPlay.push(...event);
                    }
                }
            } else if (event.type === 'command' && event.payload === 'stop_timer') {
                handlePause(); // This is a command, not a sound, so it always executes
            }
        });

        if (eventsToPlay.length > 0) {
            addToQueue(eventsToPlay);
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
        timerCore.classList.toggle('in-pre-game-phase', newPhase === 'pre-game');
        
        if (currentPhase === 'pre-game') {
            preGameBtn.classList.add('active');
            mainGameBtn.classList.remove('active');
            
            // Only reset to 1:30 if timer is not running. If running, it's counting down.
            if (!isRunning) {
                let minutes = parseInt(currentMinutesInput.value, 10) || 0;
                let seconds = parseInt(currentSecondsInput.value, 10) || 0;
                const totalSec = minutes * 60 + seconds;
                if (totalSec > 90 || totalSec <= 0) {
                    currentMinutesInput.value = "01";
                    currentSecondsInput.value = "30";
                }
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
        
        timeline = generateTimeline(); // Generate/regenerate timeline on start
        updateTimeFromInputs(); // Sync time before starting
        worker.postMessage({
            command: 'start_or_resume',
            data: {} // Worker no longer needs data to start
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
        // Localization must run before other initializations that depend on text or language
        initLocalization().then(() => {
        loadSettings();
        loadAudioForLanguage(getLanguage()); // Load initial audio based on detected language
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

        // --- New Event Handlers for Master Toggles and Presets ---

        // Link master toggles to their respective rows
        const masterToggleMap = {
            jungle: { master: enableJungle, lead: leadTime1Input, voice: toggleJungle },
            power: { master: enablePowerRune, lead: leadTime2Input, voice: toggleRaverRune },
            lotus: { master: enableLotus, lead: leadTime3Input, voice: toggleLotus },
            wisdom: { master: enableWisdomRune, lead: leadTime7Input, voice: toggleExpRune },
        };

        Object.values(masterToggleMap).forEach(({ master, lead, voice }) => {
            const updateRowState = () => {
                const isEnabled = master.checked;
                lead.disabled = !isEnabled;
                voice.disabled = !isEnabled;
                // Visually grey out the row label if disabled
                master.closest('.row').style.opacity = isEnabled ? '1' : '0.6';
            };
            master.addEventListener('change', () => {
                updateRowState();
                saveMasterToggles();
            });
            updateRowState(); // Initial state
        });

        [leadTime1Input, leadTime2Input, leadTime3Input, leadTime7Input].forEach(i => i.addEventListener('change', saveLeadTimes));
        [toggleJungle, toggleRaverRune, toggleLotus, toggleExpRune].forEach(t => t.addEventListener('change', saveVoiceoverSettings));

        const saveAutoStopSettings = () => {
            localStorage.setItem('autoStopSettings', JSON.stringify(getAutoStopSettings()));
        };

        volumeSlider.addEventListener('input', (e) => {
            const newVolume = e.target.value;
            volumeValue.textContent = newVolume;
            setVolume(newVolume);
        });
        volumeSlider.addEventListener('change', saveVolume); // Save only when user releases slider

        autoStopTimeEl.addEventListener('change', () => {
            saveAutoStopSettings();
            // We still need to regenerate timeline if the MAX time changes
            if (!isRunning) {
                timeline = generateTimeline();
            }
        });

        adjustTimePlusBtn.addEventListener('click', () => worker.postMessage({ command: 'adjust_time', data: { seconds: 1 } }));
        adjustTimeMinusBtn.addEventListener('click', () => worker.postMessage({ command: 'adjust_time', data: { seconds: -1 } }));

        setTimeZeroBtn.addEventListener('click', () => {
            currentMinutesInput.value = "00";
            currentSecondsInput.value = "00";
            updateTimeFromInputs();
        });

        setTimeNinetyBtn.addEventListener('click', () => {
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

        // Listen for language changes to reload audio files
        document.addEventListener('languageChange', (e) => {
            loadAudioForLanguage(e.detail.lang);
        });

        // Preset button logic
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const role = button.dataset.role;
                setPreset(role);
            });
        });

        const setPreset = (role) => {
            enableJungle.checked = (role === '45' || role === 'all');
            enablePowerRune.checked = (role === '2' || role === 'all');
            enableLotus.checked = (role === '1' || role === '3' || role === '45' || role === 'all');
            enableWisdomRune.checked = (role === '1' || role === '3' || role === '45' || role === 'all');
            
            // Manually trigger the change event for each master toggle to update UI and save settings
            Object.values(masterToggleMap).forEach(({ master }) => master.dispatchEvent(new Event('change')));
        };
        });
    };

    init();
});
