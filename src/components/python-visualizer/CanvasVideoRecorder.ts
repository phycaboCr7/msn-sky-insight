// Real-time canvas-based video recording using MediaRecorder
// This captures actual animation frames from a canvas element, not static images

export class CanvasVideoRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private animationId: number | null = null;
  private isRecording = false;
  
  constructor(width = 800, height = 600) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d")!;
  }
  
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
  
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
  
  // Start recording the canvas as video
  startRecording(fps = 30): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(fps);
        
        // Try MP4 first, fallback to WebM
        const mimeType = MediaRecorder.isTypeSupported("video/mp4") 
          ? "video/mp4" 
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        
        this.mediaRecorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps for quality
        });
        
        this.chunks = [];
        
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.chunks.push(e.data);
          }
        };
        
        this.mediaRecorder.onerror = () => {
          reject(new Error("Recording failed"));
        };
        
        this.mediaRecorder.start(100); // Collect data every 100ms
        this.isRecording = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
  
  // Stop recording and get the video blob
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("No active recording"));
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "video/webm";
        const blob = new Blob(this.chunks, { type: mimeType.split(";")[0] });
        this.isRecording = false;
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  // Clear the canvas
  clear(color = "#1a1a2e"): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // Draw an image frame to the canvas (for frame-by-frame animation)
  drawFrame(dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.clear();
        
        // Scale and center the image
        const scale = Math.min(
          this.canvas.width / img.width,
          this.canvas.height / img.height
        );
        const x = (this.canvas.width - img.width * scale) / 2;
        const y = (this.canvas.height - img.height * scale) / 2;
        
        this.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
  }
  
  // Record frames with live canvas rendering
  async recordFramesLive(
    frames: string[], 
    fps = 24, 
    onProgress?: (progress: number) => void,
    onFrame?: (frameIndex: number, canvas: HTMLCanvasElement) => void
  ): Promise<Blob> {
    const frameDuration = 1000 / fps;
    
    await this.startRecording(fps);
    
    for (let i = 0; i < frames.length; i++) {
      if (onProgress) {
        onProgress(Math.round((i / frames.length) * 100));
      }
      
      await this.drawFrame(frames[i]);
      
      if (onFrame) {
        onFrame(i, this.canvas);
      }
      
      // Wait for frame duration
      await new Promise(resolve => setTimeout(resolve, frameDuration));
    }
    
    // Add a small delay to ensure last frames are captured
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.stopRecording();
  }
  
  // Run a custom animation function and record it
  async recordCustomAnimation(
    duration: number, // in seconds
    fps: number,
    renderFrame: (ctx: CanvasRenderingContext2D, time: number, frame: number) => void,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const totalFrames = Math.floor(duration * fps);
    const frameDuration = 1000 / fps;
    
    await this.startRecording(fps);
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;
      
      if (onProgress) {
        onProgress(Math.round((frame / totalFrames) * 100));
      }
      
      this.clear();
      renderFrame(this.ctx, time, frame);
      
      await new Promise(resolve => setTimeout(resolve, frameDuration));
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.stopRecording();
  }
  
  isActivelyRecording(): boolean {
    return this.isRecording;
  }
  
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }
}
