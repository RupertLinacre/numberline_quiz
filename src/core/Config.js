export const config = {
    // svgWidth: 800, // This will now be dynamically determined.
    // It can be kept as a fallback or initial reference if needed.
    svgHeight: 400,   // Doubled from 200
    margins: { top: 50, right: 20, bottom: 70, left: 20 }, // Adjusted margins for smaller screens
    initialDomain: [0, 2],
    debug: true,
    majorTickLength: 20, // Doubled from 10
    minorTickLength: 10,  // Doubled from 5
    minZoomScale: 0.01, // Allow more zoom out
    maxZoomScale: 1000, // Allow more zoom in
    answerTolerance: 0.01,
    // For _calculateTickLevels, these might need adjustment based on visual testing
    targetMajorTicksOnScreen: 5,
    minPixelSeparationForMajor: 200, // Min pixels between major ticks before trying to change step
    majorTickPixelSeparationMultiplier: 3, // Max separation = minPixelSeparationForMajor * this
    maxTicksToGenerate: 300,

    labelFontSizePx: 20, // New: Font size for tick labels in pixels

    markerConfig: { // New: Marker specific configurations
        circleRadius: 10,
        lineWidthToMajorTickRatio: 1.5
    },
    correctAnswerHighlightConfig: { // New: Correct answer highlight configurations
        strokeWidth: 6,
        lengthToMajorTickRatio: 1.8
    },
};
