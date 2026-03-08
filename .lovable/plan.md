## Issues Identified and Plan

### 1. AQI Scale Marker (White Dot) Not Moving Correctly

**Root cause**: The marker position is calculated as `(actualAQI / 500) * 100`, which assumes a linear 0-500 scale. But the visual bar has 6 equal-width flex segments with non-linear AQI ranges (0-50, 50-100, 100-150, 150-200, 200-300, 300-500). For example, AQI 55 calculates to 11% position (placing it in the "Good" segment visually) when it should be ~18% (in the "Moderate" segment).

**Fix**: Create a proper `getMarkerPosition()` function that maps AQI values to the correct visual position across the 6 equal-width segments. Each segment occupies 16.67% of the bar width, so interpolate within the correct segment.

### 2. Daily Forecast Sun Icons Still Not Circular

**Root cause**: The CSS `.forecast__sunny` is 80px with border-radius 50% and large box-shadows. At `scale-[0.35]` it renders at ~28px but the glow bleeds out, creating a non-circular blob appearance. The container has no overflow clipping so the glow distorts the shape.

**Fix**: For `size="sm"`, instead of scaling down the full 80px sun, render a dedicated small sun element — a simple 32px circle with a subtle glow, defined directly in the component with inline styles. This avoids the scaling artifacts entirely.

### 3. Improve Sun Phase Card

Based on the screenshot, it looks functional but plain. Improvements:

- Add a visual sun arc/path showing current position
- Better visual hierarchy with larger emoji
- More polished sunrise/sunset boxes with gradient backgrounds
- Add day length calculation

### 4. Improve Moon Phase Card

Similar to Sun Phase — enhance with:

- Larger moon emoji with subtle glow effect
- Illumination shown as a progress ring instead of plain text
- Better styled moonrise/moonset boxes matching the Sun card
- Add next phase prediction text

### 5. Improve AQI Card Layout

From the screenshot it's vertically stacked with the boy image small. Improvements:

- Restore horizontal layout with AQI number and status side by side, boy on the right
- Make PM values inline with better spacing
- Ensure the scale bar marker fix makes the indicator visually accurate

---

### Files to modify:

- `src/components/AirQualityCard.tsx` — Fix marker position calculation
- `src/components/AnimatedWeatherIcon.tsx` — Replace scaled-down sun with a dedicated small sun element
- `src/components/SunPhaseCard.tsx` — Enhanced visual design with sun arc
- `src/components/MoonPhaseCard.tsx` — Enhanced visual design with illumination ring