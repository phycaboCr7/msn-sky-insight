

## Problem
1. The input bar needs more roundness
2. There's an inner glow effect to remove
3. When the textarea is clicked/focused, a secondary box (focus ring) appears inside

## Changes

**`src/components/WeatherzaAI.tsx`** (lines 1634-1707):
- Increase roundness: `rounded-2xl` → `rounded-3xl` on outer wrapper, `rounded-[22px]` on inner container
- Remove any inner glow/shadow from the inner container
- On the `Textarea` (line 1683): ensure all focus styles are fully suppressed — add `outline-none shadow-none` and override any default ring/border styles so no secondary box appears on click

**`src/components/ui/textarea.tsx`**:
- Remove `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` from the base textarea styles to prevent the focus outline globally

