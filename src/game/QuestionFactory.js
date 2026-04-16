// src/game/QuestionFactory.js
import { formatNumber, getDecimalPrecision } from '../utils/formatter.js';

const epsilon = 1e-9;

const YEAR_GROUP_IDS = [
    'reception',
    'year1',
    'year2',
    'year3',
    'year4',
    'year5',
    'year6',
];

const LEGACY_DIFFICULTY_MAP = {
    easy: 'year2',
    medium: 'year4',
    hard: 'year6',
};

function wholeRange(min, max, step = 1, weight = 1, includeEndpoints = false) {
    return { min, max, step, weight, includeEndpoints };
}

function fraction(num, den, display = `${num}/${den}`, domain = null, weight = 1) {
    return {
        num,
        den,
        display,
        value: num / den,
        domain,
        weight,
    };
}

function decimalRange(min, max, step, dp, domain = null, weight = 1) {
    return { min, max, step, dp, domain, weight };
}

function decimalValues(values, domain = null, weight = 1) {
    return { values, domain, weight };
}

const YEAR_PROFILES = {
    reception: {
        label: 'Reception',
        typeProbabilities: { whole: 1 },
        toleranceRatio: 0.08,
        unitToleranceMultiplier: 0.55,
        minTolerance: 0.45,
        wholeRanges: [
            wholeRange(0, 10, 1, 1, true),
        ],
    },

    year1: {
        label: 'Year 1',
        typeProbabilities: { whole: 1 },
        toleranceRatio: 0.05,
        unitToleranceMultiplier: 0.5,
        minTolerance: 0.4,
        wholeRanges: [
            wholeRange(0, 10, 1, 4, true),
            wholeRange(0, 20, 1, 4, false),
            wholeRange(0, 100, 1, 2, false),
        ],
    },

    year2: {
        label: 'Year 2',
        typeProbabilities: { whole: 0.65, fraction: 0.35 },
        toleranceRatio: 0.04,
        unitToleranceMultiplier: 0.35,
        fractionToleranceRatio: 0.035,
        fractionUnitToleranceMultiplier: 0.16,
        minTolerance: 0.03,
        wholeRanges: [
            wholeRange(0, 50, 1, 2, false),
            wholeRange(0, 100, 1, 3, false),
        ],
        fractions: [
            fraction(1, 2, '1/2', [0, 1], 4),
            fraction(1, 3, '1/3', [0, 1], 3),
            fraction(1, 4, '1/4', [0, 1], 3),
            fraction(2, 4, '2/4', [0, 1], 3),
            fraction(3, 4, '3/4', [0, 1], 3),
            fraction(5, 4, '1 1/4', [0, 2], 1),
            fraction(3, 2, '1 1/2', [0, 2], 1),
            fraction(7, 4, '1 3/4', [0, 2], 1),
        ],
    },

    year3: {
        label: 'Year 3',
        typeProbabilities: { whole: 0.45, fraction: 0.55 },
        toleranceRatio: 0.03,
        unitToleranceMultiplier: 0.28,
        fractionToleranceRatio: 0.025,
        fractionUnitToleranceMultiplier: 0.16,
        minTolerance: 0.02,
        wholeRanges: [
            wholeRange(0, 100, 1, 2, false),
            wholeRange(0, 1000, 1, 3, false),
        ],
        fractions: [
            fraction(1, 10, '1/10', [0, 1], 3),
            fraction(3, 10, '3/10', [0, 1], 3),
            fraction(7, 10, '7/10', [0, 1], 3),
            fraction(1, 5, '1/5', [0, 1], 3),
            fraction(2, 5, '2/5', [0, 1], 3),
            fraction(3, 5, '3/5', [0, 1], 2),
            fraction(1, 4, '1/4', [0, 1], 2),
            fraction(2, 4, '2/4', [0, 1], 2),
            fraction(3, 4, '3/4', [0, 1], 2),
            fraction(1, 3, '1/3', [0, 1], 2),
            fraction(2, 3, '2/3', [0, 1], 2),
            fraction(3, 8, '3/8', [0, 1], 2),
            fraction(5, 8, '5/8', [0, 1], 2),
            fraction(6, 4, '6/4', [0, 2], 1),
            fraction(11, 10, '11/10', [0, 2], 1),
            fraction(13, 10, '13/10', [0, 2], 1),
        ],
    },

    year4: {
        label: 'Year 4',
        typeProbabilities: { whole: 0.25, fraction: 0.35, decimal: 0.4 },
        toleranceRatio: 0.025,
        unitToleranceMultiplier: 0.24,
        fractionToleranceRatio: 0.015,
        fractionUnitToleranceMultiplier: 0.11,
        decimalToleranceRatio: 0.008,
        decimalUnitToleranceMultiplier: 0.35,
        minTolerance: 0.006,
        wholeRanges: [
            wholeRange(0, 1000, 1, 2, false),
            wholeRange(0, 10000, 10, 2, false),
            wholeRange(-20, 20, 1, 1, false),
        ],
        fractions: [
            fraction(1, 2, '1/2', [0, 1], 2),
            fraction(1, 4, '1/4', [0, 1], 2),
            fraction(3, 4, '3/4', [0, 1], 2),
            fraction(1, 5, '1/5', [0, 1], 2),
            fraction(2, 5, '2/5', [0, 1], 2),
            fraction(3, 5, '3/5', [0, 1], 2),
            fraction(3, 8, '3/8', [0, 1], 2),
            fraction(5, 8, '5/8', [0, 1], 2),
            fraction(2, 7, '2/7', [0, 1], 1),
            fraction(3, 7, '3/7', [0, 1], 1),
            fraction(37, 100, '37/100', [0, 1], 2),
            fraction(62, 100, '62/100', [0, 1], 2),
            fraction(5, 4, '5/4', [0, 2], 1),
            fraction(7, 4, '7/4', [0, 2], 1),
        ],
        decimals: [
            decimalValues([0.25, 0.5, 0.75], [0, 1], 4),
            decimalRange(0.1, 0.9, 0.1, 1, [0, 1], 3),
            decimalRange(0.01, 0.99, 0.01, 2, [0, 1], 4),
        ],
    },

    year5: {
        label: 'Year 5',
        typeProbabilities: { whole: 0.2, fraction: 0.35, decimal: 0.45 },
        toleranceRatio: 0.015,
        unitToleranceMultiplier: 0.2,
        fractionToleranceRatio: 0.01,
        fractionUnitToleranceMultiplier: 0.1,
        decimalToleranceRatio: 0.004,
        decimalUnitToleranceMultiplier: 0.25,
        minTolerance: 0.0025,
        wholeRanges: [
            wholeRange(0, 1000, 1, 1, false),
            wholeRange(0, 10000, 10, 1, false),
            wholeRange(0, 1000000, 1000, 2, false),
            wholeRange(-100, 100, 1, 1, false),
        ],
        fractions: [
            fraction(1, 2, '1/2', [0, 1], 2),
            fraction(1, 4, '1/4', [0, 1], 2),
            fraction(3, 4, '3/4', [0, 1], 2),
            fraction(1, 5, '1/5', [0, 1], 2),
            fraction(4, 5, '4/5', [0, 1], 2),
            fraction(1, 10, '1/10', [0, 1], 2),
            fraction(6, 5, '6/5', [0, 2], 1),
            fraction(7, 5, '7/5', [0, 2], 1),
            fraction(9, 4, '9/4', [0, 3], 1),
            fraction(17, 10, '17/10', [0, 2], 1),
            fraction(23, 10, '23/10', [0, 3], 1),
            fraction(3, 20, '3/20', [0, 1], 1),
            fraction(13, 20, '13/20', [0, 1], 1),
            fraction(7, 25, '7/25', [0, 1], 1),
            fraction(19, 25, '19/25', [0, 1], 1),
            fraction(37, 100, '37/100', [0, 1], 1),
            fraction(125, 100, '125/100', [0, 2], 1),
        ],
        decimals: [
            decimalValues([0.1, 0.2, 0.25, 0.5, 0.75, 0.8], [0, 1], 4),
            decimalRange(0.001, 0.999, 0.001, 3, [0, 1], 4),
            decimalRange(1.01, 9.99, 0.01, 2, null, 2),
        ],
    },

    year6: {
        label: 'Year 6',
        typeProbabilities: { whole: 0.18, fraction: 0.34, decimal: 0.36, percentage: 0.12 },
        toleranceRatio: 0.01,
        unitToleranceMultiplier: 0.16,
        fractionToleranceRatio: 0.006,
        fractionUnitToleranceMultiplier: 0.08,
        decimalToleranceRatio: 0.003,
        decimalUnitToleranceMultiplier: 0.2,
        percentageToleranceRatio: 0.006,
        percentageUnitToleranceMultiplier: 0.12,
        minTolerance: 0.0015,
        wholeRanges: [
            wholeRange(0, 1000000, 1000, 1, false),
            wholeRange(0, 10000000, 10000, 2, false),
            wholeRange(-1000, 1000, 10, 2, false),
        ],
        fractions: [
            fraction(2, 7, '2/7', [0, 1], 2),
            fraction(5, 7, '5/7', [0, 1], 1),
            fraction(5, 9, '5/9', [0, 1], 1),
            fraction(7, 12, '7/12', [0, 1], 1),
            fraction(11, 16, '11/16', [0, 1], 1),
            fraction(3, 8, '3/8', [0, 1], 2),
            fraction(5, 8, '5/8', [0, 1], 2),
            fraction(13, 8, '13/8', [0, 2], 1),
            fraction(17, 8, '17/8', [0, 3], 1),
            fraction(11, 6, '11/6', [0, 2], 1),
            fraction(7, 3, '7/3', [0, 3], 1),
            fraction(-3, 4, '-3/4', [-1, 1], 1),
            fraction(-5, 8, '-5/8', [-1, 1], 1),
            fraction(137, 100, '137/100', [0, 2], 1),
        ],
        decimals: [
            decimalValues([0.125, 0.375, 0.625, 0.875], [0, 1], 3),
            decimalRange(0.001, 0.999, 0.001, 3, [0, 1], 4),
            decimalRange(1.001, 9.999, 0.001, 3, null, 2),
            decimalRange(-0.999, 0.999, 0.001, 3, [-1, 1], 1),
        ],
        percentages: [
            { display: '10%', value: 0.1, domain: [0, 1], weight: 1 },
            { display: '12.5%', value: 0.125, domain: [0, 1], weight: 1 },
            { display: '25%', value: 0.25, domain: [0, 1], weight: 2 },
            { display: '37.5%', value: 0.375, domain: [0, 1], weight: 1 },
            { display: '50%', value: 0.5, domain: [0, 1], weight: 2 },
            { display: '75%', value: 0.75, domain: [0, 1], weight: 2 },
            { display: '120%', value: 1.2, domain: [0, 2], weight: 1 },
        ],
    },
};

