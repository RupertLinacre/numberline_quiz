Okay, here is the full, final implementation plan with all details in place, ready for you to start.

---

**Final Implementation Plan: Numberline Challenge Game**

**Guiding Principles:**
*   **Incremental Builds:** Each step results in a runnable, albeit incomplete, application.
*   **Testable Milestones:** Functionality at each step should be verifiable.
*   **Foundation First:** Prioritize core architectural pieces (`EventBus`, `Config`) and the visual heart (`NumberlineRenderer`).
*   **Visual Feedback Early:** Get something on screen quickly to aid development and motivation.
*   **Defer Complex Game Logic:** Basic interaction first, then intricate game rules.

---

**Phase 0: Project Setup & Core Utilities**

*   **Objective:** Basic project structure, build tools working, and core utilities in place.
*   **Steps:**
    1.  **Initialize Vite Project:**
        *   Run `npm create vite@latest numberline-game -- --template vanilla` (or your preferred package manager's equivalent).
        *   Navigate into the project directory: `cd numberline-game`.
        *   Install D3.js: `npm install d3`.
        *   Verify the development server works: `npm run dev`.
    2.  **Create Directory Structure:**
        *   Inside the project root, create `src/`.
        *   Inside `src/`, create: `core/`, `game/`, `view/`, `utils/`.
    3.  **Implement `src/core/Config.js`:**
        *   Create `src/core/Config.js`.
        *   Define initial basic configurations:
            ```javascript
            export const config = {
                svgWidth: 800,
                svgHeight: 200,
                margins: { top: 50, right: 50, bottom: 70, left: 50 },
                initialDomain: [0, 1], // Default starting domain
                debug: true, // For logging
                // Add more as needed: zoomScaleExtent, tick lengths, etc.
            };
            ```
        *   Export the `config` object.
    4.  **Implement `src/core/EventBus.js`:**
        *   Create `src/core/EventBus.js`.
        *   Implement a simple publish-subscribe system:
            ```javascript
            export class EventBus {
                constructor() {
                    this.events = {};
                }
                on(eventName, callback) {
                    if (!this.events[eventName]) {
                        this.events[eventName] = [];
                    }
                    this.events[eventName].push(callback);
                }
                emit(eventName, data) {
                    if (this.events[eventName]) {
                        this.events[eventName].forEach(callback => callback(data));
                    }
                }
                off(eventName, callbackToRemove) {
                    if (!this.events[eventName]) return;
                    this.events[eventName] = this.events[eventName].filter(
                        callback => callback !== callbackToRemove
                    );
                }
            }
            ```
    5.  **Update `index.html` (in the project root):**
        *   Clear out default Vite content.
        *   Add basic structure:
            ```html
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Numberline Challenge</title>
                <link rel="stylesheet" href="style.css">
            </head>
            <body>
                <div id="app">
                    <h1>Numberline Challenge</h1>
                    <div id="question-display">Question will appear here...</div>
                    <div id="numberline-container">
                        <svg id="numberline-svg"></svg>
                    </div>
                    <div id="marker-value-display">Marker: ---</div>
                    <div id="controls">
                        <!-- Buttons will go here -->
                    </div>
                    <div id="feedback-area"></div>
                    <div id="score-display">Score: 0</div>
                </div>
                <script type="module" src="/main.js"></script>
            </body>
            </html>
            ```
    6.  **Create `style.css` (in the project root):**
        *   Add minimal styling for now:
            ```css
            body { font-family: sans-serif; margin: 20px; }
            #numberline-container { border: 1px solid #ccc; margin-top: 10px; }
            /* More styles will be added later */
            ```
    7.  **Update `main.js` (in the project root):**
        *   Clear out default Vite content.
        *   Import `config` and `EventBus`:
            ```javascript
            import { config } from './src/core/Config.js';
            import { EventBus } from './src/core/EventBus.js';

            console.log("Numberline Challenge Initializing...");
            if (config.debug) {
                console.log("Config loaded:", config);
            }

            const eventBus = new EventBus();
            console.log("EventBus instantiated.");

            // Further initializations will go here
            ```
*   **Verification:**
    *   Project runs via `npm run dev`.
    *   The basic HTML structure (title, placeholders) is visible in the browser.
    *   Console logs confirm `Config` and `EventBus` are loaded. No errors.

---

**Phase 1: Basic Static Numberline Rendering**

*   **Objective:** Display a non-interactive D3 numberline with initial ticks and labels based on `Config`, using a *custom data join approach for ticks* from the start.
*   **Steps:**
    1.  **Implement `src/view/NumberlineRenderer.js` (Initial Pass):**
        *   Create `src/view/NumberlineRenderer.js`.
        *   Define the class:
            ```javascript
            import * as d3 from 'd3';

            export class NumberlineRenderer {
                constructor(svgId, config, eventBus) {
                    this.svgId = svgId;
                    this.config = config;
                    this.eventBus = eventBus;
                    this.svg = null;
                    this.chartArea = null;
                    this.baseScale = null; // Represents the full conceptual range
                    this.currentTransform = d3.zoomIdentity; // Current zoom/pan state
                }

                init() {
                    this.svg = d3.select(`#${this.svgId}`)
                        .attr('width', this.config.svgWidth)
                        .attr('height', this.config.svgHeight);

                    this.chartArea = this.svg.append('g')
                        .attr('transform', `translate(${this.config.margins.left}, ${this.config.margins.top})`);

                    const chartWidth = this.config.svgWidth - this.config.margins.left - this.config.margins.right;

                    this.baseScale = d3.scaleLinear()
                        .domain(this.config.initialDomain)
                        .range([0, chartWidth]);

                    this.chartArea.append('line') // Main axis line
                        .attr('class', 'axis-line')
                        .attr('x1', 0)
                        .attr('x2', chartWidth)
                        .attr('stroke', 'black');

                    this.updateAxis(this.currentTransform);
                    if (this.config.debug) console.log("NumberlineRenderer initialized.");
                }

                // Placeholder
                _calculateTickLevels(currentScale) {
                    // For now, simple hardcoded ticks for the initialDomain [0,1]
                    if (currentScale.domain()[0] === 0 && currentScale.domain()[1] === 1) {
                         return [
                            { value: 0, isMajor: true },
                            { value: 0.5, isMajor: false },
                            { value: 1, isMajor: true }
                        ];
                    }
                    // Fallback for other domains (will be improved)
                    return currentScale.ticks(5).map(d => ({ value: d, isMajor: Math.abs(d - Math.round(d)) < 1e-9 }));
                }

                updateAxis(transform) {
                    this.currentTransform = transform;
                    const currentScale = this.currentTransform.rescaleX(this.baseScale);
                    const tickData = this._calculateTickLevels(currentScale);

                    this.chartArea.selectAll('g.tick').remove(); // Simple clear for now

                    const ticks = this.chartArea.selectAll('g.tick')
                        .data(tickData, d => d.value)
                        .join('g')
                        .attr('class', d => `tick ${d.isMajor ? 'major' : 'minor'}`)
                        .attr('transform', d => `translate(${currentScale(d.value)}, 0)`);

                    ticks.append('line')
                        .attr('y1', 0)
                        .attr('y2', d => d.isMajor ? 10 : 5) // Tick length
                        .attr('stroke', 'black');

                    ticks.filter(d => d.isMajor)
                        .append('text')
                        .attr('y', 20) // Label position
                        .attr('text-anchor', 'middle')
                        .text(d => d.value);

                     // Update main axis line if its range changes (not strictly necessary if chartWidth is fixed)
                    const chartWidth = this.config.svgWidth - this.config.margins.left - this.config.margins.right;
                    this.chartArea.select('.axis-line').attr('x2', chartWidth);

                    if (this.config.debug) console.log("NumberlineRenderer axis updated.");
                }
            }
            ```
    2.  **Update `main.js`:**
        *   Import `NumberlineRenderer`.
        *   Instantiate and initialize it:
            ```javascript
            // ... (previous imports)
            import { NumberlineRenderer } from './src/view/NumberlineRenderer.js';

            // ... (eventBus instantiation)

            const numberlineRenderer = new NumberlineRenderer('numberline-svg', config, eventBus);
            numberlineRenderer.init();
            ```
*   **Verification:**
    *   A static numberline appears on the page, rendered using custom D3 data joins for the few hardcoded ticks.
    *   The main axis line is visible.
    *   Dimensions and margins match `Config`.
    *   Console logs confirm initialization.

---

**Phase 2: Implementing Robust Base-10 Tick Logic & Dynamic Updates**

*   **Objective:** Refine the numberline to use the required strict base-10 tick subdivision logic and allow its view to be updated by changing the `baseScale`'s domain.
*   **Steps:**
    1.  **Refine `src/view/NumberlineRenderer.js`:**
        *   **Implement full `_calculateTickLevels(currentScale)` function:**
            ```javascript
            // Inside NumberlineRenderer class
            _calculateTickLevels(currentScale) {
                const [domainMin, domainMax] = currentScale.domain();
                const domainWidth = domainMax - domainMin;
                if (domainWidth <= 1e-9 || !isFinite(domainWidth)) return [];

                const targetMajorTicksOnScreen = 5; // Aim for this many major ticks
                const idealMajorStep = domainWidth / targetMajorTicksOnScreen;

                // Calculate exponent for major step (e.g., 10^0, 10^-1, 10^1)
                let exponent = Math.floor(Math.log10(idealMajorStep));
                let majorStep = Math.pow(10, exponent);

                // Adjust majorStep to be 1, 2, or 5 times the power of 10 for nicer visuals
                // For strict base-10, we only want powers of 10.
                // If idealMajorStep / majorStep is > 5, then majorStep is too small, increase it.
                if (idealMajorStep / majorStep > 5 && majorStep * 10 <= domainWidth) { // Favor more subdivisions if possible
                     majorStep *= 10;
                } else if (idealMajorStep / majorStep < 1.5 && majorStep / 10 >= domainWidth / 50) { // Avoid too many major ticks
                    // No change, or majorStep /=10; for now, let's prefer more sparse major ticks if very zoomed.
                    // This part needs refinement for ideal auto-scaling of major tick level.
                    // For now, a simple power of 10 based on domainWidth and targetMajorTicks
                    const minPixelSeparation = 50; // Min pixels between major ticks
                    const maxMajorTicks = currentScale.range()[1] / minPixelSeparation;

                    majorStep = Math.pow(10, Math.floor(Math.log10(domainWidth / Math.min(targetMajorTicksOnScreen, maxMajorTicks))));

                }


                const minorStep = majorStep / 10;
                const ticks = [];

                const startValue = Math.floor(domainMin / minorStep - 1e-9) * minorStep;
                const endValue = Math.ceil(domainMax / minorStep + 1e-9) * minorStep;

                for (let v = startValue; v <= endValue + 1e-9; v += minorStep) {
                    let tickValue = parseFloat(v.toPrecision(12)); // Mitigate floating point issues
                    if (Math.abs(tickValue) < 1e-9 * Math.abs(minorStep) && tickValue !== 0) tickValue = 0;

                    const remainderMajor = Math.abs(tickValue / majorStep) % 1;
                    const isMajor = (remainderMajor < 1e-9 || Math.abs(remainderMajor - 1) < 1e-9);

                    ticks.push({ value: tickValue, isMajor: isMajor });
                }
                return ticks;
            }
            ```
        *   **Enhance `updateAxis(transform)`:** Ensure it correctly uses the full `_calculateTickLevels` output. Adjust tick line lengths and label formatting.
            ```javascript
            // Inside updateAxis in NumberlineRenderer
            // ... (currentScale, tickData calculation) ...
            ticks.select('line') // update existing or new
                .attr('y1', 0)
                .attr('y2', d => d.isMajor ? this.config.majorTickLength || 10 : this.config.minorTickLength || 5)
                .attr('stroke', d => d.isMajor ? '#333' : '#aaa');

            ticks.select('text').remove(); // Clear old text before re-adding for majors
            ticks.filter(d => d.isMajor)
                .append('text')
                .attr('y', (this.config.majorTickLength || 10) + 12) // Position below major tick
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .text(d => d3.format(".10~g")(d.value)); // Use d3.format for better number display
            ```
        *   Add `setDomain(newDomain)` method:
            ```javascript
            // Inside NumberlineRenderer class
            setDomain(newDomain) {
                this.baseScale.domain(newDomain);
                // Reset zoom transform to identity to reflect the new base domain directly
                this.currentTransform = d3.zoomIdentity;
                this.svg.call(this.zoomBehavior.transform, d3.zoomIdentity); // Reset zoom state if zoom is active
                this.updateAxis(this.currentTransform);
                if (this.config.debug) console.log("Numberline domain set to:", newDomain);
            }
            ```
        *   Add placeholder tick lengths to `Config.js`: `majorTickLength: 10, minorTickLength: 5`.
    2.  **Create `src/utils/formatter.js` (Optional but Recommended):**
        *   `export function formatNumber(value) { return d3.format(".10~g")(value); }`
        *   Use this `formatNumber` in `NumberlineRenderer.js` for tick labels.

*   **Verification:**
    *   Numberline displays ticks and labels dynamically based on the robust base-10 logic.
    *   Test by calling `numberlineRenderer.setDomain([0, 10])` then `numberlineRenderer.setDomain([-0.1, 0.1])` from the browser console (e.g., `window.nr = numberlineRenderer; nr.setDomain(...)`) to see the ticks adapt.

---

**Phase 3: Zoom and Pan Functionality**

*   **Objective:** Enable mouse wheel/pinch zoom and click-drag pan on the numberline.
*   **Steps:**
    1.  **Enhance `src/view/NumberlineRenderer.js`:**
        *   In the constructor, add `this.zoomBehavior = null;`.
        *   Modify `init()`:
            ```javascript
            // Inside init() in NumberlineRenderer
            this.zoomBehavior = d3.zoom()
                .scaleExtent([this.config.minZoomScale || 0.1, this.config.maxZoomScale || 100]) // Add to Config
                .on('zoom', (event) => {
                    this.updateAxis(event.transform);
                });
            this.svg.call(this.zoomBehavior);
            ```
        *   Add `minZoomScale: 0.1, maxZoomScale: 100` to `Config.js`.
        *   The `updateAxis` method already correctly uses `event.transform` to derive `currentScale` from `this.baseScale`.

*   **Verification:**
    *   Numberline can be zoomed in/out using the mouse wheel.
    *   Numberline can be panned by clicking and dragging.
    *   Ticks and labels dynamically update correctly during zoom/pan, maintaining the base-10 subdivision logic.

---

**Phase 4: Draggable Marker**

*   **Objective:** Implement a draggable vertical marker whose *data value* is tracked, and display this value.
*   **Steps:**
    1.  **Implement `src/view/NumberlineRenderer.js` (Marker Logic):**
        *   In constructor: `this.marker = null; this.markerDataValue = null;`.
        *   `_initMarker()` method (called from `init()`):
            ```javascript
            // Inside NumberlineRenderer class
            _initMarker() {
                this.markerDataValue = this.baseScale.domain()[0] + (this.baseScale.domain()[1] - this.baseScale.domain()[0]) / 2; // Center initially

                this.marker = this.chartArea.append('g').attr('class', 'draggable-marker');

                this.marker.append('line')
                    .attr('y1', - (this.config.majorTickLength || 10) * 1.5) // Extend above and below axis
                    .attr('y2', (this.config.majorTickLength || 10) * 1.5)
                    .attr('stroke', 'red')
                    .attr('stroke-width', 2);

                this.marker.append('circle') // Draggable handle
                    .attr('cy', 0)
                    .attr('r', 5)
                    .attr('fill', 'red')
                    .style('cursor', 'ew-resize');

                const dragBehavior = d3.drag()
                    .on('drag', (event) => {
                        const currentScale = this.currentTransform.rescaleX(this.baseScale);
                        this.markerDataValue = currentScale.invert(event.x);
                        this._updateMarkerScreenPosition();
                        this.eventBus.emit('MARKER_DRAGGED', { currentValue: this.markerDataValue });
                    })
                    .on('end', (event) => {
                        this.eventBus.emit('MARKER_VALUE_FINALIZED', { value: this.markerDataValue });
                    });

                this.marker.call(dragBehavior);
                this._updateMarkerScreenPosition(); // Initial position
            }
            _updateMarkerScreenPosition() {
                if (!this.marker || this.markerDataValue === null) return;
                const currentScale = this.currentTransform.rescaleX(this.baseScale);
                this.marker.attr('transform', `translate(${currentScale(this.markerDataValue)}, 0)`);
            }
            ```
        *   In `updateAxis(transform)`: At the end, call `this._updateMarkerScreenPosition();`.
        *   Add `getCurrentMarkerValue()` method: `return this.markerDataValue;`.
        *   Add `resetMarker(initialValue)` method:
            ```javascript
            // Inside NumberlineRenderer class
            resetMarker(initialValue) {
                const currentScale = this.currentTransform.rescaleX(this.baseScale);
                if (initialValue !== undefined) {
                    this.markerDataValue = initialValue;
                } else { // Default to center of current view
                    this.markerDataValue = currentScale.domain()[0] + (currentScale.domain()[1] - currentScale.domain()[0]) / 2;
                }
                this._updateMarkerScreenPosition();
                if (this.config.debug) console.log("Marker reset to:", this.markerDataValue);
            }
            ```
    2.  **Implement `src/view/UIChoreographer.js` (Initial Pass):**
        *   Create `src/view/UIChoreographer.js`.
            ```javascript
            export class UIChoreographer {
                constructor(elements, eventBus, config) {
                    this.elements = elements; // { markerValueDisplay: domElement, ... }
                    this.eventBus = eventBus;
                    this.config = config;
                }

                init() {
                    this.eventBus.on('MARKER_DRAGGED', (data) => {
                        if (this.elements.markerValueDisplay) {
                            // Use a formatter if available
                            this.elements.markerValueDisplay.textContent = `Marker: ${d3.format(".4~f")(data.currentValue)}`;
                        }
                    });
                    if (this.config.debug) console.log("UIChoreographer initialized.");
                }
                // More methods will be added to update other UI parts
            }
            ```
    3.  **Update `main.js`:**
        *   Import `UIChoreographer`.
        *   Instantiate it, passing DOM element references:
            ```javascript
            // ... (previous imports)
            import { UIChoreographer } from './src/view/UIChoreographer.js';

            // ... (eventBus, numberlineRenderer instantiation)

            const uiElements = {
                markerValueDisplay: document.getElementById('marker-value-display'),
                questionDisplay: document.getElementById('question-display'),
                feedbackArea: document.getElementById('feedback-area'),
                scoreDisplay: document.getElementById('score-display')
                // Add more as needed
            };
            const uiChoreographer = new UIChoreographer(uiElements, eventBus, config);
            uiChoreographer.init();
            ```
    4.  **Update `NumberlineRenderer.js`:**
        *   In `init()`, call `this._initMarker();`.
        *   After `this.updateAxis(this.currentTransform);` in `init()`, call `this.resetMarker();`.

*   **Verification:**
    *   A red marker (line with a circle handle) appears on the numberline.
    *   The marker can be dragged horizontally.
    *   The `#marker-value-display` text updates in real-time with the marker's decimal value.
    *   The marker stays visually "pinned" to its data value when the numberline is zoomed or panned.

