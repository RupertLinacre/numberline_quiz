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
        this.questionContextualMagnitude = null;
        this.correctAnswerHighlightValue = null;

        // Store dynamic dimensions
        this.effectiveSvgWidth = 0;
        this.chartWidth = 0;
    }

    init() {
        this.svg = d3.select(`#${this.svgId}`)
            .attr('height', this.config.svgHeight); // Width is 100% via CSS

        this.chartArea = this.svg.append('g');
        // Initial transform will be set in _updateDimensionsAndScales

        this.baseScale = d3.scaleLinear()
            .domain(this.config.initialDomain);
        // Range will be set in _updateDimensionsAndScales

        this.chartArea.append('line')
            .attr('class', 'axis-line')
            .attr('y1', 0) // Positioned at the G's origin
            .attr('y2', 0);
        // x1 and x2 will be set in _updateDimensionsAndScales

        this._updateDimensionsAndScales(); // Initial setup of dimensions and scales

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
        // Update translateExtent after zoom is initialized and chartWidth is known
        if (this.zoomBehavior && this.chartWidth > 0) {
            this.zoomBehavior.translateExtent([[0, 0], [this.effectiveSvgWidth, this.config.svgHeight]]);
        }


        this._initMarker();
        this.updateAxis(this.currentTransform); // Initial draw of ticks, marker
        this.resetMarker(); // Position marker correctly based on initial domain and view

        if (this.config.debug) console.log("NumberlineRenderer initialized.");

        this.eventBus.on('NEW_QUESTION_READY', (data) => {
            if (data.initialViewParams) {
                if (data.initialViewParams.domain) {
                    this.setDomain(data.initialViewParams.domain);
                }
                this.questionContextualMagnitude = (data.initialViewParams.questionContextualMagnitude !== undefined)
                    ? data.initialViewParams.questionContextualMagnitude
                    : null;
            }
            this._clearCorrectAnswerHighlight();
            this.resetMarker();
        });

        this.eventBus.on('SHOW_FEEDBACK', (data) => {
            this._clearCorrectAnswerHighlight();
            if (data.correctAnswer !== undefined && data.type === 'error') {
                this._setCorrectAnswerHighlightValue(data.correctAnswer);
            }
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
            if (this.chartWidth <= 0) this.chartWidth = 1; // Absolute fallback
        }

        this.chartArea.attr('transform', `translate(${this.config.margins.left}, ${this.config.margins.top})`);

        this.baseScale.range([0, this.chartWidth]);

        this.chartArea.select('.axis-line')
            .attr('x1', 0)
            .attr('x2', this.chartWidth);

        if (this.zoomBehavior) {
            this.zoomBehavior.translateExtent([[0, 0], [this.effectiveSvgWidth, this.config.svgHeight]]);
        }

        if (this.config.debug) {
            console.log(`Dimensions updated: effectiveSvgWidth=${this.effectiveSvgWidth}, chartWidth=${this.chartWidth}`);
        }
    }

    handleResize() {
        if (this.config.debug) console.log("Handling resize...");
        this._updateDimensionsAndScales();
        // It's important that currentTransform reflects the state *before* the resize
        // relative to the *old* dimensions. Rescaling it or resetting it might be needed
        // if the visual data range should change drastically or stay centered.
        // For now, simply updating the axis with the existing transform against new scales.
        this.updateAxis(this.currentTransform);
        this._updateMarkerScreenPosition(); // Ensure marker is correct after resize logic
    }

    _initMarker() {
        if (this.markerDataValue === null) { // Initialize if not set
            const domain = this.baseScale.domain(); // baseScale should have its domain
            if (domain && domain.length === 2 && isFinite(domain[0]) && isFinite(domain[1])) {
                this.markerDataValue = domain[0] + (domain[1] - domain[0]) / 2;
            } else {
                this.markerDataValue = 0.5; // Fallback if domain is problematic
                if (this.config.debug) console.warn("Marker value fallback in _initMarker due to baseScale domain issue.");
            }
        }

        this.marker = this.chartArea.append('g').attr('class', 'draggable-marker');

        // Use config for marker line length and circle radius
        const markerLineLengthRatio = (this.config.markerConfig && this.config.markerConfig.lineWidthToMajorTickRatio) || 1.5;
        const majorTickLen = this.config.majorTickLength || 20;

        this.marker.append('line')
            .attr('y1', -(majorTickLen * markerLineLengthRatio))
            .attr('y2', (majorTickLen * markerLineLengthRatio))
            .attr('stroke-width', 2); // Color from CSS

        this.marker.append('circle')
            .attr('cy', 0)
            .attr('r', (this.config.markerConfig && this.config.markerConfig.circleRadius) || 10)
            .style('cursor', 'ew-resize'); // Color from CSS

        const dragBehavior = d3.drag()
            .on('start', (event) => {
                if (this.chartWidth <= 0) event.sourceEvent.stopPropagation();
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
    }

    _updateMarkerScreenPosition() {
        if (!this.marker || this.markerDataValue === null || this.chartWidth <= 0) return;

        const currentScale = this.currentTransform.rescaleX(this.baseScale);
        const xPosition = currentScale(this.markerDataValue);

        if (!isFinite(xPosition)) {
            if (this.config.debug) console.warn("Marker screen position is not finite for value:", this.markerDataValue, "Scale domain:", currentScale.domain(), "Scale range:", currentScale.range());
            // Hide marker or place it at an edge if out of bounds and not finite
            // For now, just don't move it if position is invalid
            return;
        }
        this.marker.attr('transform', `translate(${xPosition}, 0)`);
    }

    _calculateTickLevels(currentScale) {
        const [domainMin, domainMax] = currentScale.domain();
        let domainWidth = domainMax - domainMin;
        const currentChartWidth = this.chartWidth; // Use the stored, updated chartWidth

        if (domainWidth <= 1e-12 || !isFinite(domainWidth) || isNaN(domainWidth) || currentChartWidth <= 0) {
            if (this.config.debug && currentChartWidth <= 0) console.warn("_calculateTickLevels: chartWidth is not positive.", currentChartWidth);
            return [];
        }

        const targetMajorTicksOnScreen = this.config.targetMajorTicksOnScreen || 5;
        const minPixelSeparationForMajor = this.config.minPixelSeparationForMajor || 50;
        const maxPixelSeparationForMajor = minPixelSeparationForMajor * (this.config.majorTickPixelSeparationMultiplier || 3);

        let idealNumMajorTicks = Math.max(1, Math.min(targetMajorTicksOnScreen, currentChartWidth / minPixelSeparationForMajor));
        if (!isFinite(idealNumMajorTicks) || idealNumMajorTicks <= 0) idealNumMajorTicks = 1;

        let majorStepLog = Math.log10(domainWidth / idealNumMajorTicks);
        if (!isFinite(majorStepLog) || isNaN(majorStepLog)) majorStepLog = 0; // Handle NaN case for very small domainWidth

        let majorStep = Math.pow(10, Math.floor(majorStepLog));

        if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) { // Added NaN check
            majorStep = Math.pow(10, Math.floor(Math.log10(domainWidth > 1e-9 ? domainWidth : 1) / 2));
            if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) majorStep = 1;
        }

        let iterations = 0;
        const MAX_ITERATIONS = 15;
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

        if (majorStep <= 1e-12 || !isFinite(majorStep) || isNaN(majorStep)) {
            if (this.config.debug) console.warn("Major step calculation resulted in invalid value, returning empty ticks.", majorStep);
            return [];
        }

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
            if (this.config.debug) console.warn(`Predicted tick count too high (${numPredictedTicks}), using major step for iteration.`);
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

            if (iterationStep === majorStep && !isMajor) continue;

            let isMidMinor = false;
            if (!isMajor && minorStep > 1e-9) {
                const halfMajorStep = majorStep / 2;
                if (Math.abs(remainderFromMajor - halfMajorStep) < 1e-9 * majorStep) {
                    isMidMinor = true;
                }
            }

            ticks.push({ value: tickValue, isMajor: isMajor, isMidMinor: isMidMinor });
        }
        return ticks;
    }

    updateAxis(transform) {
        if (this.chartWidth <= 0) {
            if (this.config.debug) console.warn("updateAxis called with non-positive chartWidth. Attempting to update dimensions first.");
            this._updateDimensionsAndScales();
            if (this.chartWidth <= 0) {
                if (this.config.debug) console.error("updateAxis aborted: chartWidth is still not positive after _updateDimensionsAndScales.");
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
                if (d.isMajor) {
                    return this.config.majorTickLength || 20;
                } else if (d.isMidMinor) {
                    return this.config.midMinorTickLength || 15; // Use new config for mid-minor ticks
                } else {
                    return this.config.minorTickLength || 10;
                }
            });
        // Stroke color from CSS

        ticks.filter(d => d.isMajor)
            .filter(d => {
                if (this.questionContextualMagnitude === null || this.questionContextualMagnitude <= 1e-9) {
                    return true;
                }
                const allowedLabelingMagnitude = this.questionContextualMagnitude * 10;
                const ratio = d.value / allowedLabelingMagnitude;
                const isMultipleOfAllowedMagnitude = Math.abs(ratio - Math.round(ratio)) < 1e-9;
                return isMultipleOfAllowedMagnitude;
            })
            .append('text')
            .attr('y', (this.config.majorTickLength || 20) + ((this.config.labelFontSizePx || 20) * 0.8))
            .attr('text-anchor', 'middle')
            .attr('font-size', `${this.config.labelFontSizePx || 20}px`)
            .text(d => formatNumber(d.value));

        this._updateMarkerScreenPosition();

        this.chartArea.selectAll('.correct-answer-highlight').remove();
        if (this.correctAnswerHighlightValue !== null) {
            const xPosition = currentScale(this.correctAnswerHighlightValue);
            if (isFinite(xPosition) && !isNaN(xPosition)) {
                const highlightLengthRatio = (this.config.correctAnswerHighlightConfig && this.config.correctAnswerHighlightConfig.lengthToMajorTickRatio) || 1.8;
                const highlightBaseLength = this.config.majorTickLength || 20;
                const highlightLength = highlightBaseLength * highlightLengthRatio;
                const highlightStrokeWidth = (this.config.correctAnswerHighlightConfig && this.config.correctAnswerHighlightConfig.strokeWidth) || 6;

                this.chartArea.append('line')
                    .attr('class', 'correct-answer-highlight')
                    .attr('x1', xPosition)
                    .attr('x2', xPosition)
                    .attr('y1', -highlightLength / 2)
                    .attr('y2', highlightLength / 2)
                    .attr('stroke-width', highlightStrokeWidth); // Use new config
            } else {
                if (this.config.debug) console.warn("Cannot draw correct answer highlight, position not finite/NaN for value:", this.correctAnswerHighlightValue);
            }
        }

        if (this.config.debug && tickData.length > 0) console.log("NumberlineRenderer axis updated.");
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
            const currentZoomHandler = this.zoomBehavior.on("zoom"); // Save current handler
            this.zoomBehavior.on("zoom", null); // Temporarily detach
            this.svg.call(this.zoomBehavior.transform, d3.zoomIdentity);
            this.zoomBehavior.on("zoom", currentZoomHandler); // Reattach
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
                    this.markerDataValue = 0.5; // Absolute fallback
                    if (this.config.debug) console.warn("Marker reset to absolute fallback due to invalid domains.");
                }
                if (this.config.debug) console.warn("Marker reset to baseScale domain center due to invalid currentScale domain:", domain);
            }
        }
        this.updateAxis(this.currentTransform);
        if (this.config.debug) console.log("Marker reset to:", this.markerDataValue);
    }

    _setCorrectAnswerHighlightValue(value) {
        this.correctAnswerHighlightValue = value;
        if (this.chartWidth > 0) this.updateAxis(this.currentTransform);
    }

    _clearCorrectAnswerHighlight() {
        if (this.correctAnswerHighlightValue !== null) {
            this.correctAnswerHighlightValue = null;
            if (this.chartWidth > 0) this.updateAxis(this.currentTransform);
        } else {
            // Ensure it's cleared even if value was already null but DOM might exist
            if (this.chartArea) this.chartArea.selectAll('.correct-answer-highlight').remove();
        }
    }
}