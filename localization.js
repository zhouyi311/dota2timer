let translations = {};
let currentLang = 'en';

const setLanguage = async (lang) => {
    if (!lang || !translations[lang]) {
        console.warn(`Language "${lang}" not found, defaulting to 'en'.`);
        lang = 'en';
    }
    currentLang = lang;
    localStorage.setItem('dotaTimerLang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = translations[lang][key];
        if (translation) {
            // Use 'placeholder' for inputs, otherwise 'textContent'
            if (element.tagName === 'INPUT' && element.placeholder) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        } else {
            console.warn(`Translation key "${key}" not found for language "${lang}".`);
        }
    });

    // Manually update elements without data-i18n-key if needed
    // Example: document.getElementById('some-id').textContent = translations[lang]['some-key'];

    // Dispatch a custom event to notify other parts of the app (like main.js for audio)
    document.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }));
};

const getLanguage = () => currentLang;

const initLocalization = async () => {
    try {
        const response = await fetch('locales.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();

        // Add language selector options
        const langSelector = document.getElementById('languageSelector');
        if (langSelector) {
            Object.keys(translations).forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent = translations[lang].language_name; // Each lang defines its own name
                langSelector.appendChild(option);
            });

            const savedLang = localStorage.getItem('dotaTimerLang') || 'en';
            langSelector.value = savedLang;
            await setLanguage(savedLang);

            langSelector.addEventListener('change', (e) => setLanguage(e.target.value));
        }
    } catch (error) {
        console.error("Could not initialize localization:", error);
    }
};