---

**Phase 5: Basic Game Structure & Question Display**

*   **Objective:** Set up the game controller and display the first, hardcoded question, ensuring the numberline view adapts.
*   **Steps:**
    1.  **Implement `src/game/QuestionFactory.js` (Basic):**
        *   Create `src/game/QuestionFactory.js`.
            ```javascript
            export class QuestionFactory {
                constructor(config) {
                    this.config = config;
                }
                getNextQuestion() {
                    // For now, a hardcoded decimal question
                    const value = 0.75;
                    return {
                        type: 'decimal',
                        value: value,
                        display: `Place ${value}`,
                        initialViewParams: {
                            domain: [0, 1], // Sensible domain for this value
                            labelsToHide: null, // No specific labels to hide yet
                            // preferredTickMagnitude: 0.1 // Optional hint for detail
                        }
                    };
                }
            }
            ```
    2.  **Implement `src/game/GameController.js` (Basic):**
        *   Create `src/game/GameController.js`.
            ```javascript
            export class GameController {
                constructor(questionFactory, eventBus, config) {
                    this.questionFactory = questionFactory;
                    this.eventBus = eventBus;
                    this.config = config;
                    this.currentQuestion = null;
                    this.score = 0;
                }

                init() {
                    // Listen for game start trigger, e.g., from a UI button
                    // For now, we can auto-start or have a button in main.js call startGame
                    if (this.config.debug) console.log("GameController initialized.");
                }

                startGame() {
                    this.score = 0;
                    this.eventBus.emit('UPDATE_SCORE', { newScore: this.score });
                    this.loadNextQuestion();
                    if (this.config.debug) console.log("Game started.");
                }

                loadNextQuestion() {
                    this.currentQuestion = this.questionFactory.getNextQuestion();
                    this.eventBus.emit('NEW_QUESTION_READY', {
                        questionData: this.currentQuestion,
                        initialViewParams: this.currentQuestion.initialViewParams
                    });
                    // Clear previous feedback
                    this.eventBus.emit('SHOW_FEEDBACK', { message: '', type: 'info' });
                     if (this.config.debug) console.log("New question loaded:", this.currentQuestion.display);
                }
                // More methods for answer checking etc. will be added
            }
            ```
    3.  **Update `main.js`:**
        *   Import `QuestionFactory` and `GameController`.
        *   Instantiate them.
        *   Add a "Start Game" button to `index.html` inside `#controls`.
            `<button id="start-game-button">Start Game</button>`
        *   Attach event listener in `main.js`:
            ```javascript
            // ... (previous imports and instantiations)
            import { QuestionFactory } from './src/game/QuestionFactory.js';
            import { GameController } from './src/game/GameController.js';

            const questionFactory = new QuestionFactory(config);
            const gameController = new GameController(questionFactory, eventBus, config);
            gameController.init();

            const startGameButton = document.getElementById('start-game-button');
            if (startGameButton) {
                startGameButton.addEventListener('click', () => {
                    gameController.startGame();
                });
            } else {
                console.warn("Start game button not found");
                // Optionally auto-start for early testing
                // gameController.startGame();
            }
            ```
    4.  **Update `src/view/UIChoreographer.js`:**
        *   In `init()`, subscribe to `NEW_QUESTION_READY`:
            ```javascript
            // Inside UIChoreographer init()
            this.eventBus.on('NEW_QUESTION_READY', (data) => {
                if (this.elements.questionDisplay && data.questionData) {
                    this.elements.questionDisplay.textContent = data.questionData.display;
                }
            });
            this.eventBus.on('UPDATE_SCORE', (data) => {
                if (this.elements.scoreDisplay) {
                    this.elements.scoreDisplay.textContent = `Score: ${data.newScore}`;
                }
            });
            this.eventBus.on('SHOW_FEEDBACK', (data) => {
                if (this.elements.feedbackArea) {
                    this.elements.feedbackArea.textContent = data.message;
                    this.elements.feedbackArea.className = `feedback ${data.type || 'info'}`;
                }
            });
            ```
    5.  **Update `src/view/NumberlineRenderer.js`:**
        *   In `init()`, subscribe to `NEW_QUESTION_READY`:
            ```javascript
            // Inside NumberlineRenderer init()
            this.eventBus.on('NEW_QUESTION_READY', (data) => {
                if (data.initialViewParams && data.initialViewParams.domain) {
                    this.setDomain(data.initialViewParams.domain);
                    // Store labelsToHide for use in _calculateTickLevels or updateAxis
                    this.labelsToHide = data.initialViewParams.labelsToHide || null;
                }
                this.resetMarker(); // Reset marker for new question
            });
            ```
        *   Modify `setDomain` slightly to ensure it resets zoom to show the new domain properly if zoom is active:
            ```javascript
            // Inside NumberlineRenderer setDomain(newDomain)
            // ... (update baseScale.domain)
            this.currentTransform = d3.zoomIdentity;
            if (this.svg && this.zoomBehavior) { // Check if zoomBehavior is initialized
                 this.svg.call(this.zoomBehavior.transform, d3.zoomIdentity); // Apply reset transform
            }
            this.updateAxis(this.currentTransform);
            // ...
            ```

