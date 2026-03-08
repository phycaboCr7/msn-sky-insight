

## Problem
1. Black/sharp edges visible at corners — the `overflow-hidden` on the outer wrapper clips the conic-gradient but the `boxShadow` is rectangular, not following the rounded corners
2. The outward glow shadow appears rectangular instead of circular/rounded

## Root Cause
The `boxShadow` with `0 0 20px ...` spreads rectangularly. For a proper circular/rounded glow, we need the shadow to respect `border-radius`. CSS `box-shadow` does respect `border-radius`, but the issue is likely that the shadow is too spread/thin. The black edge artifacts come from the `m-[2px]` inner container not perfectly matching the outer `rounded-3xl` — the conic gradient background bleeds at corners.

## Changes

**`src/components/WeatherzaAI.tsx`** (lines 1634-1644):
- Fix corner artifacts: ensure inner container radius perfectly matches outer minus the margin (`rounded-3xl` = 24px, minus 2px margin = 22px — already correct, but increase to `rounded-[2rem]` outer / `rounded-[calc(2rem-2px)]` inner for smoother match)
- Fix rectangular glow: use a softer, more spread `box-shadow` with multiple layers that naturally follows `border-radius`. Remove the hard spread values and use proper blur-heavy shadows for a circular/organic glow effect:
  ```
  boxShadow: '0 0 15px 2px hsl(28 100% 60% / 0.25), 0 0 35px 5px hsl(28 100% 60% / 0.15), 0 0 60px 10px hsl(220 80% 60% / 0.1)'
  ```
- Ensure no black edge artifacts by matching radii precisely

