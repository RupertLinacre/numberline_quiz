import { getDecimalPrecision } from '../utils/formatter.js';

export class QuestionFactory {
    constructor(config) {
        this.config = config;
    }
    getNextQuestion() {
        // Randomly choose between decimal and fraction questions
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
            if (value < 0.2) { domainMin = 0; domainMax = Math.max(0.5, Math.ceil(value * 2) / 2 + 0.1); }
            if (value > 0.8 && value < 1) { domainMax = 1; domainMin = Math.min(0.5, Math.floor(value * 2) / 2 - 0.1); }

            // Calculate contextual magnitude
            const contextualMagnitude = getDecimalPrecision(value);

            question = {
                type: 'decimal',
                value: value,
                display: `Place ${value}`,
                initialViewParams: {
                    domain: [Math.max(0, domainMin), Math.min(10, domainMax)], // Ensure reasonable bounds
                    questionContextualMagnitude: contextualMagnitude, // New property
                }
            };
        } else { // Fraction
            const fractions = [
                { num: 1, den: 2, display: "1/2" }, { num: 1, den: 4, display: "1/4" },
                { num: 3, den: 4, display: "3/4" }, { num: 1, den: 3, display: "1/3" },
                { num: 2, den: 3, display: "2/3" }, { num: 1, den: 5, display: "1/5" },
                { num: 1, den: 8, display: "1/8" }, { num: 1, den: 10, display: "1/10" }
            ];
            const selected = fractions[Math.floor(Math.random() * fractions.length)];
            question = {
                type: 'fraction',
                value: selected.num / selected.den,
                display: `Place ${selected.display}`,
                initialViewParams: {
                    domain: [0, 1], // Fractions usually between 0 and 1
                    questionContextualMagnitude: null, // No specific magnitude restriction for fractions
                }
            };
        }
        return question;
    }
}