*   **Verification:**
    *   Clicking the "Start Game" button.
    *   The hardcoded question text ("Place 0.75") is displayed.
    *   The numberline updates its domain to `[0, 1]`.
    *   The marker resets (e.g., to the center of the new domain).
    *   Score display initializes to 0.

---

**Phase 6: Answer Submission and Basic Feedback**

*   **Objective:** Allow submitting an answer and get simple correct/incorrect feedback.
*   **Steps:**
    1.  **Add to `index.html` (inside `#controls`):**
        *   `<button id="submit-answer-button">Submit Answer</button>`
    2.  **Update `src/view/UIChoreographer.js`:**
        *   In constructor, add `submitAnswerButton: document.getElementById('submit-answer-button')` to `this.elements`.
        *   In `init()`:
            ```javascript
            // Inside UIChoreographer init()
            if (this.elements.submitAnswerButton) {
                this.elements.submitAnswerButton.addEventListener('click', () => {
                    this.eventBus.emit('SUBMIT_ANSWER_CLICKED');
                });
            }
            ```
    3.  **Enhance `src/game/GameController.js`:**
        *   Add `answerTolerance` to `Config.js`, e.g., `answerTolerance: 0.01`.
        *   In `init()` method of `GameController`:
            ```javascript
            // Inside GameController init()
            this.eventBus.on('SUBMIT_ANSWER_CLICKED', () => this.checkAnswer());
            ```
        *   Add `checkAnswer()` method:
            ```javascript
            // Inside GameController class
            checkAnswer() {
                if (!this.currentQuestion) return;

                // We need a way for GameController to get the marker value.
                // NumberlineRenderer should probably emit MARKER_VALUE_FINALIZED on drag end,
                // or GameController can request it. For now, assume we'll make NR emit it,
                // or have a direct call. Let's add a temporary direct call for now.
                // This will be refined with MARKER_VALUE_FINALIZED event later.
                const markerValue = window.numberlineRendererRef.getCurrentMarkerValue(); // TEMPORARY - needs better way

                if (markerValue === null || markerValue === undefined) {
                    this.eventBus.emit('SHOW_FEEDBACK', { message: 'Please place the marker.', type: 'warning' });
                    return;
                }

                const targetValue = this.currentQuestion.value;
                const difference = Math.abs(markerValue - targetValue);
                const isCorrect = difference <= (this.config.answerTolerance || 0.01);

                let feedbackMessage = '';
                if (isCorrect) {
                    this.score += 10; // Or some scoring logic
                    this.eventBus.emit('UPDATE_SCORE', { newScore: this.score });
                    feedbackMessage = 'Correct!';
                } else {
                    feedbackMessage = `Not quite. Correct was ${d3.format(".4~f")(targetValue)}. You were off by ${d3.format(".4~f")(difference)}.`;
                }
                this.eventBus.emit('SHOW_FEEDBACK', {
                    message: feedbackMessage,
                    type: isCorrect ? 'success' : 'error',
                    correctAnswer: targetValue // For NumberlineRenderer to optionally show
                });
                if (this.config.debug) console.log(`Answer checked. Correct: ${isCorrect}, Marker: ${markerValue}, Target: ${targetValue}`);
            }
            ```
        *   **Refinement needed for getting marker value:** Expose `numberlineRenderer` instance globally for now for `checkAnswer` (`window.numberlineRendererRef = numberlineRenderer;` in `main.js`). *This is temporary and will be improved by `MARKER_VALUE_FINALIZED` event or a getter on an injected service.*
    4.  **Update `NumberlineRenderer.js` (Optional for showing correct answer):**
        *   In `init()`, subscribe to `SHOW_FEEDBACK`:
            ```javascript
            // Inside NumberlineRenderer init()
            this.eventBus.on('SHOW_FEEDBACK', (data) => {
                this._removeTemporaryHighlights(); // Clear previous highlights
                if (data.correctAnswer !== undefined && data.type === 'error') {
                    this._showCorrectAnswerHighlight(data.correctAnswer);
                }
            });
            ```
        *   Add helper methods `_removeTemporaryHighlights()` and `_showCorrectAnswerHighlight(value)` to draw/remove a temporary visual (e.g., a green line) at the correct answer position.

