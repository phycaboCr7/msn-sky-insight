// Video recording using MediaRecorder API for frame-based animations
export class VideoRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private onProgress: (progress: number) => void;
  
  constructor(width = 800, height = 600, onProgress?: (progress: number) => void) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d")!;
    this.onProgress = onProgress || (() => {});
  }
  
  async recordFrames(frames: string[], fps = 24): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(fps);
        
        // Try MP4 first, fallback to WebM
        const mimeType = MediaRecorder.isTypeSupported("video/mp4") 
          ? "video/mp4" 
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.chunks = [];
        
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: mimeType.split(";")[0] });
          resolve(blob);
        };
        
        this.mediaRecorder.onerror = (e) => {
          reject(new Error("Recording failed"));
        };
        
        this.mediaRecorder.start();
        
        // Draw each frame with proper timing
        for (let i = 0; i < frames.length; i++) {
          this.onProgress(Math.round((i / frames.length) * 100));
          await this.drawFrame(frames[i]);
          await this.delay(1000 / fps);
        }
        
        // Add a small delay before stopping to ensure last frames are captured
        await this.delay(100);
        this.mediaRecorder.stop();
        
      } catch (err) {
        reject(err);
      }
    });
  }
  
  private drawFrame(dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.fillStyle = "#1a1a2e";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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
      img.src = dataUrl;
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
  
  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }
}
