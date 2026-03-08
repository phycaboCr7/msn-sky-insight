

## Root Cause Analysis

The animation pipeline is broken because of a **detection mismatch** between what the AI is told to write and what the code actually checks for.

### The Bug (line 181 in PyodideRunner.tsx)

The frame-generation loop that calls `update(frame)` 240 times is gated behind:
```typescript
if (modifiedCode.includes("FuncAnimation"))
```

But the system prompt tells the AI to write code **without** `FuncAnimation` -- just a bare `def update(frame):` function. So the code falls into the `else` branch (line 194) which only captures **1 single frame**, not 240.

The AI's Schrodinger code follows the system prompt correctly: it has `# @output_type: animation` and `def update(frame):` but no `FuncAnimation`. Result: 1 frame captured, no animation.

### The Fix

**1. PyodideRunner.tsx (line 181)** -- Detect `def update(` pattern in addition to `FuncAnimation`:

Change:
```typescript
if (modifiedCode.includes("FuncAnimation")) {
```
To:
```typescript
if (modifiedCode.includes("FuncAnimation") || modifiedCode.includes("def update(") || modifiedCode.includes("def update (")) {
```

This ensures that whenever the AI writes a proper `update(frame)` function (as instructed), the 240-frame loop fires.

**2. System prompt in weatherza-chat/index.ts** -- Improve the AI instructions:

Update the ANIMATION RULES section to be more explicit about:
- The execution environment is **Pyodide (WebAssembly Python in browser)**, not a local machine
- `FuncAnimation` is NOT needed -- just define `update(frame)` and it will be called automatically for frames 0-239
- Do NOT use `ani.save()`, `plt.show()`, `animation.FuncAnimation()`, or any file I/O
- Do NOT import `matplotlib.animation` -- it's not needed
- The `update(frame)` function must call `ax.clear()` then re-draw for each frame
- All state that changes between frames must use `global` keyword
- Complex numpy operations (FFT, etc.) work fine
- If user asks for "browser runnable" animation, write Python with `# @output_type: animation` -- do NOT switch to HTML/CSS/JS unless explicitly asked for a web page

### Files to modify
1. `src/components/python-visualizer/PyodideRunner.tsx` -- Fix the detection condition on line 181
2. `supabase/functions/weatherza-chat/index.ts` -- Rewrite ANIMATION RULES in system prompt with clearer environment description and patterns

