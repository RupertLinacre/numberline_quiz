**Functional Specification: Fractal/Recursive Zoomable Number-Line Axis Widget (Revised)**

**1. Purpose & Overview**

This document specifies a lightweight, embeddable SVG widget that renders a one-dimensional horizontal number-line axis. The widget's core feature is its "fractal" zooming behavior: as the user zooms, tick marks and labels for the emerging level of detail appear subtly (scaled small) and grow to their full visual size, creating a seamless transition between orders of magnitude. This visually emphasizes the self-similar, fractal-like nature of the number line.

The axis dynamically displays tick marks based on two primary orders of magnitude relative to the current zoom level:
*   **Major Ticks:** Represent powers of ten (10ⁿ). Their visual appearance (tick length, font size) remains constant once rendered (i.e., effectively at 100% visual scale).
*   **Minor Ticks:** Represent subdivisions of major ticks (10ⁿ⁻¹). These are the ticks that exhibit the "fractal reveal": they start small and grow to their full visual size as the user zooms into their level of detail.

Labels (numeric values) are displayed for both major and minor ticks.

**2. User Interaction**

*   **Panning & Zooming:**
    *   **Mouse Wheel / Touchpad Pinch:** Zooms in or out, centered at the mouse pointer/pinch location.
    *   **Mouse Click-and-Drag / Touch Drag:** Pans the axis horizontally.
*   **Responsiveness:** All updates to ticks (positions, visual scale, labels) occur synchronously within the zoom event callback. There are no animated transitions for tick *positions*; movement is immediate. The growth/shrinkage of minor tick visuals is a calculated scaling, also applied synchronously.
*   **Zoom Limits (Domain & Scale):**
    *   **Data Scale Extent:** The D3 zoom behavior will have a configured `scaleExtent` (e.g., `[1e-7, 1e7]`) to define the allowable zoom range on the data domain, preventing extreme zoom-in/out that might hit floating-point limitations or become unusable.
    *   **Visual Scale of Ticks (Semantic Zoom):**
        *   **Major Ticks:** Tick lengths and font sizes for major ticks are defined by base values and are always rendered at full visual scale (1.0). They do not change size with the D3 zoom level.
        *   **Minor Ticks:** Tick lengths and font sizes for minor ticks are defined by base values. Their *visual scale* dynamically adjusts:
            *   They appear at a configured minimum visual scale (e.g., 0.15x of base size) when they first become relevant.
            *   As the user zooms further into their level of detail, their visual scale smoothly increases from this minimum up to 1.0x (full size).
            *   Once at full size (visual scale 1.0), they do not grow larger even with further zooming into that specific level. If zooming continues, these minor ticks will eventually become major ticks (and new, smaller minor ticks will appear).
        *   This semantic zoom ensures tick visuals remain readable and consistent, independent of the geometric zoom factor of the D3 transform.

**3. Axis & Tick Behavior**

*   **Automatic Step Selection (Exponent Calculation):**
    *   The system determines the current visible data domain width.
    *   It calculates an `idealMajorStep` size aiming for a target number of major ticks to be visible on screen (e.g., ~7 major ticks).
    *   The exponent `n` is determined by `Math.round(Math.log10(idealMajorStep))`.
    *   `majorStep = 10ⁿ`
    *   `minorStep = 10ⁿ⁻¹` (one-tenth of the major step).
*   **Tick Generation:**
    *   Ticks are generated for every multiple of `minorStep` that falls within or near the visible domain.
    *   Each tick is classified as either `major` or `minor`:
        *   A tick is `major` if its value is a multiple of `majorStep` (within a small floating-point `epsilon` tolerance).
        *   Otherwise, it is `minor`.
*   **Labeling & Formatting:**
    *   Both major and minor ticks display numeric labels corresponding to their data value.
    *   Labels are formatted using `d3.format` (e.g., `d3.format(".10~g")`) to ensure consistent and human-readable numbers, avoiding raw floating-point artifacts and using scientific notation where appropriate for very large/small numbers.
*   **Visual Styling (Base Sizes):**
    *   Base tick lengths (e.g., 10px for major, 6px for minor) are defined.
    *   Base font sizes (e.g., 11px for major, 10px for minor) are defined in CSS.
    *   Other visual properties like stroke width and font weight are also defined in CSS, potentially differing for major and minor ticks.
*   **Dynamic Visual Scaling (The "Fractal Reveal"):**
    *   The on-screen pixel distance corresponding to one `minorStep` is calculated based on the current D3 scale.
    *   **Minor Tick Visual Scale (`minorTickVisualScale`):**
        *   This scale factor is computed by comparing the `pixelDeltaForMinorStep` to a `targetPixelSpacingForMinorTickFullSize` (e.g., 40px).
        *   `minorTickVisualScale = Math.min(1.0, pixelDeltaForMinorStep / targetPixelSpacingForMinorTickFullSize)`
        *   It is then clamped: `minorTickVisualScale = Math.max(minVisualScaleForMinorTicks, minorTickVisualScale)` (e.g., `minVisualScaleForMinorTicks = 0.15`).
        *   This `minorTickVisualScale` is applied to the SVG group containing the minor tick's line and text, causing them to appear small and grow to full size.
    *   **Major Tick Visual Scale:** Always 1.0.
