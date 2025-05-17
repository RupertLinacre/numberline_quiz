export const config = {
    // svgWidth: 800, // This will now be dynamically determined.
    // It can be kept as a fallback or initial reference if needed.
    svgHeight: 200,   // This remains important for the SVG's aspect ratio and viewBox.
    margins: { top: 50, right: 20, bottom: 70, left: 20 }, // Adjusted margins for smaller screens
    initialDomain: [0, 2],
    debug: true,
    majorTickLength: 10,
    minorTickLength: 5,
    minZoomScale: 0.01, // Allow more zoom out
    maxZoomScale: 1000, // Allow more zoom in
    answerTolerance: 0.01,
    // For _calculateTickLevels, these might need adjustment based on visual testing
    targetMajorTicksOnScreen: 5,
    minPixelSeparationForMajor: 40, // Min pixels between major ticks before trying to change step
    majorTickPixelSeparationMultiplier: 3, // Max separation = minPixelSeparationForMajor * this
    maxTicksToGenerate: 300,
};
