import * as d3 from 'd3';
import { formatNumber } from '../utils/formatter.js';

export class NumberlineRenderer {
    constructor(svgId, config, eventBus) {
        this.svgId = svgId;
        this.config = config;
        this.eventBus = eventBus;
        this.svg = null;
        this.chartArea = null;
        this.baseScale = null;
        this.currentTransform = d3.zoomIdentity;
        this.zoomBehavior = null;
        this.marker = null;
        this.markerDataValue = null;
        // this.labelsToHide = null; // Deprecated, replaced by questionContextualMagnitude
        this.questionContextualMagnitude = null; // New property for contextual magnitude
        this.correctAnswerHighlightValue = null; // Store the data value for the highlight
    }

    init() {
        this.svg = d3.select(`#${this.svgId}`)
            .attr('width', this.config.svgWidth)
            .attr('height', this.config.svgHeight);

        this.chartArea = this.svg.append('g')
            .attr('transform', `translate(${this.config.margins.left}, ${this.config.margins.top})`);

        const chartWidth = this.config.svgWidth - this.config.margins.left - this.config.margins.right;

        this.baseScale = d3.scaleLinear()
            .domain(this.config.initialDomain)
            .range([0, chartWidth]);

        this.chartArea.append('line')
            .attr('class', 'axis-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('stroke', 'black');

        this.zoomBehavior = d3.zoom()
            .scaleExtent([
                this.config.minZoomScale || 0.1,
                this.config.maxZoomScale || 100
            ])
            .on('zoom', (event) => {
                if (event.sourceEvent && event.sourceEvent.type === "dblclick") return;
                this.updateAxis(event.transform);
            });
        this.svg.call(this.zoomBehavior).on("dblclick.zoom", null);

        this._initMarker();
        this.updateAxis(this.currentTransform);
        this.resetMarker();

        if (this.config.debug) console.log("NumberlineRenderer initialized.");

        this.eventBus.on('NEW_QUESTION_READY', (data) => {
            if (data.initialViewParams) {
                if (data.initialViewParams.domain) {
                    this.setDomain(data.initialViewParams.domain);
                }
                // Store the questionContextualMagnitude
                this.questionContextualMagnitude = (data.initialViewParams.questionContextualMagnitude !== undefined)
                    ? data.initialViewParams.questionContextualMagnitude
                    : null;
                // Remove or comment out the old labelsToHide logic if it's fully replaced
                // this.labelsToHide = data.initialViewParams.labelsToHide || null;
            }
            this._clearCorrectAnswerHighlight(); // Clear highlight for new question
            this.resetMarker();
        });

        this.eventBus.on('SHOW_FEEDBACK', (data) => {
            this._clearCorrectAnswerHighlight(); // Clear any existing highlight first
            if (data.correctAnswer !== undefined && data.type === 'error') {
                this._setCorrectAnswerHighlightValue(data.correctAnswer); // Set value and trigger update
            }
        });
    }

    _initMarker() {
        if (this.markerDataValue === null) {
            const domain = this.baseScale.domain();
            this.markerDataValue = domain[0] + (domain[1] - domain[0]) / 2;
        }

        this.marker = this.chartArea.append('g').attr('class', 'draggable-marker');

        this.marker.append('line')
            .attr('y1', - (this.config.majorTickLength || 10) * 1.5)
            .attr('y2', (this.config.majorTickLength || 10) * 1.5)
            .attr('stroke', 'red')
            .attr('stroke-width', 2);

        this.marker.append('circle')
            .attr('cy', 0)
            .attr('r', 5)
            .attr('fill', 'red')
            .style('cursor', 'ew-resize');

        const dragBehavior = d3.drag()
            .on('drag', (event) => {
                const currentScale = this.currentTransform.rescaleX(this.baseScale);
                this.markerDataValue = currentScale.invert(event.x);
                this._updateMarkerScreenPosition();
                this.eventBus.emit('MARKER_DRAGGED', { currentValue: this.markerDataValue });
            })
            .on('end', () => {
                this.eventBus.emit('MARKER_VALUE_FINALIZED', { value: this.markerDataValue });
            });

        this.marker.call(dragBehavior);
    }

    _updateMarkerScreenPosition() {
        if (!this.marker || this.markerDataValue === null) return;
        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        const xPosition = currentScale(this.markerDataValue);

        if (!isFinite(xPosition)) {
            if (this.config.debug) console.warn("Marker screen position is not finite for value:", this.markerDataValue);
            return;
        }
        this.marker.attr('transform', `translate(${xPosition}, 0)`);
    }

    _calculateTickLevels(currentScale) {
        const [domainMin, domainMax] = currentScale.domain();
        let domainWidth = domainMax - domainMin;

        const chartWidth = this.config.svgWidth - this.config.margins.left - this.config.margins.right;

        if (domainWidth <= 1e-12 || !isFinite(domainWidth) || isNaN(domainWidth) || chartWidth <= 0) {
            return [];
        }

        const targetMajorTicksOnScreen = this.config.targetMajorTicksOnScreen || 5;
        const minPixelSeparationForMajor = this.config.minPixelSeparationForMajor || 50;
        const maxPixelSeparationForMajor = minPixelSeparationForMajor * (this.config.majorTickPixelSeparationMultiplier || 3);

        let idealNumMajorTicks = Math.max(1, Math.min(targetMajorTicksOnScreen, chartWidth / minPixelSeparationForMajor));
        if (!isFinite(idealNumMajorTicks) || idealNumMajorTicks <= 0) idealNumMajorTicks = 1;

        let majorStepLog = Math.log10(domainWidth / idealNumMajorTicks);
        if (!isFinite(majorStepLog)) majorStepLog = 0;

        let majorStep = Math.pow(10, Math.floor(majorStepLog));

        if (majorStep <= 1e-12 || !isFinite(majorStep)) {
            majorStep = Math.pow(10, Math.floor(Math.log10(domainWidth > 1e-9 ? domainWidth : 1) / 2));
            if (majorStep <= 1e-12 || !isFinite(majorStep)) majorStep = 1;
        }

        let iterations = 0;
        const MAX_ITERATIONS = 15;

        let pixelsPerMajorStep = majorStep * (chartWidth / domainWidth);
        while (iterations < MAX_ITERATIONS && pixelsPerMajorStep < minPixelSeparationForMajor && majorStep * 10 < domainWidth * 1e5) {
            majorStep *= 10;
            pixelsPerMajorStep = majorStep * (chartWidth / domainWidth);
            iterations++;
            if (majorStep <= 1e-12 || !isFinite(majorStep)) break;
        }

        iterations = 0;
        while (iterations < MAX_ITERATIONS && pixelsPerMajorStep > maxPixelSeparationForMajor && (majorStep / 10) > 1e-12) {
            const nextMajorStep = majorStep / 10;
            const nextPixelsPerMajorStep = nextMajorStep * (chartWidth / domainWidth);
            if (nextPixelsPerMajorStep < minPixelSeparationForMajor / 2 && pixelsPerMajorStep < maxPixelSeparationForMajor * 1.5) break;
            majorStep = nextMajorStep;
            pixelsPerMajorStep = nextPixelsPerMajorStep;
            iterations++;
            if (majorStep <= 1e-12 || !isFinite(majorStep)) break;
        }

        if (majorStep <= 1e-12 || !isFinite(majorStep)) {
            if (this.config.debug) console.warn("Major step calculation resulted in invalid value, returning empty ticks.", majorStep);
            return [];
        }

        const minorStep = majorStep / 10;
        const ticks = [];
        const MAX_TICKS_TO_GENERATE = this.config.maxTicksToGenerate || 300;

        let iterationStep = minorStep;
        if (minorStep < 1e-9 || (majorStep / minorStep > 100 && pixelsPerMajorStep / 10 < 5)) {
            iterationStep = majorStep;
        }
        if (iterationStep <= 1e-12 || !isFinite(iterationStep)) return [];

        const startValMultiplier = domainMin / iterationStep;
        const endValMultiplier = domainMax / iterationStep;

        if (!isFinite(startValMultiplier) || !isFinite(endValMultiplier)) return [];

        const startValue = Math.floor(startValMultiplier - 1e-9) * iterationStep;
        const endValue = Math.ceil(endValMultiplier + 1e-9) * iterationStep;

        if (!isFinite(startValue) || !isFinite(endValue) || startValue > endValue) return [];

        if ((endValue - startValue) / iterationStep > MAX_TICKS_TO_GENERATE * 2 && iterationStep > 1e-9) {
            if (this.config.debug) console.warn(`Predicted tick count too high (${(endValue - startValue) / iterationStep}), potentially increasing iteration step.`);
            iterationStep = majorStep;
            if ((endValue - startValue) / iterationStep > MAX_TICKS_TO_GENERATE * 2) {
                if (this.config.debug) console.warn("Still too many ticks even with major step. Returning empty.");
                return [];
            }
        }

        for (let v = startValue; v <= endValue + 1e-9; v += iterationStep) {
            if (ticks.length >= MAX_TICKS_TO_GENERATE) {
                if (this.config.debug) console.warn("Max ticks generated, breaking loop.", ticks.length);
                break;
            }
            let tickValue = parseFloat(v.toPrecision(12));
            if (Math.abs(tickValue) < 1e-9 * iterationStep && tickValue !== 0) {
                tickValue = 0;
            }

            const remainderFromMajor = Math.abs(tickValue % majorStep);
            const isMajor = (remainderFromMajor < 1e-9 * majorStep) || (Math.abs(remainderFromMajor - majorStep) < 1e-9 * majorStep);

            if (!isMajor && iterationStep === majorStep) continue;

            ticks.push({ value: tickValue, isMajor: isMajor });
        }
        return ticks;
    }

    updateAxis(transform) {
        this.currentTransform = transform;
        const currentScale = this.currentTransform.rescaleX(this.baseScale);

        // Clear previous ticks
        this.chartArea.selectAll('g.tick').remove();
        const tickData = this._calculateTickLevels(currentScale);


        const ticks = this.chartArea.selectAll('g.tick')
            .data(tickData, d => d.value)
            .join('g')
            .attr('class', d => `tick ${d.isMajor ? 'major' : 'minor'}`)
            .attr('transform', d => {
                const xPos = currentScale(d.value);
                if (!isFinite(xPos)) return "translate(0,0) scale(0)";
                return `translate(${xPos}, 0)`;
            });

        ticks.append('line')
            .attr('y1', 0)
            .attr('y2', d => d.isMajor ? (this.config.majorTickLength || 10) : (this.config.minorTickLength || 5))
            .attr('stroke', d => d.isMajor ? '#333' : '#aaa');

        // New label rendering logic based on questionContextualMagnitude
        ticks.filter(d => d.isMajor)
            .filter(d => {
                if (this.questionContextualMagnitude === null || this.questionContextualMagnitude <= 1e-9) {
                    // No specific magnitude from question (e.g., for fractions or if it's extremely small/zero),
                    // or if the magnitude is invalidly small, allow all major tick labels.
                    return true;
                }
                // Determine the magnitude at which labels ARE allowed.
                // This is one order of magnitude coarser than the question's precision.
                const allowedLabelingMagnitude = this.questionContextualMagnitude * 10;
                // Check if d.value is an "integer" multiple of allowedLabelingMagnitude (within floating point tolerance).
                const ratio = d.value / allowedLabelingMagnitude;
                // Check if ratio is close to an integer. Add tolerance for floating point.
                const isMultipleOfAllowedMagnitude = Math.abs(ratio - Math.round(ratio)) < 1e-9;
                return isMultipleOfAllowedMagnitude;
            })
            // .filter(d => !(this.labelsToHide && this.labelsToHide.includes(d.value))) // Old filter: remove or comment out
            .append('text')
            .attr('y', (this.config.majorTickLength || 10) + 12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(d => formatNumber(d.value));

        const chartWidth = this.config.svgWidth - this.config.margins.left - this.config.margins.right;
        this.chartArea.select('.axis-line').attr('x2', chartWidth);

        this._updateMarkerScreenPosition();

        // Manage Correct Answer Highlight
        this.chartArea.selectAll('.correct-answer-highlight').remove(); // Always clear previous DOM element

        if (this.correctAnswerHighlightValue !== null) {
            const xPosition = currentScale(this.correctAnswerHighlightValue);
            if (isFinite(xPosition)) {
                const highlightLength = (this.config.majorTickLength || 10) * 1.8;
                this.chartArea.append('line')
                    .attr('class', 'correct-answer-highlight')
                    .attr('x1', xPosition)
                    .attr('x2', xPosition)
                    .attr('y1', -highlightLength)
                    .attr('y2', highlightLength)
                    .attr('stroke', 'green')
                    .attr('stroke-width', 2)

            } else {
                if (this.config.debug) console.warn("Cannot draw correct answer highlight, position not finite for value:", this.correctAnswerHighlightValue);
            }
        }

        if (this.config.debug) console.log("NumberlineRenderer axis updated.");
    }

    setDomain(newDomain) {
        this.baseScale.domain(newDomain);
        this.currentTransform = d3.zoomIdentity;
        if (this.svg && this.zoomBehavior) {
            this.svg.call(this.zoomBehavior.transform, d3.zoomIdentity);
        }
        // `updateAxis` will be called implicitly by the zoom reset's "end" event,
        // or explicitly if the zoom reset doesn't trigger 'zoom' event with identity.
        // To be safe, call it directly.
        this.updateAxis(this.currentTransform);
        if (this.config.debug) console.log("Numberline domain set to:", newDomain);
    }

    getCurrentMarkerValue() {
        return this.markerDataValue;
    }

    resetMarker(initialValue) {
        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        if (initialValue !== undefined) {
            this.markerDataValue = initialValue;
        } else {
            const domain = currentScale.domain();
            if (isFinite(domain[0]) && isFinite(domain[1]) && domain[1] > domain[0]) {
                this.markerDataValue = domain[0] + (domain[1] - domain[0]) / 2;
            } else {
                const baseDomain = this.baseScale.domain();
                this.markerDataValue = baseDomain[0] + (baseDomain[1] - baseDomain[0]) / 2;
                if (this.config.debug) console.warn("Marker reset to fallback due to invalid currentScale domain:", domain);
            }
        }
        // `_updateMarkerScreenPosition` is called by `updateAxis`.
        // If `updateAxis` isn't called for other reasons, call `_updateMarkerScreenPosition` directly.
        // However, marker position should ideally be part of the main `updateAxis` rendering flow.
        // For now, let `updateAxis` handle it if called, or call directly if needed.
        // Since resetMarker often implies a view change that needs a full updateAxis:
        this.updateAxis(this.currentTransform); // This will also update the marker position.
        if (this.config.debug) console.log("Marker reset to:", this.markerDataValue);
    }

    // Method to set the value for the highlight and trigger an update
    _setCorrectAnswerHighlightValue(value) {
        this.correctAnswerHighlightValue = value;
        this.updateAxis(this.currentTransform); // Trigger redraw to show/update highlight
    }

    // Method to clear the highlight value and trigger an update
    _clearCorrectAnswerHighlight() {
        if (this.correctAnswerHighlightValue !== null) { // Only update if there was a highlight
            this.correctAnswerHighlightValue = null;
            this.updateAxis(this.currentTransform); // Trigger redraw to remove highlight
        } else {
            // Fallback: If no value was set, but DOM element might exist from a glitch, try to remove it.
            // This is less critical if updateAxis always clears it first.
            this.chartArea.selectAll('.correct-answer-highlight').remove();
        }
    }
}