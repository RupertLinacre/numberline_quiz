// src/game/QuestionFactory.js
import { getDecimalPrecision } from '../utils/formatter.js';

/**
 * Calculates the standard domain for a question value based on the rule:
 * min = floor(value) - 0.2
 * max = ceil(value) + 0.2
 * @param {number} value - The target value for the question.
 * @returns {[number, number]} - The [min, max] for the domain.
 */
function calculateStandardQuestionDomain(value) {
    const epsilon = 1e-9; // Tolerance for floating point comparisons

    let representativeValue = value;
    // If value is very close to an integer, treat it as that integer for consistent floor/ceil.
    if (Math.abs(value - Math.round(value)) < epsilon) {
        representativeValue = Math.round(value);
    }

    const floorVal = Math.floor(representativeValue);
    const ceilVal = Math.ceil(representativeValue);

    let domainMin = floorVal - 0.1;
    let domainMax = ceilVal + 0.1;

    // Ensure domainMin is strictly less than domainMax.
    // This should generally hold with positive padding.
    // If floorVal and ceilVal are the same (value is an integer like 3),
    // domainMin = 3 - 0.2 = 2.8
    // domainMax = 3 + 0.2 = 3.2
    // which is correct.
    // This safeguard ensures a minimum span if something unexpected happens.
    if (domainMax <= domainMin + epsilon) {
        domainMax = domainMin + 0.4; // Ensure a minimal span of 0.4
    }

    return [domainMin, domainMax];
}

/**
 * Generates a decimal-based question.
 * @param {object} config - The global application config.
 * @param {string} difficulty - 'easy', 'medium', or 'hard'.
 * @returns {object} - The question object.
 */
function generateDecimalQuestion(config, difficulty = 'medium') {
    let numDecimalPlaces;
    let valueRangeMagnitude; // Power of 10 for the range (e.g., 0 for 0-1, 1 for 0-10)

    switch (difficulty) {
        case 'easy':
            numDecimalPlaces = 1;
            valueRangeMagnitude = (Math.random() < 0.7) ? 0 : 1;
            break;
        case 'hard':
            numDecimalPlaces = Math.floor(Math.random() * 2) + 2; // 2 or 3 decimal places
            valueRangeMagnitude = (Math.random() < 0.3) ? 0 : (Math.random() < 0.7 ? 1 : 2);
            break;
        case 'medium':
        default:
            numDecimalPlaces = Math.floor(Math.random() * 2) + 1;
            valueRangeMagnitude = (Math.random() < 0.5) ? 0 : 1;
            break;
    }

    const baseValueRange = Math.pow(10, valueRangeMagnitude);
    let value = (Math.random() * baseValueRange);

    if (Math.random() < 0.25) {
        if (!(difficulty === 'easy' && valueRangeMagnitude === 0)) {
            value *= -1;
        }
    }
    value = parseFloat(value.toFixed(numDecimalPlaces));

    if (value === 0 && numDecimalPlaces > 0) {
        const randomSmallOffset = (Math.random() * 0.5 + 0.1) * Math.pow(10, -numDecimalPlaces);
        value = parseFloat(randomSmallOffset.toFixed(numDecimalPlaces)) * (Math.random() < 0.5 ? 1 : -1);
        if (value === 0) value = Math.pow(10, -numDecimalPlaces);
    }

    const contextualMagnitude = getDecimalPrecision(value);
    const domain = calculateStandardQuestionDomain(value); // Use new domain logic

    return {
        type: 'decimal',
        value: value,
        display: `Place ${value}`,
        initialViewParams: {
            domain: domain,
            questionContextualMagnitude: contextualMagnitude,
        }
    };
}

/**
 * Generates a fraction-based question.
 * @param {object} config - The global application config.
 * @param {string} difficulty - 'easy', 'medium', or 'hard'.
 * @returns {object} - The question object.
 */
