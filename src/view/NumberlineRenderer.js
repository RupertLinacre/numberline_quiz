// src/view/NumberlineRenderer.js
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

        this.currentQuestionType = null;
        this.questionContextualMagnitude = null;

        // New state for feedback visuals
        this.isFeedbackActive = false;
        this.feedbackCorrectValue = null;
        this.feedbackUserValue = null; // Will store user's answer if incorrect

        // Groups for feedback elements
        this.feedbackCorrectGroup = null;
        this.feedbackUserGroup = null;

        this.effectiveSvgWidth = 0;
        this.chartWidth = 0;
    }

    init() {
        this.svg = d3.select(`#${this.svgId}`)
            .attr('height', this.config.svgHeight);

        this.chartArea = this.svg.append('g');

        this.baseScale = d3.scaleLinear()
            .domain(this.config.initialDomain);

        this.chartArea.append('line')
            .attr('class', 'axis-line')
            .attr('y1', 0)
            .attr('y2', 0);

        this._updateDimensionsAndScales();

        // Initialize feedback groups (before marker, so marker is on top if overlapping)
        this.feedbackCorrectGroup = this.chartArea.append('g')
            .attr('class', 'feedback-correct-answer-group')
            .style('visibility', 'hidden');
        this.feedbackCorrectGroup.append('line')
            .attr('class', 'feedback-line-correct'); // Styled by CSS
        this.feedbackCorrectGroup.append('text')
            .attr('class', 'feedback-text-correct') // Styled by CSS
            .attr('text-anchor', 'middle');

        this.feedbackUserGroup = this.chartArea.append('g')
            .attr('class', 'feedback-user-answer-group')
            .style('visibility', 'hidden');
        // No line for user answer, text is relative to the draggable marker
        this.feedbackUserGroup.append('text')
            .attr('class', 'feedback-text-user') // Styled by CSS
            .attr('text-anchor', 'middle');


        this.zoomBehavior = d3.zoom()
            .scaleExtent([
                this.config.minZoomScale || 0.1,
                this.config.maxZoomScale || 100
            ])
            .on('zoom', (event) => {
                if (event.sourceEvent && event.sourceEvent.type === "dblclick") return;
                if (this.chartWidth <= 0) {
                    if (this.config.debug) console.warn("Zoom event ignored, chartWidth is not positive.");
                    return;
                }
                this.updateAxis(event.transform);
            });

        this.svg.call(this.zoomBehavior).on("dblclick.zoom", null);
        this._initMarker();

        this.chartArea.on('click', (event) => {
            if (event.defaultPrevented) return;
            if (this.chartWidth <= 0) return;

            let target = event.target;
            let isMarkerOrChildClick = false;
            if (this.marker) {
                let markerNode = this.marker.node();
                while (target && target !== this.svg.node()) {
                    if (target === markerNode) {
                        isMarkerOrChildClick = true;
                        break;
                    }
                    target = target.parentNode;
                }
            }
            if (isMarkerOrChildClick) return;

            const currentScale = this.currentTransform.rescaleX(this.baseScale);
            const [xPositionInChartArea] = d3.pointer(event, this.chartArea.node());
            this.markerDataValue = currentScale.invert(xPositionInChartArea);
            this._updateMarkerScreenPosition();
            this.eventBus.emit('MARKER_VALUE_FINALIZED', { value: this.markerDataValue });
            if (this.config.debug) console.log("Marker positioned by click on chartArea to value:", this.markerDataValue);
        });

        this.updateAxis(this.currentTransform);
        this.resetMarker();

        if (this.config.debug) console.log("NumberlineRenderer initialized.");

        this.eventBus.on('NEW_QUESTION_READY', (data) => {
            this.isFeedbackActive = false; // Hide feedback for new question

            if (data.questionData) {
                this.currentQuestionType = data.questionData.type;
            } else {
                this.currentQuestionType = null;
            }

            if (data.initialViewParams) {
                this.questionContextualMagnitude = (data.initialViewParams.questionContextualMagnitude !== undefined)
                    ? data.initialViewParams.questionContextualMagnitude
                    : null;
                if (data.initialViewParams.domain) {
                    this.setDomain(data.initialViewParams.domain);
                }
            } else {
                this.questionContextualMagnitude = null;
            }

            this.resetMarker();
            // updateAxis will be called by setDomain or resetMarker, which will hide feedback
            // If setDomain wasn't called, explicitly call updateAxis if necessary
            if (!(data.initialViewParams && data.initialViewParams.domain)) {
                this.updateAxis(this.currentTransform);
            }
        });

        this.eventBus.on('SHOW_FEEDBACK', (data) => {
            this.isFeedbackActive = true;
            this.feedbackCorrectValue = data.correctAnswer;
            this.feedbackUserValue = data.userAnswer; // Will be null if answer was correct

            this.updateAxis(this.currentTransform); // Redraw to show feedback
        });
    }

    _updateDimensionsAndScales() {
        const svgNode = this.svg.node();
        if (!svgNode) {
            if (this.config.debug) console.error("SVG node not found in _updateDimensionsAndScales");
            return;
        }
        this.effectiveSvgWidth = svgNode.clientWidth || this.config.svgWidth || 800;
        if (this.effectiveSvgWidth <= 0) {
            if (this.config.debug) console.warn("Effective SVG width is 0 or negative. Using fallback. Ensure SVG is visible.");
            this.effectiveSvgWidth = this.config.svgWidth || 800;
        }
        this.svg.attr('viewBox', `0 0 ${this.effectiveSvgWidth} ${this.config.svgHeight}`);
        this.chartWidth = this.effectiveSvgWidth - this.config.margins.left - this.config.margins.right;
        if (this.chartWidth <= 0) {
            if (this.config.debug) console.warn(`Chart width is ${this.chartWidth} (non-positive) after margins. Forcing to 50% of SVG width and adjusting margins for chartArea.`);
            this.config.margins.left = this.effectiveSvgWidth * 0.25;
            this.config.margins.right = this.effectiveSvgWidth * 0.25;
            this.chartWidth = this.effectiveSvgWidth * 0.5;
            if (this.chartWidth <= 0) this.chartWidth = 1;
        }
        this.chartArea.attr('transform', `translate(${this.config.margins.left}, ${this.config.margins.top})`);
        let backgroundRect = this.chartArea.select('.chart-background');
        if (backgroundRect.empty()) {
            backgroundRect = this.chartArea.insert('rect', ':first-child')
                .attr('class', 'chart-background')
                .attr('fill', 'transparent');
        }
        backgroundRect
            .attr('x', 0)
            .attr('y', -this.config.margins.top)
            .attr('width', this.chartWidth)
            .attr('height', this.config.svgHeight);
        this.baseScale.range([0, this.chartWidth]);
        this.chartArea.select('.axis-line')
            .attr('x1', 0)
            .attr('x2', this.chartWidth);
        if (this.config.debug) {
            console.log(`Dimensions updated: effectiveSvgWidth=${this.effectiveSvgWidth}, chartWidth=${this.chartWidth}`);
        }
    }

    handleResize() {
        if (this.config.debug) console.log("Handling resize...");
        this._updateDimensionsAndScales();
        this.updateAxis(this.currentTransform);
        this._updateMarkerScreenPosition();
    }

    _initMarker() {
        if (this.markerDataValue === null) {
            const domain = this.baseScale.domain();
            if (domain && domain.length === 2 && isFinite(domain[0]) && isFinite(domain[1])) {
                this.markerDataValue = domain[0] + (domain[1] - domain[0]) / 2;
            } else {
                this.markerDataValue = 0.5;
                if (this.config.debug) console.warn("Marker value fallback in _initMarker due to baseScale domain issue.");
            }
        }
        this.marker = this.chartArea.append('g').attr('class', 'draggable-marker');
        const markerLineLengthRatio = (this.config.markerConfig && this.config.markerConfig.lineWidthToMajorTickRatio) || 1.5;
        const majorTickLen = this.config.majorTickLength || 20;
        this.marker.append('line')
            .attr('y1', -(majorTickLen * markerLineLengthRatio))
            .attr('y2', (majorTickLen * markerLineLengthRatio))
            .attr('stroke-width', 2);
        this.marker.append('circle')
            .attr('cy', 0)
            .attr('r', (this.config.markerConfig && this.config.markerConfig.circleRadius) || 10)
            .style('cursor', 'ew-resize');
        const dragBehavior = d3.drag()
            .on('start', (event) => {
                if (event && event.sourceEvent) event.sourceEvent.stopPropagation();
                if (this.chartWidth <= 0) if (this.config.debug) console.warn("Marker drag started with non-positive chartWidth.");
            })
            .on('drag', (event) => {
                if (this.chartWidth <= 0) return;
                const currentScale = this.currentTransform.rescaleX(this.baseScale);
                this.markerDataValue = currentScale.invert(event.x);
                this._updateMarkerScreenPosition();
                this.eventBus.emit('MARKER_DRAGGED', { currentValue: this.markerDataValue });
            })
            .on('end', () => {
                if (this.chartWidth <= 0) return;
                this.eventBus.emit('MARKER_VALUE_FINALIZED', { value: this.markerDataValue });
            });
        this.marker.call(dragBehavior);
        this._updateMarkerScreenPosition();
    }

    _updateMarkerScreenPosition() {
        if (!this.marker || this.markerDataValue === null || this.chartWidth <= 0) return;
        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        const xPosition = currentScale(this.markerDataValue);
        if (!isFinite(xPosition) || isNaN(xPosition)) {
            if (this.config.debug) console.warn("Marker screen position is not finite/NaN for value:", this.markerDataValue);
            return;
        }
        this.marker.attr('transform', `translate(${xPosition}, 0)`);
    }

    _calculateTickLevels(currentScale) {
        const [domainMin, domainMax] = currentScale.domain();
        let domainWidth = domainMax - domainMin;
        const currentChartWidth = this.chartWidth;

        if (domainWidth <= 1e-12 || !isFinite(domainWidth) || isNaN(domainWidth) || currentChartWidth <= 0) {
            return [];
        }

        const targetMajorTicksOnScreen = this.config.targetMajorTicksOnScreen || 5;
        const minPixelSeparationForMajor = this.config.minPixelSeparationForMajor || 50;
        const maxPixelSeparationForMajor = minPixelSeparationForMajor * (this.config.majorTickPixelSeparationMultiplier || 3);
        let idealNumMajorTicks = Math.max(1, Math.min(targetMajorTicksOnScreen, currentChartWidth / minPixelSeparationForMajor));
        if (!isFinite(idealNumMajorTicks) || idealNumMajorTicks <= 0) idealNumMajorTicks = 1;

        let majorStepLog = Math.log10(domainWidth / idealNumMajorTicks);
        if (!isFinite(majorStepLog) || isNaN(majorStepLog)) majorStepLog = 0;
        let majorStep = Math.pow(10, Math.floor(majorStepLog));

        if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) {
            majorStep = Math.pow(10, Math.floor(Math.log10(domainWidth > 1e-9 ? domainWidth : 1) / 2));
            if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) majorStep = 1;
        }

        let iterations = 0; const MAX_ITERATIONS = 15;
        let pixelsPerMajorStep = majorStep * (currentChartWidth / domainWidth);
        while (iterations < MAX_ITERATIONS && pixelsPerMajorStep < minPixelSeparationForMajor && majorStep * 10 < domainWidth * 1e5) {
            majorStep *= 10;
            pixelsPerMajorStep = majorStep * (currentChartWidth / domainWidth);
            iterations++;
            if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) break;
        }
        iterations = 0;
        while (iterations < MAX_ITERATIONS && pixelsPerMajorStep > maxPixelSeparationForMajor && (majorStep / 10) > 1e-12) {
            const nextMajorStep = majorStep / 10;
            const nextPixelsPerMajorStep = nextMajorStep * (currentChartWidth / domainWidth);
            if (nextPixelsPerMajorStep < minPixelSeparationForMajor / 2 && pixelsPerMajorStep < maxPixelSeparationForMajor * 1.5) break;
            majorStep = nextMajorStep;
            pixelsPerMajorStep = nextPixelsPerMajorStep;
            iterations++;
            if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) break;
        }

        if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) return [];

        const minorStep = majorStep / 10;
        const ticks = [];
        const MAX_TICKS_TO_GENERATE = this.config.maxTicksToGenerate || 300;
        let iterationStep = minorStep;
        if (minorStep < 1e-9 || (currentChartWidth / (domainWidth / minorStep) < 5 && minorStep !== majorStep)) {
            iterationStep = majorStep;
        }
        if (iterationStep <= 1e-12 || !isFinite(iterationStep) || isNaN(iterationStep)) return [];

        const startValMultiplier = domainMin / iterationStep;
        const endValMultiplier = domainMax / iterationStep;
        if (!isFinite(startValMultiplier) || !isFinite(endValMultiplier) || isNaN(startValMultiplier) || isNaN(endValMultiplier)) return [];

        const startValue = Math.floor(startValMultiplier - 1e-9) * iterationStep;
        const endValue = Math.ceil(endValMultiplier + 1e-9) * iterationStep;
        if (!isFinite(startValue) || !isFinite(endValue) || isNaN(startValue) || isNaN(endValue) || startValue > endValue) return [];

        const numPredictedTicks = (endValue - startValue) / iterationStep;
        if (numPredictedTicks > MAX_TICKS_TO_GENERATE * 2 && iterationStep > 1e-9 && iterationStep !== majorStep) {
            iterationStep = majorStep;
            if ((endValue - startValue) / iterationStep > MAX_TICKS_TO_GENERATE * 2) return [];
        }

        for (let v = startValue; v <= endValue + 1e-9; v += iterationStep) {
            if (ticks.length >= MAX_TICKS_TO_GENERATE) break;
            let tickValue = parseFloat(v.toPrecision(12));
            if (Math.abs(tickValue) < 1e-9 * iterationStep && tickValue !== 0) tickValue = 0;
            const remainderFromMajor = Math.abs(tickValue % majorStep);
            const isMajor = (remainderFromMajor < 1e-9 * majorStep) || (Math.abs(remainderFromMajor - majorStep) < 1e-9 * majorStep);
            if (iterationStep === majorStep && !isMajor) continue;
            let isMidMinor = false;
            if (!isMajor && minorStep > 1e-9) {
                const halfMajorStep = majorStep / 2;
                if (Math.abs(remainderFromMajor - halfMajorStep) < 1e-9 * majorStep) isMidMinor = true;
            }
            ticks.push({ value: tickValue, isMajor: isMajor, isMidMinor: isMidMinor });
        }
        return ticks;
    }

    updateAxis(transform) {
        if (this.chartWidth <= 0) {
            this._updateDimensionsAndScales();
            if (this.chartWidth <= 0) {
                if (this.config.debug) console.error("updateAxis aborted: chartWidth is still not positive.");
                return;
            }
        }

        this.currentTransform = transform;
        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        this.chartArea.selectAll('g.tick').remove();
        const tickData = this._calculateTickLevels(currentScale);

        const ticks = this.chartArea.selectAll('g.tick')
            .data(tickData, d => d.value)
            .join('g')
            .attr('class', d => `tick ${d.isMajor ? 'major' : 'minor'}`)
            .attr('transform', d => {
                const xPos = currentScale(d.value);
                if (!isFinite(xPos) || isNaN(xPos)) return "translate(0,0) scale(0)";
                return `translate(${xPos}, 0)`;
            });

        ticks.append('line')
            .attr('y1', 0)
            .attr('y2', d => {
                if (d.isMajor) return this.config.majorTickLength || 20;
                if (d.isMidMinor) return this.config.midMinorTickLength || 15;
                return this.config.minorTickLength || 10;
            });

        ticks.filter(d => d.isMajor)
            .filter(d => {
                if (this.currentQuestionType === 'fraction') return true;
                if (this.questionContextualMagnitude === null || this.questionContextualMagnitude <= 1e-9) return true;
                const allowedLabelingMagnitude = this.questionContextualMagnitude * 10;
                if (Math.abs(allowedLabelingMagnitude) < 1e-12) return true;
                if (Math.abs(d.value) < 1e-12) return true;
                const ratio = d.value / allowedLabelingMagnitude;
                return Math.abs(ratio - Math.round(ratio)) < 1e-9;
            })
            .append('text')
            .attr('y', (this.config.majorTickLength || 20) + ((this.config.labelFontSizePx || 20) * 0.8))
            .attr('text-anchor', 'middle')
            .attr('font-size', `${this.config.labelFontSizePx || 20}px`)
            .text(d => formatNumber(d.value));

        this._updateMarkerScreenPosition();
        this._renderFeedbackVisuals(currentScale); // New call to render feedback
    }

    _renderFeedbackVisuals(currentScale) {
        const labelFontSize = this.config.labelFontSizePx || 20;
        const textYOffset = labelFontSize * 1.2; // Standard offset below a line/marker

        if (!this.isFeedbackActive || this.feedbackCorrectValue === null) {
            this.feedbackCorrectGroup.style('visibility', 'hidden');
            this.feedbackUserGroup.style('visibility', 'hidden');
            return;
        }

        // --- Correct Answer Visuals (Green Line and Text) ---
        this.feedbackCorrectGroup.style('visibility', 'visible');
        const xCorrect = currentScale(this.feedbackCorrectValue);
        if (!isFinite(xCorrect) || isNaN(xCorrect)) {
            this.feedbackCorrectGroup.style('visibility', 'hidden');
        } else {
            this.feedbackCorrectGroup.attr('transform', `translate(${xCorrect}, 0)`);
        }

        const hlConfig = this.config.correctAnswerHighlightConfig || {};
        const highlightLengthRatio = hlConfig.lengthToMajorTickRatio || 1.8;
        const highlightBaseLength = this.config.majorTickLength || 20;
        const highlightActualLength = highlightBaseLength * highlightLengthRatio;
        const highlightStrokeWidth = hlConfig.strokeWidth || 3;

        this.feedbackCorrectGroup.select('line')
            .attr('y1', -highlightActualLength / 2)
            .attr('y2', highlightActualLength / 2)
            .attr('stroke-width', highlightStrokeWidth);

        const yGreenText = (highlightActualLength / 2) + textYOffset;
        this.feedbackCorrectGroup.select('text')
            .attr('y', yGreenText)
            .text(formatNumber(this.feedbackCorrectValue))
            .style('font-size', `${labelFontSize}px`);

        // --- User Answer Visuals (Red Text, if incorrect) ---
        if (this.feedbackUserValue !== null) {
            this.feedbackUserGroup.style('visibility', 'visible');
            const xUser = currentScale(this.feedbackUserValue);
            if (!isFinite(xUser) || isNaN(xUser)) {
                this.feedbackUserGroup.style('visibility', 'hidden');
            } else {
                this.feedbackUserGroup.attr('transform', `translate(${xUser}, 0)`);
            }

            const markerConfig = this.config.markerConfig || {};
            const markerLineLengthRatio = markerConfig.lineWidthToMajorTickRatio || 1.5;
            const markerBaseLength = this.config.majorTickLength || 20;
            const markerActualLength = markerBaseLength * markerLineLengthRatio;

            const defaultYRedText = (markerActualLength / 2) + textYOffset;
            let finalYRedText = defaultYRedText;

            // Check for horizontal proximity to green text and adjust Y if needed
            const horizontalProximityThreshold = labelFontSize * 3; // Approx 3 characters wide
            if (isFinite(xUser) && isFinite(xCorrect) && Math.abs(xUser - xCorrect) < horizontalProximityThreshold) {
                const minYRedText = yGreenText + labelFontSize + (labelFontSize * 0.3); // Green text Y + 1 font height + padding
                finalYRedText = Math.max(defaultYRedText, minYRedText);
            }

            this.feedbackUserGroup.select('text')
                .attr('y', finalYRedText)
                .text(formatNumber(this.feedbackUserValue))
                .style('font-size', `${labelFontSize}px`);
        } else {
            this.feedbackUserGroup.style('visibility', 'hidden');
        }
    }


    setDomain(newDomain) {
        if (this.chartWidth <= 0) {
            this._updateDimensionsAndScales();
            if (this.chartWidth <= 0) {
                if (this.config.debug) console.error("setDomain aborted: chartWidth is still not positive.");
                return;
            }
        }
        this.baseScale.domain(newDomain);
        this.currentTransform = d3.zoomIdentity;
        if (this.svg && this.zoomBehavior) {
            const currentZoomHandler = this.zoomBehavior.on("zoom");
            this.zoomBehavior.on("zoom", null);
            this.svg.call(this.zoomBehavior.transform, d3.zoomIdentity);
            this.zoomBehavior.on("zoom", currentZoomHandler);
        }
        this.updateAxis(this.currentTransform);
        if (this.config.debug) console.log("Numberline domain set to:", newDomain);
    }

    getCurrentMarkerValue() {
        return this.markerDataValue;
    }

    resetMarker(initialValue) {
        if (this.chartWidth <= 0) {
            this._updateDimensionsAndScales();
            if (this.chartWidth <= 0) {
                if (this.config.debug) console.warn("resetMarker: Aborted, chartWidth not positive.");
                return;
            }
        }
        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        if (initialValue !== undefined) {
            this.markerDataValue = initialValue;
        } else {
            const domain = currentScale.domain();
            if (domain && domain.length === 2 && isFinite(domain[0]) && isFinite(domain[1]) && domain[1] > domain[0]) {
                this.markerDataValue = domain[0] + (domain[1] - domain[0]) / 2;
            } else {
                const baseDomain = this.baseScale.domain();
                if (baseDomain && baseDomain.length === 2 && isFinite(baseDomain[0]) && isFinite(baseDomain[1])) {
                    this.markerDataValue = baseDomain[0] + (baseDomain[1] - baseDomain[0]) / 2;
                } else {
                    this.markerDataValue = 0.5;
                    if (this.config.debug) console.warn("Marker reset to absolute fallback due to invalid domains.");
                }
            }
        }
        this._updateMarkerScreenPosition();
        if (this.config.debug) console.log("Marker reset to:", this.markerDataValue);
        // Call updateAxis if marker reset might affect visual elements tied to feedback state
        if (this.isFeedbackActive) {
            this.updateAxis(this.currentTransform);
        }
    }
}