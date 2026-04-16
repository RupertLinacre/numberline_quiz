import * as d3 from 'd3';

export function formatNumber(value) {
    if (!isFinite(value)) return String(value);

    const roundedInteger = Math.round(value);
    if (Math.abs(value - roundedInteger) < 1e-9 && Math.abs(roundedInteger) >= 1000) {
        return d3.format(',')(roundedInteger).replace(/\u2212/g, '-');
    }

    return d3.format('.5~g')(value).replace(/\u2212/g, '-');
}

// Returns the contextual magnitude (e.g., 0.1 for 1 decimal, 0.01 for 2 decimals)
export function getDecimalPrecision(value) {
    if (!isFinite(value)) return 1; // Handle non-finite cases
    if (Math.floor(value) === value) return 1; // Integer
    const s = value.toString();
    const parts = s.split('.');
    if (parts.length < 2 || !parts[1]) {
        return 1;
    }
    return Math.pow(10, -parts[1].length);
}
