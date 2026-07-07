# Contributing to Dota2 Timer

Thank you for your interest in contributing! This document provides an overview of the project's architecture and design principles to help you get started.

---

## 🛠️ Core Design & Architecture

This project is built with modern web standards, prioritizing accuracy, performance, and maintainability.

### 1. Accurate Timing with Web Workers

The core timing logic is handled by a dedicated **Web Worker** (`worker.js`). This is a crucial design choice:

- **Accuracy**: The timer runs on a separate thread, ensuring it is not blocked or slowed down by UI updates, animations, or other main-thread tasks. `setInterval` in the worker provides a more reliable clock than if it were on the main thread.
- **Performance**: The main thread remains responsive, providing a smooth user experience even while the timer is active.

The main script (`main.js`) communicates with the worker by posting commands (`start`, `pause`, `set_time`) and receives time updates in return.

### 2. Internationalization (i18n)

The application is designed to be easily translated.

- **`locales.json`**: A single source of truth for all display text. All UI strings are stored here, organized by language code (e.g., `en`, `zh`).
- **`localization.js`**: This script fetches `locales.json`, populates the language selector, and dynamically updates the UI text based on the selected language by targeting elements with the `data-i18n-key` attribute.
- **Localized Audio**: The system dynamically loads the correct voiceover audio files based on the selected language, with a fallback to English if a specific translation is missing.

### 3. State Management

- **`localStorage`**: User settings (lead times, volume, enabled events, etc.) are persisted in the browser's `localStorage`. This ensures that a user's configuration is remembered across sessions.
- **UI-Driven State**: The application state is primarily driven by the UI. Functions like `getLeadTimes()` read directly from the input elements on the page to get the current configuration.

### 4. Event Scheduling

- **Timeline Generation**: When the timer starts, a `timeline` object is generated. This object acts as a pre-calculated schedule, mapping specific timestamps (in seconds) to the events that should occur.
- **Dynamic Event Toggling**: A key design feature is that toggling an event on or off during runtime **immediately** affects playback. This is achieved by checking the event's "enabled" status at the very last moment before adding its sounds to the audio queue, rather than relying solely on the pre-generated timeline.

---

## 🎨 Styling Philosophy (`style.css`)

The visual design aims for a modern, clean, and "game-centric" aesthetic, while maintaining clarity and ease of use.

### 1. Foundation: Bootstrap 5

- The project uses **Bootstrap 5** via CDN as a foundational framework. This provides a robust, responsive grid system (`.row`, `.col-*`), basic component styling, and utility classes.

### 2. Customization via CSS Variables

- A comprehensive **Design System** is defined in `:root` using CSS Custom Properties (variables). This includes:
    - **Colors**: A palette for the dark theme, primary/secondary accents, and text colors (`--color-primary`, `--color-surface`, etc.).
    - **Typography**: Font families, sizes, and weights (`--font-family-sans`, `--font-size-lg`, etc.).
    - **Spacing**: A consistent spacing scale based on a 0.5rem (8px) grid (`--space-1`, `--space-2`, etc.).

### 3. The "Glassmorphism" Aesthetic

- The main "card" and other surfaces use a "glassmorphism" effect. This is achieved through:
    - `background-color` with alpha transparency (e.g., `rgba(30, 41, 59, 0.7)`).
    - `backdrop-filter: blur(12px);` to create the frosted glass look.
    - A subtle `border` to define the edges.

### 4. Structure and Organization

- The `style.css` file is well-organized with a clear table of contents, separating variables, base styles, layout, components, and utilities.
- Custom styles are applied by **overriding Bootstrap's default CSS variables** (e.g., `--bs-body-bg`, `--bs-card-bg`) wherever possible. This is the modern, recommended way to customize Bootstrap, ensuring better integration and easier maintenance than writing high-specificity override selectors.

---

## 📁 File Structure

- `index.html`: The main entry point and structure of the application.
- `style.css`: Contains all custom styling and design system definitions.
- `main.js`: The core application logic, including UI event handling, state management, and communication with the worker.
- `worker.js`: The background script responsible for the timer's clock tick.
- `localization.js`: Handles all language-related functionality.
- `locales.json`: Stores all translation strings.
- `/audio/`: Contains all sound files, organized into subfolders for different languages.
- `README.md`: The public-facing project overview.
- `CONTRIBUTING.md`: This file. Contains technical details for developers.