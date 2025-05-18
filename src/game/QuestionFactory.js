// src/game/QuestionFactory.js
import { getDecimalPrecision } from '../utils/formatter.js';

const epsilon = 1e-9; // For floating point comparisons

function isEffectivelyInteger(value) {
    return Math.abs(value - Math.round(value)) < epsilon;
}

/**
 * Calculates the standard domain for a question value.
 * @param {number} value - The target value for the question.
 * @returns {[number, number]} - The [min, max] for the domain.
 */
function calculateStandardQuestionDomain(value) {
    let representativeValue = value;
    if (isEffectivelyInteger(value)) {
        representativeValue = Math.round(value);
    }

    const floorVal = Math.floor(representativeValue);
    const ceilVal = Math.ceil(representativeValue);

    // Give a bit more room based on absolute value, or at least a fixed amount
    const padding = Math.max(0.2, Math.abs(representativeValue * 0.1));

    let domainMin = floorVal - padding;
    let domainMax = ceilVal + padding;

    // Ensure a minimum span, e.g., 0.5 or 1.0
    const minSpan = 1.0;
    if (domainMax - domainMin < minSpan) {
        const mid = (domainMin + domainMax) / 2;
        domainMin = mid - minSpan / 2;
        domainMax = mid + minSpan / 2;
    }

    // For values near zero, ensure a symmetric domain if padding was small
    if (Math.abs(value) < 0.5 && padding < 0.4) {
        domainMin = Math.min(domainMin, -0.5);
        domainMax = Math.max(domainMax, 0.5);
    }


    return [domainMin, domainMax];
}


