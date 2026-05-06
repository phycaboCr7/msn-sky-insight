## Plan: Weatherza AI — Owner Attribution, Pop-out Apple Window, Photo Greeting

### 1. Update AI system prompt (`supabase/functions/weatherza-chat/index.ts`)
Add to `buildSystemPrompt`:
- **Identity block**: "Weatherza AI is built by **Rakshit Jain**, founder of **Weatherza Labs** (the studio behind this site). Always credit Rakshit as the owner if asked."
- **First-message rule**: If `messages.length === 1` (first user turn ever), append a friendly line inviting the user to join the Discord: `https://discord.gg/8zE7wZCptk` — once only, then never repeat unless asked.
- **Capabilities block** (so the AI can describe itself):
  - Real-time weather, forecasts, AQI, UV, hourly/daily, comparisons
  - Math/physics with LaTeX step-by-step
  - Code generation + Python visualizer (matplotlib, numpy, scipy, sympy, networkx, sklearn, turtle, animations)
  - HTML/CSS/JS preview, JS execution
  - Vision (image analysis), document parsing (PDF/DOCX)
  - Voice input + voice overlay
  - Splat 3D scene rendering for nature/architecture topics
  - Rich widgets, charts, tables
  - Pro mode for premium-tier responses
  - Custom backgrounds, font picker, persistent chat memory
  - Export to PDF / Word, download Python visuals as PNG/PDF/MP4/WebM
  - "Cool extras" (Lovable-suggested): "Surprise me" weather poem, weekend planner, outfit suggester, travel-weather compare, ASCII weather art

### 2. Add a Discord pill in the AI header (`src/components/WeatherzaAI.tsx`)
Small button next to existing controls → opens `https://discord.gg/8zE7wZCptk` in new tab.

### 3. New "Open in Apple Window" feature
- Add a **pop-out button** in the WeatherzaAI header (icon: `ExternalLink` from lucide).
- Clicking opens `/ai` in a new browser window (`window.open('/ai', '_blank', 'width=1200,height=800')`).
- Create new route `/ai` in `src/App.tsx` → new page `src/pages/AIWindow.tsx`.
- `AIWindow.tsx` renders a full-screen Apple-style shell:
  - Faux macOS chrome: traffic-light dots (red/yellow/green), translucent toolbar, blurred background
  - Apple fonts: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue"`
  - Weatherza logo in title bar
  - Embeds existing `<WeatherzaAI weather={...} />` so all functionality works
  - Loads weather for last-saved location (reuse `localStorage` key already used by main app, or default geolocation)
- Chat persistence already uses `localStorage` (`weatherza-chat-history`) — same origin → automatically shared between main tab and pop-out window. No new storage needed.

### 4. Weatherza logo inside the AI
- Import `@/assets/logo.png` in `WeatherzaAI.tsx`; render a small glowing logo next to the "Weatherza AI" title in the chat header (already partially present — verify and polish).
- In the Apple window, render a larger logo with subtle drop-shadow glow.

### 5. Personalized photo greeting card
- Add a new component `src/components/PhotoGreeting.tsx`.
- On first open of the AI (or via a "Personalize" button in the header), prompt user to upload a photo of themselves.
- Use HTML5 `<canvas>` to compose a greeting image:
  - Draw current **day** (e.g., "WEDNESDAY") and **time** (e.g., "14:32") in **Bodoni Moda** as a huge faded background layer
  - Draw the user's photo on top, centered, so the text appears "behind" the person
  - Add subtle vignette + Weatherza logo watermark in the corner
- Save the resulting data URL to `localStorage` (`weatherza-user-photo-greeting`).
- Whenever the user opens the AI (or the Apple window), show the greeting image in a small banner above the chat ("Good afternoon, <name>") with the composed image. Refresh time/day each open by re-rendering with the saved photo.
- Allow re-uploading at any time from a "Change photo" link.

### Technical notes
- Bodoni Moda is already loaded in `index.html`; ensure canvas waits for `document.fonts.ready` before drawing.
- The pop-out window is same-origin so `localStorage` (chat history, prompt count, pro mode, user photo) is fully shared — no cross-window messaging needed.
- No backend / DB changes required. No new secrets.
- Keep existing visual theme intact in the main embedded AI; Apple styling lives only in `/ai` route.
- Discord invite is enforced by the system prompt + a one-time toast/pill in the UI on first load.

### Files touched
- `supabase/functions/weatherza-chat/index.ts` — system prompt update
- `src/components/WeatherzaAI.tsx` — Discord button, pop-out button, photo greeting integration, logo polish
- `src/components/PhotoGreeting.tsx` — new
- `src/pages/AIWindow.tsx` — new
- `src/App.tsx` — add `/ai` route
