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
import { debounce } from './src/utils/debounce.js';


const numberlineRenderer = new NumberlineRenderer('numberline-svg', config, eventBus);
numberlineRenderer.init();
// Expose for GameController temporary marker value access & resize
window.numberlineRendererRef = numberlineRenderer;

const debouncedResize = debounce(() => {
    if (window.numberlineRendererRef && typeof window.numberlineRendererRef.handleResize === 'function') {
        window.numberlineRendererRef.handleResize();
    }
}, 250);
window.addEventListener('resize', debouncedResize);


const uiElements = {
    questionDisplay: document.getElementById('question-display'),
    feedbackArea: document.getElementById('feedback-area'),
    scoreDisplay: document.getElementById('score-display'),
    submitAnswerButton: document.getElementById('submit-answer-button'),
    nextQuestionButton: document.getElementById('next-question-button'),
    difficultySelector: document.getElementById('difficulty-selector')
};

const uiChoreographer = new UIChoreographer(uiElements, eventBus, config);
uiChoreographer.init();

// --- Game logic imports and setup ---
import { QuestionFactory } from './src/game/QuestionFactory.js';
import { GameController } from './src/game/GameController.js';

const questionFactory = new QuestionFactory(config);
const gameController = new GameController(questionFactory, eventBus, config); // Pass numberlineRenderer if needed by GameController
gameController.init();

// Initial difficulty setting
if (uiElements.difficultySelector) {
    questionFactory.setDifficulty(uiElements.difficultySelector.value);
}

const startGameButton = document.getElementById('start-game-button');
if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        gameController.startGame();
    });
} else {
    console.warn("Start game button not found");
}

// Handle difficulty changes
if (uiElements.difficultySelector) {
    uiElements.difficultySelector.addEventListener('change', (event) => {
        const newDifficulty = event.target.value;
        questionFactory.setDifficulty(newDifficulty);
        // Restart the game with the new difficulty
        gameController.startGame();
        if (config.debug) {
            console.log(`Difficulty changed to: ${newDifficulty}. Restarting game.`);
        }
    });
}

// Auto-start game on load (optional)
gameController.startGame();