// Execution types detected from @output_type metadata or heuristics
export type ExecutionType = "STATIC_GRAPH" | "ANIMATION" | "SIMULATION" | "TURTLE" | "TEXT_ONLY";

export interface SliderConfig {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
}

export interface PyodideRunnerProps {
  code: string;
  onClose?: () => void;
}

export interface AnimationState {
  frames: string[];
  currentFrame: number;
  isPlaying: boolean;
  progress: number;
}

export interface OutputState {
  text: string;
  imageData: string | null;
  error: string | null;
  videoBlob: Blob | null;
}