*   **Rendering Structure:**
    *   **Axis Line:** A single SVG `<line>` element represents the main horizontal axis, spanning the available width of the chart area.
    *   **Tick Groups:**
        *   Each tick (both major and minor) is rendered as an SVG `<g class="tick">` element. This outer group is translated to `x = currentScale(tickValue)`.
        *   Inside this positional group, another SVG `<g class="tick-content">` contains the actual visual elements: an SVG `<line>` for the tick mark and an SVG `<text>` for the label.
        *   The `tick-content` group is scaled by the calculated visual scale (1.0 for major, `minorTickVisualScale` for minor). This scales both the tick line length (drawn relative to its y-origin) and the text element.
*   **Floating-Point Precision:**
    *   An `epsilon` value (e.g., `1e-9`) is used for floating-point comparisons in tick classification and generation logic to handle potential inaccuracies.

**4. Data Flow & Update Cycle**

1.  **Zoom Event:** User interaction (wheel, pinch, drag) triggers a D3 zoom event. `d3.zoom()` provides an `event.transform` object containing the current translation and scale (`k`).
2.  **Rescale Data Domain:** The `event.transform` is used to rescale a `baseScale` (an initial D3 linear scale) via `transform.rescaleX(baseScale)`, yielding a `currentScale` that reflects the new visible domain.
3.  **Calculate Tick Levels:** Based on `currentScale.domain()`:
    *   Determine `majorStep`, `minorStep`, and `exponent`.
    *   Generate an array of tick objects, each with `value` and `isMajor` properties.
4.  **Calculate Minor Tick Visual Scale:** As described in "Dynamic Visual Scaling".
5.  **Update DOM (D3 Data Join):**
    *   A D3 data join (`selection.data(ticks, d => d.value)`) is used to bind the `ticks` array to SVG `<g class="tick">` elements.
    *   `.enter()`: New tick groups are created. Each gets a positional `<g>` and a content `<g>` with `<line>` and `<text>`.
    *   `.exit()`: Tick groups no longer in the data are removed.
    *   `.join()` (or `.merge()` on enter and update selections):
        *   The outer `<g class="tick">` is positioned: `transform: translate(currentScale(d.value), 0)`.
        *   The inner `<g class="tick-content">` is scaled: `transform: scale(visualScale)` where `visualScale` is 1.0 for major ticks or `minorTickVisualScale` for minor ticks.
        *   Line attributes (`y2` for length) and text content (`format(d.value)`) are updated. Text `y` position might be slightly adjusted for very small minor ticks to prevent overlap with the axis line.
6.  All updates occur synchronously within the D3 zoom event handler.

**5. Configuration Parameters**

The widget should be configurable with parameters such as:

*   `initialDomain`: Array, e.g., `[0, 4]` - the starting visible range of the number line.
*   `margins`: Object, e.g., `{ top: 70, right: 40, bottom: 70, left: 40 }` - for spacing around the axis.
*   `baseMajorTickLength`: Number, e.g., `10` (pixels) - length of major ticks at full visual scale.
*   `baseMinorTickLength`: Number, e.g., `6` (pixels) - length of minor ticks at full visual scale.
*   `targetMajorTicksOnScreen`: Number, e.g., `7` - desired approximate number of major ticks visible.
*   `targetPixelSpacingForMinorTickFullSize`: Number, e.g., `40` (pixels) - the screen spacing between minor ticks at which they achieve full visual scale (1.0).
*   `minVisualScaleForMinorTicks`: Number, e.g., `0.15` - the minimum `transform: scale()` factor applied to minor tick content groups.
*   `epsilon`: Number, e.g., `1e-9` - for floating point comparisons.
*   `d3ZoomScaleExtent`: Array, e.g., `[1e-7, 1e7]` - min/max zoom scale factor for `d3.zoom()`.
*   `labelFormatSpecifier`: String, e.g., `".10~g"` - d3-format string for tick labels.

**6. Technical Notes (D3-based Implementation)**

*   **D3 Version:** Designed for D3 v7 or later.
*   **SVG Structure:** Adheres to the nested `<g>` structure described for positioning and scaling.
*   **CSS Styling:** Base visual properties (font-family, non-scaled font-size, stroke colors, stroke widths) are primarily controlled via CSS. Classes `.tick`, `.major`, `.minor` are used for styling.
*   **Performance:** The update logic within the zoom handler is kept lean, focusing on recalculating tick data and updating attributes. Off-screen ticks are naturally culled by generating ticks only for the current domain.
*   **Touch Interaction:** CSS `touch-action: none; user-select: none;` is applied to the SVG element to ensure D3 zoom handles touch events correctly without interference from default browser gestures.