function generateDecimalQuestion(config, difficulty = 'medium') {
    let value;
    let dp;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    switch (difficulty) {
        case 'easy':
            dp = 1;
            do {
                const intPart = Math.floor(Math.random() * 4); // 0, 1, 2, 3
                const decPart = (Math.floor(Math.random() * 9) + 1) / 10.0; // .1 to .9
                value = parseFloat((intPart + decPart).toFixed(dp));
                attempts++;
            } while ((isEffectivelyInteger(value) || value <= 0 || value >= 4) && attempts < MAX_ATTEMPTS);
            if (attempts >= MAX_ATTEMPTS && (isEffectivelyInteger(value) || value <= 0 || value >= 4)) { // Fallback
                value = Math.random() < 0.5 ? 0.7 : 1.3; // A simple non-integer in range
            }
            break;
        case 'medium':
            dp = Math.random() < 0.5 ? 1 : 2;
            do {
                const intPart = Math.floor(Math.random() * 4); // 0, 1, 2, 3
                let decPart;
                if (dp === 1) {
                    decPart = (Math.floor(Math.random() * 9) + 1) / 10.0;
                } else {
                    decPart = (Math.floor(Math.random() * 99) + 1) / 100.0;
                }
                value = parseFloat((intPart + decPart).toFixed(dp));
                attempts++;
            } while ((isEffectivelyInteger(value) || value <= 0 || value >= 4) && attempts < MAX_ATTEMPTS);
            if (attempts >= MAX_ATTEMPTS && (isEffectivelyInteger(value) || value <= 0 || value >= 4)) {
                value = Math.random() < 0.5 ? 0.65 : 2.35;
            }
            break;
        case 'hard':
            dp = Math.random() < 0.5 ? 1 : 2;
            do {
                const absIntPart = Math.floor(Math.random() * 4); // 0, 1, 2, 3 for absolute
                let absDecPart;
                if (dp === 1) {
                    absDecPart = (Math.floor(Math.random() * 9) + 1) / 10.0;
                } else {
                    absDecPart = (Math.floor(Math.random() * 99) + 1) / 100.0;
                }
                let absValue = parseFloat((absIntPart + absDecPart).toFixed(dp));

                if (absValue >= 4.0) absValue = parseFloat((3 + absDecPart).toFixed(dp)); // Cap abs value if it goes too high

                value = absValue * (Math.random() < 0.5 ? 1 : -1);
                value = parseFloat(value.toFixed(dp)); // ensure sign and dp
                attempts++;
            } while ((isEffectivelyInteger(value) || Math.abs(value) >= 4 || value === 0.0) && attempts < MAX_ATTEMPTS);
            if (attempts >= MAX_ATTEMPTS && (isEffectivelyInteger(value) || Math.abs(value) >= 4 || value === 0.0)) {
                value = (Math.random() < 0.5 ? -1.75 : 2.15);
            }
            break;
        default: // Fallback to medium
            return generateDecimalQuestion(config, 'medium');
    }

    const contextualMagnitude = getDecimalPrecision(value);
    const domain = calculateStandardQuestionDomain(value);

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

function generateFractionQuestion(config, difficulty = 'medium') {
    let validFractions = [];
    let denominators;
    let valueRangePositive = [0, 1]; // Default for easy/medium: (0, 1) exclusive of ends

    switch (difficulty) {
        case 'easy':
            denominators = [2, 5, 10];
            for (const d of denominators) {
                for (let n = 1; n < d; n++) {
                    if ((n / d) % 1 !== 0) { // Value is not an integer
                        validFractions.push({ num: n, den: d, display: `${n}/${d}` });
                    }
                }
            }
            break;
        case 'medium':
            denominators = [2, 3, 4, 5, 10];
            for (const d of denominators) {
                for (let n = 1; n < d; n++) {
                    if ((n / d) % 1 !== 0) {
                        validFractions.push({ num: n, den: d, display: `${n}/${d}` });
                    }
                }
            }
            break;
        case 'hard':
            denominators = [2, 3, 4, 5, 6, 7, 8, 9, 10];
            // Value range for hard: (-2, 2) excluding 0, +/-1
            for (const d of denominators) {
                // For |value| in (0,1)
                for (let n = 1; n < d; n++) {
                    if ((n / d) % 1 !== 0) { // Value is not an integer
                        validFractions.push({ num: n, den: d, display: `${n}/${d}` }); // Positive
                        validFractions.push({ num: -n, den: d, display: `-${n}/${d}` }); // Negative
                    }
                }
                // For |value| in (1,2)
                for (let n = d + 1; n < 2 * d; n++) {
                    if ((n / d) % 1 !== 0) { // Value is not an integer
                        validFractions.push({ num: n, den: d, display: `${n}/${d}` }); // Positive
                        validFractions.push({ num: -n, den: d, display: `-${n}/${d}` }); // Negative
                    }
                }
            }
            break;
        default: // Fallback to medium
            return generateFractionQuestion(config, 'medium');
    }

    if (validFractions.length === 0) {
        // Fallback if no fractions were generated (should not happen with current logic)
        if (config.debug) console.warn(`No valid fractions generated for difficulty: ${difficulty}. Falling back.`);
        if (difficulty === 'hard') return generateFractionQuestion(config, 'medium'); // Try simpler
        return { type: 'fraction', value: 0.5, display: "1/2", initialViewParams: { domain: [0, 1], questionContextualMagnitude: 0.1 } };
    }

    const selected = validFractions[Math.floor(Math.random() * validFractions.length)];
    const value = selected.num / selected.den;

    const domain = calculateStandardQuestionDomain(value);

    let qcm; // Contextual magnitude for tolerance
    if (selected.den <= 4) qcm = 0.1;
    else if (selected.den <= 8) qcm = 0.05;
    else qcm = 0.02; // Tighter for larger denominators

    return {
        type: 'fraction',
        value: value,
        display: `Place ${selected.display}`,
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
        this.typeProbabilities = { // Default mix
            'decimal': 0.6,
            'fraction': 0.4,
        };
        this.currentDifficulty = 'medium'; // Default difficulty
    }

    setDifficulty(difficulty) {
        if (['easy', 'medium', 'hard'].includes(difficulty)) {
            this.currentDifficulty = difficulty;
            if (this.config.debug) console.log(`QuestionFactory difficulty set to: ${difficulty}`);
        } else {
            if (this.config.debug) console.warn(`Invalid difficulty: ${difficulty}. Using current: ${this.currentDifficulty}`);
        }
    }

    setQuestionTypeMix(typesConfig) {
        // (Existing logic for setQuestionTypeMix - remains unchanged)
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
            if (this.config.debug) console.warn("No valid question types in typesConfig. Retaining existing mix:", this.typeProbabilities);
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
                if (this.config.debug) console.warn("Could not normalize probabilities (all zero or no valid types). Retaining existing mix:", this.typeProbabilities);
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
            if (this.config.debug) console.error("No question types available/enabled in QuestionFactory! Falling back to decimal/medium.");
            // Fallback to a specific generator if type selection fails
            return this.questionGenerators['decimal'](this.config, this.currentDifficulty);
        }

        for (const type of availableTypes) {
            cumulativeProb += this.typeProbabilities[type];
            if (rand < cumulativeProb) {
                selectedType = type;
                break;
            }
        }

        if (!selectedType) { // Should only happen if totalProb is not 1 due to float issues, or if availableTypes was empty.
            selectedType = availableTypes[availableTypes.length - 1]; // Pick last available as fallback
        }

        return this.questionGenerators[selectedType](this.config, this.currentDifficulty);
    }
}