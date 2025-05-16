import { config } from './src/core/Config.js';
import { EventBus } from './src/core/EventBus.js';

console.log("Numberline Challenge Initializing...");
if (config.debug) {
    console.log("Config loaded:", config);
}

const eventBus = new EventBus();
console.log("EventBus instantiated.");


import { NumberlineRenderer } from './src/view/NumberlineRenderer.js';
import { UIChoreographer } from './src/view/UIChoreographer.js';

const numberlineRenderer = new NumberlineRenderer('numberline-svg', config, eventBus);
numberlineRenderer.init();
// Expose for GameController temporary marker value access
window.numberlineRendererRef = numberlineRenderer;

const uiElements = {
    markerValueDisplay: document.getElementById('marker-value-display'),
    questionDisplay: document.getElementById('question-display'),
    feedbackArea: document.getElementById('feedback-area'),
    scoreDisplay: document.getElementById('score-display'),
    nextQuestionButton: document.getElementById('next-question-button'),
    // Add more as needed
};

const uiChoreographer = new UIChoreographer(uiElements, eventBus, config);
uiChoreographer.init();

// --- Game logic imports and setup ---
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
