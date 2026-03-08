

## Problem

The `@property` CSS rule and `conic-gradient(from var(--glow-angle))` approach doesn't work reliably — `@property` animated custom properties have limited support and the gradient isn't visually rotating. The result is a static or barely visible border instead of the smooth rotating rainbow glow the user wants (like Lovable's input bar).

## Solution

Use **JavaScript-driven rotation** with a `useEffect` + `requestAnimationFrame` loop that updates a CSS variable (`--glow-angle`) on the DOM element directly. This guarantees cross-browser rotation of the conic gradient.

### Changes

**`src/components/WeatherzaAI.tsx`** (input bar glow section, ~lines 1617-1633):
- Add a `useRef` for the two glow divs
- Add a `useEffect` with `requestAnimationFrame` that increments `--glow-angle` every frame (1deg/frame ≈ 6s rotation)
- Remove the CSS `animation: glow-rotate` from the inline styles
- Increase blur to `blur(12px)` on the outer layer and keep the inner layer sharp for a crisp border + soft ambient glow
- Increase `-inset` to `[3px]` for a thicker, more visible glow

**`src/index.css`**:
- Keep `@property --glow-angle` and `@keyframes glow-rotate` as fallback but they won't be primary driver

This approach mirrors how Lovable's own input bar glow works — a JS-animated conic gradient producing a smooth, continuously rotating rainbow border.