function isEffectivelyInteger(value) {
    return Math.abs(value - Math.round(value)) < epsilon;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(items) {
    const weightedItems = items.filter(item => (item.weight ?? 1) > 0);
    const totalWeight = weightedItems.reduce((sum, item) => sum + (item.weight ?? 1), 0);

    if (weightedItems.length === 0 || totalWeight <= 0) {
        return null;
    }

    let threshold = Math.random() * totalWeight;
    for (const item of weightedItems) {
        threshold -= item.weight ?? 1;
        if (threshold <= 0) {
            return item;
        }
    }

    return weightedItems[weightedItems.length - 1];
}

function weightedKey(probabilities) {
    const entries = Object.entries(probabilities)
        .filter(([, probability]) => probability > 0);

    if (entries.length === 0) {
        return null;
    }

    const total = entries.reduce((sum, [, probability]) => sum + probability, 0);
    let threshold = Math.random() * total;

    for (const [key, probability] of entries) {
        threshold -= probability;
        if (threshold <= 0) {
            return key;
        }
    }

    return entries[entries.length - 1][0];
}

function roundToDecimalPlaces(value, dp) {
    return Number(value.toFixed(dp));
}

function domainForValue(value) {
    if (value >= 0 && value <= 1) {
        return [0, 1];
    }

    if (value >= -1 && value <= 1) {
        return [-1, 1];
    }

    const floorVal = Math.floor(value);
    const ceilVal = Math.ceil(value);

    if (isEffectivelyInteger(value)) {
        return [value - 1, value + 1];
    }

    return [floorVal, ceilVal];
}

function toleranceFor(profile, domain, unit, questionType = 'whole') {
    const span = Math.max(Math.abs(domain[1] - domain[0]), epsilon);
    const spanRatio = profile[`${questionType}ToleranceRatio`] ?? profile.toleranceRatio;
    const unitMultiplier = profile[`${questionType}UnitToleranceMultiplier`] ?? profile.unitToleranceMultiplier;
    const spanTolerance = span * spanRatio;
    const unitTolerance = Math.abs(unit) * unitMultiplier;

    return Math.max(
        profile.minTolerance,
        Math.max(spanTolerance, unitTolerance)
    );
}

function normalizeProbabilities(probabilities) {
    const clean = {};
    let total = 0;

    for (const [key, probability] of Object.entries(probabilities)) {
        const normalizedProbability = Math.max(0, probability);
        if (normalizedProbability > 0) {
            clean[key] = normalizedProbability;
            total += normalizedProbability;
        }
    }

    if (total <= 0) {
        return {};
    }

    for (const key of Object.keys(clean)) {
        clean[key] /= total;
    }

    return clean;
}

function makeQuestion(type, value, displayValue, domain, contextualMagnitude, tolerance) {
    return {
        type,
        value,
        display: `Place ${displayValue}`,
        answerDisplay: displayValue,
        tolerance,
        initialViewParams: {
            domain,
            questionContextualMagnitude: contextualMagnitude,
        },
    };
}

function generateWholeNumberQuestion(config, profile) {
    const selectedRange = weightedPick(profile.wholeRanges);

    if (!selectedRange) {
        if (config.debug) console.warn(`No whole-number ranges available for ${profile.label}. Falling back to 0-10.`);
        return makeQuestion('whole', 5, '5', [0, 10], 1, toleranceFor(profile, [0, 10], 1, 'whole'));
    }

    const minIndex = selectedRange.includeEndpoints ? 0 : 1;
    const maxIndex = Math.floor((selectedRange.max - selectedRange.min) / selectedRange.step) -
        (selectedRange.includeEndpoints ? 0 : 1);
    const safeMaxIndex = Math.max(minIndex, maxIndex);
    const selectedIndex = randomInt(minIndex, safeMaxIndex);
    const value = selectedRange.min + (selectedIndex * selectedRange.step);
    const domain = [selectedRange.min, selectedRange.max];

    return makeQuestion(
        'whole',
        value,
        formatNumber(value),
        domain,
        selectedRange.step,
        toleranceFor(profile, domain, selectedRange.step, 'whole')
    );
}

function generateFractionQuestion(config, profile) {
    const selectedFraction = weightedPick(profile.fractions || []);

    if (!selectedFraction) {
        if (config.debug) console.warn(`No fractions available for ${profile.label}. Falling back to whole numbers.`);
        return generateWholeNumberQuestion(config, profile);
    }

    const domain = selectedFraction.domain || domainForValue(selectedFraction.value);
    const contextualMagnitude = 1 / Math.abs(selectedFraction.den);

    return makeQuestion(
        'fraction',
        selectedFraction.value,
        selectedFraction.display,
        domain,
        contextualMagnitude,
        toleranceFor(profile, domain, contextualMagnitude, 'fraction')
    );
}

function generateDecimalFromRange(spec) {
    if (spec.values) {
        return weightedPick(spec.values.map(value => ({ value, weight: 1 }))).value;
    }

    const minIndex = Math.ceil((spec.min / spec.step) - epsilon);
    const maxIndex = Math.floor((spec.max / spec.step) + epsilon);
    let value = roundToDecimalPlaces(randomInt(minIndex, maxIndex) * spec.step, spec.dp);

    if (isEffectivelyInteger(value) && spec.step < 1) {
        value = roundToDecimalPlaces(value + spec.step, spec.dp);
        if (value > spec.max) {
            value = roundToDecimalPlaces(value - (2 * spec.step), spec.dp);
        }
    }

    return value;
}

function generateDecimalQuestion(config, profile) {
    const selectedSpec = weightedPick(profile.decimals || []);

    if (!selectedSpec) {
        if (config.debug) console.warn(`No decimals available for ${profile.label}. Falling back to whole numbers.`);
        return generateWholeNumberQuestion(config, profile);
    }

    const value = generateDecimalFromRange(selectedSpec);
    const domain = selectedSpec.domain || domainForValue(value);
    const contextualMagnitude = getDecimalPrecision(value);

    return makeQuestion(
        'decimal',
        value,
        formatNumber(value),
        domain,
        contextualMagnitude,
        toleranceFor(profile, domain, contextualMagnitude, 'decimal')
    );
}

function generatePercentageQuestion(config, profile) {
    const selectedPercentage = weightedPick(profile.percentages || []);

    if (!selectedPercentage) {
        if (config.debug) console.warn(`No percentages available for ${profile.label}. Falling back to decimals.`);
        return generateDecimalQuestion(config, profile);
    }

    const domain = selectedPercentage.domain || domainForValue(selectedPercentage.value);
    const contextualMagnitude = getDecimalPrecision(selectedPercentage.value);

    return makeQuestion(
        'percentage',
        selectedPercentage.value,
        selectedPercentage.display,
        domain,
        contextualMagnitude,
        toleranceFor(profile, domain, contextualMagnitude, 'percentage')
    );
}

export class QuestionFactory {
    constructor(config) {
        this.config = config;
        this.questionGenerators = {
            whole: generateWholeNumberQuestion,
            decimal: generateDecimalQuestion,
            fraction: generateFractionQuestion,
            percentage: generatePercentageQuestion,
        };
        this.currentDifficulty = 'year4';
        this.currentProfile = YEAR_PROFILES[this.currentDifficulty];
        this.typeProbabilities = normalizeProbabilities(this.currentProfile.typeProbabilities);
    }

    setDifficulty(difficulty) {
        const normalizedDifficulty = LEGACY_DIFFICULTY_MAP[difficulty] || difficulty;

        if (YEAR_GROUP_IDS.includes(normalizedDifficulty)) {
            this.currentDifficulty = normalizedDifficulty;
            this.currentProfile = YEAR_PROFILES[normalizedDifficulty];
            this.typeProbabilities = normalizeProbabilities(this.currentProfile.typeProbabilities);
            if (this.config.debug) {
                console.log(`QuestionFactory year group set to: ${this.currentProfile.label}`);
            }
        } else if (this.config.debug) {
            console.warn(`Invalid year group: ${difficulty}. Using current: ${this.currentProfile.label}`);
        }
    }

    setQuestionTypeMix(typesConfig) {
        const newProbabilities = {};

        for (const type in typesConfig) {
            if (this.questionGenerators[type]) {
                newProbabilities[type] = Math.max(0, typesConfig[type]);
            }
        }

        const normalizedProbabilities = normalizeProbabilities(newProbabilities);

        if (Object.keys(normalizedProbabilities).length > 0) {
            this.typeProbabilities = normalizedProbabilities;
        } else if (this.config.debug) {
            console.warn("No valid question types in typesConfig. Retaining existing mix:", this.typeProbabilities);
        }

        if (this.config.debug) {
            console.log(`QuestionFactory type mix set to:`, this.typeProbabilities);
        }
    }

    getNextQuestion() {
        const availableProbabilities = {};

        for (const [type, probability] of Object.entries(this.typeProbabilities)) {
            const generator = this.questionGenerators[type];
            const profileHasQuestions =
                type === 'whole' ||
                (type === 'fraction' && this.currentProfile.fractions?.length > 0) ||
                (type === 'decimal' && this.currentProfile.decimals?.length > 0) ||
                (type === 'percentage' && this.currentProfile.percentages?.length > 0);

            if (generator && probability > 0 && profileHasQuestions) {
                availableProbabilities[type] = probability;
            }
        }

        const selectedType = weightedKey(availableProbabilities);

        if (!selectedType) {
            if (this.config.debug) {
                console.error("No question types available for current profile. Falling back to whole numbers.");
            }
            return generateWholeNumberQuestion(this.config, this.currentProfile);
        }

        return this.questionGenerators[selectedType](this.config, this.currentProfile);
    }
}