function generateFractionQuestion(config, difficulty = 'medium') {
    let fractionsPool;
    const easyFrac = [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 2, d: 2 }, { n: 3, d: 3 }]; // Added integers
    const mediumFrac = [
        ...easyFrac,
        { n: 1, d: 5 }, { n: 2, d: 5 }, { n: 3, d: 5 }, { n: 4, d: 5 }, { n: 1, d: 6 }, { n: 5, d: 6 },
        { n: 1, d: 8 }, { n: 3, d: 8 }, { n: 5, d: 8 }, { n: 7, d: 8 }, { n: 1, d: 10 }, { n: 3, d: 10 }, { n: 7, d: 10 }, { n: 9, d: 10 },
        { n: 4, d: 4 }, { n: 5, d: 5 }, { n: 6, d: 2 }, { n: 9, d: 3 } // More integers/reducible
    ];
    const hardFrac = [
        ...mediumFrac,
        { n: 1, d: 12 }, { n: 5, d: 12 }, { n: 7, d: 12 }, { n: 11, d: 12 }, { n: 2, d: 4 }, { n: 2, d: 6 }, { n: 4, d: 6 }, { n: 6, d: 8 },
        // {n:5,d:4},{n:3,d:2},{n:7,d:5} // Consider if improper fractions are desired for "hard"
    ];

    switch (difficulty) {
        case 'easy': fractionsPool = easyFrac; break;
        case 'hard': fractionsPool = hardFrac; break;
        case 'medium': default: fractionsPool = mediumFrac; break;
    }

    const selected = fractionsPool[Math.floor(Math.random() * fractionsPool.length)];
    const value = selected.n / selected.d;
    const display = `${selected.n}/${selected.d}`;

    const domain = calculateStandardQuestionDomain(value); // Use new domain logic

    let qcm;
    if (selected.d <= 4) qcm = 0.1;
    else if (selected.d <= 8) qcm = 0.05;
    else qcm = 0.01;

    return {
        type: 'fraction',
        value: value,
        display: `Place ${display}`,
        initialViewParams: {
            domain: domain,
            questionContextualMagnitude: qcm,
        }
    };
}

export class QuestionFactory {
    constructor(config) {
        this.config = config;
        this.questionGenerators = {
            'decimal': generateDecimalQuestion,
            'fraction': generateFractionQuestion,
        };
        this.typeProbabilities = {
            'decimal': 0.6,
            'fraction': 0.4,
        };
        this.currentDifficulty = 'medium';
    }

    setDifficulty(difficulty) {
        if (['easy', 'medium', 'hard'].includes(difficulty)) {
            this.currentDifficulty = difficulty;
            if (this.config.debug) console.log(`QuestionFactory difficulty set to: ${difficulty}`);
        } else {
            console.warn(`Invalid difficulty: ${difficulty}. Using current: ${this.currentDifficulty}`);
        }
    }

    setQuestionTypeMix(typesConfig) {
        const newProbabilities = {};
        let totalProb = 0;
        let validTypesFound = false;

        for (const type in typesConfig) {
            if (this.questionGenerators[type]) {
                newProbabilities[type] = Math.max(0, typesConfig[type]);
                totalProb += newProbabilities[type];
                validTypesFound = true;
            }
        }

        if (!validTypesFound) {
            console.warn("No valid question types in typesConfig. Retaining existing mix:", this.typeProbabilities);
            return;
        }

        if (totalProb > 0) {
            for (const type in newProbabilities) {
                newProbabilities[type] /= totalProb;
            }
            this.typeProbabilities = newProbabilities;
        } else {
            const numValidTypes = Object.keys(newProbabilities).length;
            if (numValidTypes > 0) {
                const probPerType = 1 / numValidTypes;
                for (const type in newProbabilities) {
                    newProbabilities[type] = probPerType;
                }
                this.typeProbabilities = newProbabilities;
            } else {
                console.warn("Could not normalize probabilities. Retaining existing mix:", this.typeProbabilities);
                return;
            }
        }
        if (this.config.debug) console.log(`QuestionFactory type mix set to:`, this.typeProbabilities);
    }

    getNextQuestion() {
        const rand = Math.random();
        let cumulativeProb = 0;
        let selectedType = null;

        const availableTypes = Object.keys(this.typeProbabilities).filter(
            type => this.questionGenerators[type] && this.typeProbabilities[type] > 0
        );

        if (availableTypes.length === 0) {
            console.error("No question types available/enabled in QuestionFactory! Falling back to decimal/medium.");
            return this.questionGenerators['decimal'](this.config, 'medium');
        }

        for (const type of availableTypes) {
            cumulativeProb += this.typeProbabilities[type];
            if (rand < cumulativeProb) {
                selectedType = type;
                break;
            }
        }

        if (!selectedType) {
            selectedType = availableTypes[availableTypes.length - 1];
        }

        return this.questionGenerators[selectedType](this.config, this.currentDifficulty);
    }
}