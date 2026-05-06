import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";

const STORAGE_KEY = "weatherza-user-photo";

interface Props {
  userName?: string;
  compact?: boolean;
}

export const PhotoGreeting = ({ userName, compact }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoData, setPhotoData] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [composed, setComposed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const compose = async (photo: string) => {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#0a0a14");
    grad.addColorStop(1, "#1a1530");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Wait for Bodoni font
    try { await (document as any).fonts.load("700 220px 'Bodoni Moda'"); } catch {}

    const now = new Date();
    const day = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Massive faded background text
    ctx.save();
    ctx.font = "700 240px 'Bodoni Moda', 'Playfair Display', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillText(day, canvas.width / 2, canvas.height / 2 - 70);
    ctx.font = "italic 700 180px 'Bodoni Moda', serif";
    ctx.fillStyle = "rgba(255,140,0,0.18)";
    ctx.fillText(time, canvas.width / 2, canvas.height / 2 + 110);
    ctx.restore();

    // Draw user photo centered, behind text-cutout illusion (photo overlays text in middle)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });

    const targetH = canvas.height * 0.95;
    const ratio = img.width / img.height;
    const targetW = targetH * ratio;
    const dx = (canvas.width - targetW) / 2;
    const dy = (canvas.height - targetH) / 2;
    ctx.drawImage(img, dx, dy, targetW, targetH);

    // Vignette
    const vg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.width*0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Watermark
    ctx.font = "500 18px 'Quicksand', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "right";
    ctx.fillText("Weatherza AI", canvas.width - 20, canvas.height - 18);

    setComposed(canvas.toDataURL("image/png"));
  };

  useEffect(() => {
    if (photoData) compose(photoData).catch(() => {});
  }, [photoData]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const data = String(r.result);
      try { localStorage.setItem(STORAGE_KEY, data); } catch {}
      setPhotoData(data);
      setOpen(false);
    };
    r.readAsDataURL(f);
  };

  if (!photoData) {
    return (
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Personalize your greeting
          </div>
          <div className="text-xs text-muted-foreground">Add a photo — we'll set today's day & time in Bodoni Moda behind you.</div>
        </div>
        <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, hsl(28 100% 55%), hsl(280 70% 50%))" }}>
          <Camera className="w-3.5 h-3.5" />
          Add photo
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="mb-3 relative group rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {composed && <img src={composed} alt="Greeting" className="w-full h-auto block" />}
      {userName && (
        <div className="absolute top-3 left-4 text-white/90 text-xs font-medium tracking-wide" style={{ fontFamily: "-apple-system, 'SF Pro Display', sans-serif" }}>
          Hello, {userName}
        </div>
      )}
      <label className="absolute bottom-3 right-3 cursor-pointer opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px]">
        <RefreshCw className="w-3 h-3" /> Change
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