*   **Verification:**
    *   User can place the marker and click "Submit Answer."
    *   Correct/incorrect feedback message is displayed in `#feedback-area`.
    *   Score updates in `#score-display` for correct answers.
    *   (Optional) If the answer is wrong, a temporary highlight shows the correct position on the numberline.

---

**Phase 7: Multiple Questions, Refined Generation & Smart Labeling**

*   **Objective:** Enable playing through multiple questions, improve question generation (including "sensible initial view" logic), and implement "smart labeling" for decimal questions.
*   **Steps:**
    1.  **Add "Next Question" button to `index.html` (inside `#controls`):**
        *   `<button id="next-question-button" style="display:none;">Next Question</button>` (initially hidden)
    2.  **Update `src/view/UIChoreographer.js`:**
        *   Add `nextQuestionButton` to `this.elements`.
        *   In `init()`:
            ```javascript
            // Inside UIChoreographer init()
            if (this.elements.nextQuestionButton) {
                this.elements.nextQuestionButton.addEventListener('click', () => {
                    this.eventBus.emit('NEXT_QUESTION_CLICKED');
                });
            }
            // Modify SHOW_FEEDBACK listener to manage Next Question button visibility
            this.eventBus.on('SHOW_FEEDBACK', (data) => {
                if (this.elements.feedbackArea) { /* ... update feedback ... */ }
                if (this.elements.nextQuestionButton) {
                    // Show "Next Question" button if answer was submitted (correct or incorrect for now)
                    // Or only if correct, depending on desired game flow
                    if (data.type === 'success' || data.type === 'error') { // If feedback is for an answer
                         this.elements.nextQuestionButton.style.display = 'inline-block';
                    } else { // e.g. info message like "place marker"
                         this.elements.nextQuestionButton.style.display = 'none';
                    }
                }
            });
            // Modify NEW_QUESTION_READY listener to hide Next Question button
             this.eventBus.on('NEW_QUESTION_READY', (data) => {
                if (this.elements.questionDisplay) { /* ... update question ... */ }
                if (this.elements.nextQuestionButton) {
                    this.elements.nextQuestionButton.style.display = 'none';
                }
            });
            ```
    3.  **Enhance `src/game/GameController.js`:**
        *   In `init()`:
            ```javascript
            // Inside GameController init()
            this.eventBus.on('NEXT_QUESTION_CLICKED', () => this.loadNextQuestion());
            ```
        *   The `loadNextQuestion()` method already exists and will be called.
    4.  **Refine `src/game/QuestionFactory.js`:**
        *   Implement diverse question generation:
            ```javascript
            // Inside QuestionFactory class
            getNextQuestion() {
                const questionType = Math.random() < 0.6 ? 'decimal' : 'fraction'; // 60% decimal
                let question = {};

                if (questionType === 'decimal') {
                    const numDecimalPlaces = Math.floor(Math.random() * 2) + 1; // 1 or 2 decimal places
                    let value = Math.random(); // 0 to 1
                    if (Math.random() < 0.3) value = Math.random() * 10; // Occasionally up to 10

                    value = parseFloat(value.toFixed(numDecimalPlaces));

                    // Determine a sensible domain
                    let domainMin = Math.floor(value / 0.5) * 0.5 - 0.5; // Example logic
                    let domainMax = Math.ceil(value / 0.5) * 0.5 + 0.5;
                    if (value < 0.2) { domainMin = 0; domainMax = Math.max(0.5, Math.ceil(value*2)/2 + 0.1); }
                    if (value > 0.8 && value < 1) { domainMax = 1; domainMin = Math.min(0.5, Math.floor(value*2)/2 - 0.1); }


                    question = {
                        type: 'decimal',
                        value: value,
                        display: `Place ${value}`,
                        initialViewParams: {
                            domain: [Math.max(0, domainMin), Math.min(10,domainMax)], // Ensure reasonable bounds
                            labelsToHide: [value], // Hide the exact answer label
                        }
                    };
                } else { // Fraction
                    const fractions = [
                        { num: 1, den: 2, display: "1/2" }, { num: 1, den: 4, display: "1/4" },
                        { num: 3, den: 4, display: "3/4" }, { num: 1, den: 3, display: "1/3" },
                        { num: 2, den: 3, display: "2/3" }, { num: 1, den: 5, display: "1/5" },
                        { num: 1, den: 8, display: "1/8" }, { num: 1, den: 10, display: "1/10"}
                    ];
                    const selected = fractions[Math.floor(Math.random() * fractions.length)];
                    question = {
                        type: 'fraction',
                        value: selected.num / selected.den,
                        display: `Place ${selected.display}`,
                        initialViewParams: {
                            domain: [0, 1], // Fractions usually between 0 and 1
                            labelsToHide: null, // Don't hide for fractions, user estimates decimal
                        }
                    };
                }
                return question;
            }
            ```
    5.  **Refine `src/view/NumberlineRenderer.js`:**
        *   In the constructor: `this.labelsToHide = null;`
        *   In `_calculateTickLevels` or where labels are generated within `updateAxis`:
            ```javascript
            // When creating text for major ticks in updateAxis:
            .filter(d => !(this.labelsToHide && this.labelsToHide.includes(d.value))) // Filter out labels to hide
            .append('text')
            // ... rest of text attributes
            ```
        *   Ensure `this.labelsToHide` is set from `initialViewParams` in the `NEW_QUESTION_READY` event handler (already done in Phase 5).

