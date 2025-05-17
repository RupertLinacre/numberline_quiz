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
        this.eventBus.on('SUBMIT_ANSWER_CLICKED', () => this.checkAnswer());
        this.eventBus.on('NEXT_QUESTION_CLICKED', () => this.loadNextQuestion());
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

    checkAnswer() {
        if (!this.currentQuestion) return;

        // TEMPORARY: Get marker value from global reference
        const markerValue = window.numberlineRendererRef && window.numberlineRendererRef.getCurrentMarkerValue
            ? window.numberlineRendererRef.getCurrentMarkerValue()
            : null;

        if (markerValue === null || markerValue === undefined) {
            this.eventBus.emit('SHOW_FEEDBACK', { message: 'Please place the marker.', type: 'warning' });
            return;
        }

        const targetValue = this.currentQuestion.value;
        let dynamicTolerance;

        if (this.currentQuestion.type === 'fraction') {
            // For fractions: tolerance is 5% of the target value (absolute)
            dynamicTolerance = Math.abs(targetValue * 0.05);
            if (this.config.debug) console.log(`Fraction Question: Target=${targetValue}, Tolerance (5%)=${dynamicTolerance}`);
        } else if (this.currentQuestion.type === 'decimal') {
            // For decimals: tolerance is based on the question's contextual magnitude
            // questionContextualMagnitude is e.g., 0.1 for one decimal place, 0.01 for two.
            const contextualMagnitude = this.currentQuestion.initialViewParams?.questionContextualMagnitude;

            if (contextualMagnitude && contextualMagnitude > 0 && isFinite(contextualMagnitude)) {
                dynamicTolerance = contextualMagnitude * 0.25; // e.g., if 0.1, tol = 0.025; if 0.01, tol = 0.0025
                if (this.config.debug) console.log(`Decimal Question: Target=${targetValue}, ContextualMagnitude=${contextualMagnitude}, Tolerance (Magnitude*0.25)=${dynamicTolerance}`);
            } else {
                // Fallback if contextualMagnitude is not available or invalid (e.g. 0, NaN, undefined)
                dynamicTolerance = 0.01; // Default absolute tolerance for decimals if magnitude is problematic
                if (this.config.debug) {
                    console.warn(`Using fallback absolute tolerance (0.01) for decimal question. Target=${targetValue}, ContextualMagnitude=${contextualMagnitude}`);
                }
            }
        } else {
            // Fallback for unknown question types or if type is missing
            dynamicTolerance = 0.01; // Default absolute tolerance
            if (this.config.debug) {
                console.warn(`Unknown question type or type missing. Using fallback absolute tolerance (0.01). Question:`, this.currentQuestion);
            }
        }
        // Ensure tolerance is a sensible, small, positive number
        if (!isFinite(dynamicTolerance) || dynamicTolerance <= 0 || dynamicTolerance > 0.5 * Math.abs(targetValue || 1)) {
            if (this.config.debug) console.warn(`Calculated dynamicTolerance (${dynamicTolerance}) was invalid or too large. Resetting to a small default (0.001).`);
            dynamicTolerance = 0.001; // A very small, safe default if calculation goes wrong
        }

        const difference = Math.abs(markerValue - targetValue);
        const isCorrect = difference <= dynamicTolerance;

        let feedbackMessage = '';
        if (isCorrect) {
            this.score += 10;
            this.eventBus.emit('UPDATE_SCORE', { newScore: this.score });
            feedbackMessage = 'Correct!';
        } else {
            // Using toFixed for consistent decimal places in feedback for targetValue and difference
            let targetDisplay = typeof targetValue === 'number' ? targetValue.toFixed(4) : targetValue;
            let differenceDisplay = typeof difference === 'number' ? difference.toFixed(4) : difference;
            feedbackMessage = `Not quite. Correct was ${targetDisplay}. You were off by ${differenceDisplay}.`;
            if (this.config.debug) {
                let toleranceDisplay = typeof dynamicTolerance === 'number' ? dynamicTolerance.toFixed(5) : dynamicTolerance;
                feedbackMessage += ` (Tolerance: ±${toleranceDisplay})`;
            }
        }

        this.eventBus.emit('SHOW_FEEDBACK', {
            message: feedbackMessage,
            type: isCorrect ? 'success' : 'error',
            correctAnswer: targetValue
        });

        if (this.config.debug) {
            console.log(`Answer checked. Correct: ${isCorrect}, Marker: ${markerValue.toFixed(5)}, Target: ${targetValue.toFixed(5)}, Difference: ${difference.toFixed(5)}, Tolerance: ${dynamicTolerance.toFixed(5)}`);
        }
    }
}
