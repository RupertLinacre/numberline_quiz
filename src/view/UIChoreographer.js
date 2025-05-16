import * as d3 from 'd3';

export class UIChoreographer {
    constructor(elements, eventBus, config) {
        this.elements = elements; // markerValueDisplay removed
        // Add submitAnswerButton to elements if not already present
        if (!this.elements.submitAnswerButton) {
            this.elements.submitAnswerButton = document.getElementById('submit-answer-button');
        }
        // Add nextQuestionButton to elements if not already present
        if (!this.elements.nextQuestionButton) {
            this.elements.nextQuestionButton = document.getElementById('next-question-button');
        }
        this.eventBus = eventBus;
        this.config = config;
    }

    init() {
        // Add Next Question button event
        if (this.elements.nextQuestionButton) {
            this.elements.nextQuestionButton.addEventListener('click', () => {
                this.eventBus.emit('NEXT_QUESTION_CLICKED');
            });
        }
        // No markerValueDisplay update needed

        // Subscribe to NEW_QUESTION_READY
        this.eventBus.on('NEW_QUESTION_READY', (data) => {
            if (this.elements.questionDisplay && data.questionData) {
                this.elements.questionDisplay.textContent = data.questionData.display;
            }
            if (this.elements.nextQuestionButton) {
                this.elements.nextQuestionButton.style.display = 'none';
            }
        });
        // Subscribe to UPDATE_SCORE
        this.eventBus.on('UPDATE_SCORE', (data) => {
            if (this.elements.scoreDisplay) {
                this.elements.scoreDisplay.textContent = `Score: ${data.newScore}`;
            }
        });
        // Subscribe to SHOW_FEEDBACK
        this.eventBus.on('SHOW_FEEDBACK', (data) => {
            if (this.elements.feedbackArea) {
                this.elements.feedbackArea.textContent = data.message;
                this.elements.feedbackArea.className = `feedback ${data.type || 'info'}`;
            }
            if (this.elements.nextQuestionButton) {
                // Show Next Question button if answer was submitted (correct or incorrect for now)
                if (data.type === 'success' || data.type === 'error') {
                    this.elements.nextQuestionButton.style.display = 'inline-block';
                } else {
                    this.elements.nextQuestionButton.style.display = 'none';
                }
            }
        });

        // Add submit answer button event
        if (this.elements.submitAnswerButton) {
            this.elements.submitAnswerButton.addEventListener('click', () => {
                this.eventBus.emit('SUBMIT_ANSWER_CLICKED');
            });
        }

        if (this.config.debug) console.log("UIChoreographer initialized.");
    }
    // More methods will be added to update other UI parts
}
