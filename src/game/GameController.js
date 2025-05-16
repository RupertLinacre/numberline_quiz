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
        const difference = Math.abs(markerValue - targetValue);
        const isCorrect = difference <= (this.config.answerTolerance || 0.01);

        let feedbackMessage = '';
        if (isCorrect) {
            this.score += 10; // Or some scoring logic
            this.eventBus.emit('UPDATE_SCORE', { newScore: this.score });
            feedbackMessage = 'Correct!';
        } else {
            // Use toFixed for now, as d3.format is not imported here
            feedbackMessage = `Not quite. Correct was ${targetValue.toFixed(4)}. You were off by ${difference.toFixed(4)}.`;
        }
        this.eventBus.emit('SHOW_FEEDBACK', {
            message: feedbackMessage,
            type: isCorrect ? 'success' : 'error',
            correctAnswer: targetValue // For NumberlineRenderer to optionally show
        });
        if (this.config.debug) console.log(`Answer checked. Correct: ${isCorrect}, Marker: ${markerValue}, Target: ${targetValue}`);
    }
}
