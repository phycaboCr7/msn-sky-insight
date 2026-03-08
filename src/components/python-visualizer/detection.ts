import type { ExecutionType, SliderConfig } from "./types";

// PRIORITY 1: Check for explicit @output_type metadata tag
export const detectFromMetadata = (code: string): ExecutionType | null => {
  const metadataMatch = code.match(/#\s*@output_type:\s*(\w+)/i);
  if (metadataMatch) {
    const type = metadataMatch[1].toLowerCase();
    if (type === "animation") return "ANIMATION";
    if (type === "graph") return "STATIC_GRAPH";
    if (type === "simulation") return "SIMULATION";
    if (type === "turtle") return "TURTLE";
    if (type === "text") return "TEXT_ONLY";
  }
  return null;
};

// PRIORITY 2: Fallback to heuristic detection
export const detectExecutionType = (code: string): ExecutionType => {
  const metadataType = detectFromMetadata(code);
  if (metadataType) return metadataType;
  
  if (code.includes("turtle") || code.includes("Turtle")) return "TURTLE";
  if (code.includes("FuncAnimation") || code.includes("animation.") || 
      code.includes("def update(") || code.includes("def update (") ||
      code.includes("def animate(") || code.includes("def animate (") ||
      code.includes("def draw_frame(") ||
      /@output_type:\s*animation/i.test(code)) return "ANIMATION";
  if (code.includes("plt.plot") || code.includes("plt.scatter") || code.includes("plt.bar") || 
      code.includes("plt.pie") || code.includes("plt.hist") || code.includes("plt.imshow")) return "STATIC_GRAPH";
  if (code.includes("simulate") || code.includes("time.sleep") || 
      code.includes("for i in range") || code.includes("while ")) return "SIMULATION";
  return "TEXT_ONLY";
};

// Extract slider parameters from code comments or auto-detect common patterns
export const extractSliderConfigs = (code: string): SliderConfig[] => {
  const sliders: SliderConfig[] = [];
  const regex = /# slider:\s*(\w+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)(?:,\s*"([^"]+)")?/g;
  let match;
  
  while ((match = regex.exec(code)) !== null) {
    sliders.push({
      name: match[1],
      min: parseFloat(match[2]),
      max: parseFloat(match[3]),
      step: parseFloat(match[4]),
      value: parseFloat(match[5]),
      label: match[6] || match[1]
    });
  }
  
  // Auto-detect common parameters if no explicit sliders
  if (sliders.length === 0) {
    if (code.includes("a*x**2") || code.includes("a*x*x") || code.includes("a * x**2")) {
      sliders.push({ name: "a", min: -5, max: 5, step: 0.1, value: 1, label: "a (coefficient)" });
      sliders.push({ name: "b", min: -10, max: 10, step: 0.5, value: 0, label: "b (coefficient)" });
      sliders.push({ name: "c", min: -10, max: 10, step: 0.5, value: 0, label: "c (constant)" });
    }
    else if (code.includes("np.sin") || code.includes("np.cos")) {
      sliders.push({ name: "amplitude", min: 0.1, max: 5, step: 0.1, value: 1, label: "Amplitude" });
      sliders.push({ name: "frequency", min: 0.1, max: 10, step: 0.1, value: 1, label: "Frequency" });
    }
    else if (code.includes("m*x") && code.includes("+ c")) {
      sliders.push({ name: "m", min: -10, max: 10, step: 0.1, value: 1, label: "Slope (m)" });
      sliders.push({ name: "c", min: -20, max: 20, step: 0.5, value: 0, label: "Intercept (c)" });
    }
  }
  
  return sliders;
};

// Get display badge for execution type
export const getTypeBadge = (type: ExecutionType) => {
  const badges = {
    "STATIC_GRAPH": { icon: "📊", label: "Graph", color: "bg-blue-500/20 text-blue-400" },
    "ANIMATION": { icon: "🎞️", label: "Animation", color: "bg-purple-500/20 text-purple-400" },
    "SIMULATION": { icon: "🔬", label: "Simulation", color: "bg-cyan-500/20 text-cyan-400" },
    "TURTLE": { icon: "🐢", label: "Turtle", color: "bg-green-500/20 text-green-400" },
    "TEXT_ONLY": { icon: "📝", label: "Script", color: "bg-gray-500/20 text-gray-400" },
  };
  return badges[type];
};