*   **Verification:**
    *   User can click "Next Question" (after answering) to play multiple rounds.
    *   Questions vary between decimals and fractions.
    *   The numberline's initial view (domain) adapts.
    *   For decimal questions, the exact numeric label for the target value is *not* shown on the numberline initially. For fraction questions, all decimal labels are shown as usual.

---

**Phase 8: Polish & Refinements**

*   **Objective:** Improve UX, styling, and minor features.
*   **Steps:**
    1.  **Styling (`style.css`):**
        *   Improve overall look and feel: fonts, colors, layout.
        *   Style buttons, feedback messages (e.g., success/error colors).
        *   Ensure numberline elements (ticks, labels, marker) are clear and well-sized.
    2.  **Tick Emergence/Growth (Optional - advanced):**
        *   If desired, adapt logic from your "Example 2" D3 script for minor ticks appearing small and growing to full size as the user zooms in. This would involve calculating a `visualScale` factor in `updateAxis` for minor ticks and applying it to their line length and potentially label font size.
    3.  **Error Handling & Edge Cases:**
        *   Review for potential issues (e.g., very large/small domains, division by zero if not careful in tick logic).
        *   Add console warnings for unexpected states if `config.debug` is true.
    4.  **Responsiveness (Basic):**
        *   Use CSS to make the layout adapt reasonably to smaller screen widths. The SVG might need a `viewBox` attribute and CSS to scale, or its width could be dynamically set based on container size.
    5.  **Code Cleanup & Comments:**
        *   Refactor any overly complex functions.
        *   Add comments to explain non-obvious logic.
        *   Ensure consistent formatting.
    6.  **Fine-tune "Sensible Initial View" in `QuestionFactory.js`:**
        *   Iteratively test and adjust the logic that determines `initialViewParams.domain` (and potentially `preferredTickMagnitude`) to ensure questions are challenging but fair. This is highly subjective and will benefit from playtesting.
    7.  **Refine Marker Value Acquisition in `GameController`:**
        *   Change the temporary `window.numberlineRendererRef.getCurrentMarkerValue()`:
            *   Option 1: `GameController` listens to `MARKER_VALUE_FINALIZED` event (emitted by `NumberlineRenderer` on drag end) and stores the latest marker value. `checkAnswer` uses this stored value.
            *   Option 2: Pass `numberlineRenderer` instance to `GameController` via constructor (Dependency Injection) and call `this.numberlineRenderer.getCurrentMarkerValue()`. (Simpler for this direct need).
            *   Let's go with Option 2 for simplicity here:
                *   In `main.js`: `const gameController = new GameController(questionFactory, eventBus, config, numberlineRenderer);`
                *   In `GameController` constructor: `this.numberlineRenderer = numberlineRenderer;`
                *   In `checkAnswer`: `const markerValue = this.numberlineRenderer.getCurrentMarkerValue();`

*   **Verification:**
    *   The app is visually appealing and user-friendly.
    *   All core features from the specification are implemented and working smoothly.
    *   The game feels balanced in terms of difficulty for the initial set of questions.
    *   Code is clean and understandable.

---

This comprehensive plan should guide you through the development process effectively. Remember to commit your code frequently at each verifiable step! Good luck!