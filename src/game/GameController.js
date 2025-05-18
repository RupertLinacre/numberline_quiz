export class GameController {
    constructor(questionFactory, eventBus, config) {
        this.questionFactory = questionFactory;
        this.eventBus = eventBus;
        this.config = config;
        this.currentQuestion = null;
        this.score = 0;
    }

    init() {
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
        this.eventBus.emit('SHOW_FEEDBACK', { message: '', type: 'info' }); // Clear feedback
        if (this.config.debug) console.log("New question loaded:", this.currentQuestion.display);
    }

    checkAnswer() {
        if (!this.currentQuestion) return;

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
            dynamicTolerance = Math.abs(targetValue * 0.05);
        } else if (this.currentQuestion.type === 'decimal') {
            const contextualMagnitude = this.currentQuestion.initialViewParams?.questionContextualMagnitude;
            if (contextualMagnitude && contextualMagnitude > 0 && isFinite(contextualMagnitude)) {
                dynamicTolerance = contextualMagnitude * 0.25;
            } else {
                dynamicTolerance = 0.01;
            }
        } else {
            dynamicTolerance = 0.01;
        }
        if (!isFinite(dynamicTolerance) || dynamicTolerance <= 0 || dynamicTolerance > 0.5 * Math.abs(targetValue || 1)) {
            dynamicTolerance = 0.001;
        }

        const difference = Math.abs(markerValue - targetValue);
        const isCorrect = difference <= dynamicTolerance;

        let feedbackMessage = '';
        if (isCorrect) {
            this.score += 10;
            this.eventBus.emit('UPDATE_SCORE', { newScore: this.score });
            feedbackMessage = 'Correct!';
        } else {
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
            correctAnswer: targetValue,
            userAnswer: isCorrect ? null : markerValue // Pass user's answer if incorrect
        });

        if (this.config.debug) {
            console.log(`Answer checked. Correct: ${isCorrect}, Marker: ${markerValue.toFixed(5)}, Target: ${targetValue.toFixed(5)}, Diff: ${difference.toFixed(5)}, Tol: ${dynamicTolerance.toFixed(5)}`);
        }
    }
}