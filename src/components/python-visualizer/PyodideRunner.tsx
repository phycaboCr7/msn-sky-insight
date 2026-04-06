import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import type { PyodideRunnerProps, SliderConfig } from "./types";
import { detectExecutionType, detectFromMetadata, extractSliderConfigs, getTypeBadge } from "./detection";
import { PYTHON_SETUP_CODE } from "./pyodide-setup";
import { ParameterSliders } from "./ParameterSliders";
import { LiveCanvas } from "./LiveCanvas";
import { CanvasVideoRecorder } from "./CanvasVideoRecorder";

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export const PyodideRunner = ({ code, onClose }: PyodideRunnerProps) => {
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [animationFrames, setAnimationFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sliders, setSliders] = useState<SliderConfig[]>([]);
  const [showSliders, setShowSliders] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [recordingAnimation, setRecordingAnimation] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [is3DMode, setIs3DMode] = useState(false);

  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const executionType = detectExecutionType(code);
  const hasExplicitMetadata = detectFromMetadata(code) !== null;
  const badge = getTypeBadge(executionType);

  const hasImageData = !!imageData;

  // Load Pyodide
  useEffect(() => {
    const loadPyodideScript = async () => {
      if (window.pyodide) {
        setPyodideReady(true);
        setLoading(false);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      script.async = true;
      script.onload = async () => {
        try {
          window.pyodide = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
          await window.pyodide.loadPackage(["numpy", "matplotlib", "scipy", "sympy"]);
          await window.pyodide.runPythonAsync(PYTHON_SETUP_CODE);
          window.pyodide.loadPackage(["networkx", "scikit-learn"]).catch(() => {});
          setPyodideReady(true);
          toast({ title: "Python Ready! 🐍", description: "Loaded NumPy, Matplotlib, SciPy, SymPy & Turtle" });
        } catch (err) {
          console.error("Pyodide load error:", err);
          setError("Failed to load Python environment");
        } finally {
          setLoading(false);
        }
      };
      script.onerror = () => { setError("Failed to load Pyodide script"); setLoading(false); };
      document.body.appendChild(script);
    };
    loadPyodideScript();
    const extractedSliders = extractSliderConfigs(code);
    setSliders(extractedSliders);
    setShowSliders(extractedSliders.length > 0);
    return () => { if (animationRef.current) clearTimeout(animationRef.current); };
  }, [code, toast]);

  useEffect(() => {
    if (isAnimating && animationFrames.length > 1) {
      let frameIndex = currentFrame;
      const animate = () => {
        frameIndex = (frameIndex + 1) % animationFrames.length;
        setCurrentFrame(frameIndex);
        animationRef.current = setTimeout(() => requestAnimationFrame(animate), 1000 / 24);
      };
      animate();
      return () => { if (animationRef.current) clearTimeout(animationRef.current); };
    }
  }, [isAnimating, animationFrames.length, currentFrame]);

  const clearOutput = () => { setOutput(''); setImageData(null); setAnimationFrames([]); setError(null); setVideoBlob(null); };

  // 3D Animation popup
  const run3DAnimation = async () => {
    setRunning(true);
    setError(null);
    setOutput('');
    setImageData(null);
    setAnimationFrames([]);
    setVideoBlob(null);
    const threeJs3DPopup = `<!DOCTYPE html>
<html><head><title>3D Animation — Weatherza</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1e;overflow:hidden;font-family:system-ui}canvas{display:block}
#hud{position:fixed;top:16px;left:16px;color:rgba(255,255,255,0.6);font-size:13px;z-index:10}
#controls{position:fixed;bottom:16px;right:16px;display:flex;gap:8px;z-index:10}
.btn{padding:8px 16px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-size:12px;backdrop-filter:blur(10px);transition:all 0.2s}
.btn:hover{background:rgba(255,255,255,0.1)}
#fps{position:fixed;top:16px;right:16px;color:rgba(255,255,255,0.4);font-size:11px;font-family:monospace}</style>
</head><body>
<div id="hud">3D Visualizer — Weatherza AI</div><div id="fps">0 fps</div>
<div id="controls"><button class="btn" onclick="resetCamera()">Reset Camera</button><button class="btn" onclick="recordVideo()">⏺ Record</button><button class="btn" id="playBtn" onclick="togglePlay()">⏸ Pause</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0a0a1e);scene.fog=new THREE.FogExp2(0x0a0a1e,0.02);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,1000);camera.position.set(0,5,15);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x334466,0.8));
const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(10,20,10);sun.castShadow=true;scene.add(sun);
scene.add(new THREE.DirectionalLight(0x4466ff,0.4).position.set(-10,5,-10));
let isDragging=false,prevX=0,prevY=0,rotX=0,rotY=0,radius=15;
renderer.domElement.addEventListener('mousedown',e=>{isDragging=true;prevX=e.clientX;prevY=e.clientY});
renderer.domElement.addEventListener('mousemove',e=>{if(!isDragging)return;rotY+=(e.clientX-prevX)*0.005;rotX+=(e.clientY-prevY)*0.005;rotX=Math.max(-1.4,Math.min(1.4,rotX));prevX=e.clientX;prevY=e.clientY});
renderer.domElement.addEventListener('mouseup',()=>isDragging=false);
renderer.domElement.addEventListener('wheel',e=>{radius=Math.max(3,Math.min(50,radius+e.deltaY*0.05))});
renderer.domElement.addEventListener('touchstart',e=>{isDragging=true;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY});
renderer.domElement.addEventListener('touchmove',e=>{if(!isDragging)return;rotY+=(e.touches[0].clientX-prevX)*0.005;rotX+=(e.touches[0].clientY-prevY)*0.005;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;e.preventDefault()},{passive:false});
renderer.domElement.addEventListener('touchend',()=>isDragging=false);
function resetCamera(){rotX=0;rotY=0;radius=15}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
let frames=0,lastTime=performance.now();const fpsDom=document.getElementById('fps');
let playing=true;function togglePlay(){playing=!playing;document.getElementById('playBtn').textContent=playing?'⏸ Pause':'▶ Play'}
let mediaRecorder,chunks=[],isRecording=false;
function recordVideo(){if(isRecording){mediaRecorder.stop();isRecording=false;document.querySelector('[onclick="recordVideo()"]').textContent='⏺ Record';return}
chunks=[];const stream=renderer.domElement.captureStream(30);mediaRecorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});
mediaRecorder.ondataavailable=e=>chunks.push(e.data);mediaRecorder.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='3d-animation-weatherza.webm';a.click()};
mediaRecorder.start();isRecording=true;document.querySelector('[onclick="recordVideo()"]').textContent='⏹ Stop Rec'}
const geometry=new THREE.TorusKnotGeometry(3,1,128,32);const material=new THREE.MeshPhongMaterial({color:0x7c3aed,emissive:0x2d1b69,shininess:80});
const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;scene.add(mesh);
scene.add(new THREE.GridHelper(40,40,0x222244,0x111133));
const parts=new THREE.BufferGeometry();const pos=new Float32Array(3000);for(let i=0;i<3000;i+=3){pos[i]=Math.random()*60-30;pos[i+1]=Math.random()*60-30;pos[i+2]=Math.random()*60-30}
parts.setAttribute('position',new THREE.BufferAttribute(pos,3));scene.add(new THREE.Points(parts,new THREE.PointsMaterial({color:0x4466ff,size:0.08,transparent:true,opacity:0.6})));
let t=0;function animate(){requestAnimationFrame(animate);if(playing){t+=0.01;mesh.rotation.x=t*0.5;mesh.rotation.y=t*0.7;mesh.position.y=Math.sin(t)*0.5;mesh.material.emissiveIntensity=0.3+Math.sin(t*2)*0.2}
camera.position.x=Math.sin(rotY)*Math.cos(rotX)*radius;camera.position.y=Math.sin(rotX)*radius;camera.position.z=Math.cos(rotY)*Math.cos(rotX)*radius;camera.lookAt(0,0,0);renderer.render(scene,camera);
frames++;const now=performance.now();if(now-lastTime>500){fpsDom.textContent=Math.round(frames/((now-lastTime)/1000))+' fps';frames=0;lastTime=now}}animate();
<\/script></body></html>`;
    const blob = new Blob([threeJs3DPopup], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank', 'width=1200,height=800,left=100,top=100');
    setRunning(false);
  };

  // Run Python code
  const runCode = useCallback(async () => {
    if (is3DMode) { run3DAnimation(); return; }
    if (!pyodideReady || !window.pyodide) return;

    setRunning(true);
    setError(null);
    setOutput("");
    setImageData(null);
    setAnimationFrames([]);
    setIsAnimating(false);
    setVideoBlob(null);
    setAnimationProgress(0);

    try {
      let modifiedCode = code.replace(/\*\*(\d+(?:\.\d+)?)\*\*/g, '$1');
      for (const slider of sliders) {
        const varPattern = new RegExp(`^${slider.name}\\s*=\\s*[^\\n]+`, 'm');
        if (varPattern.test(modifiedCode)) {
          modifiedCode = modifiedCode.replace(varPattern, `${slider.name} = ${slider.value}`);
        } else {
          modifiedCode = `${slider.name} = ${slider.value}\n` + modifiedCode;
        }
      }

      if (executionType === "TURTLE") {
        await window.pyodide.runPythonAsync(`t = SimpleTurtle()\nturtle = t`);
        modifiedCode = modifiedCode
          .replace(/from turtle import \*/g, '')
          .replace(/import turtle/g, '')
          .replace(/turtle\s*=\s*turtle\.Turtle\(\)/g, '')
          .replace(/turtle\.done\(\)/g, '')
          .replace(/turtle\.mainloop\(\)/g, '')
          .replace(/done\(\)/g, '')
          .replace(/mainloop\(\)/g, '')
          .replace(/exitonclick\(\)/g, '')
          .replace(/turtle\.Screen\(\)/g, 'Screen()');
        modifiedCode += `\n_result_img = t.draw()`;
      } else if (executionType === "ANIMATION") {
        await window.pyodide.runPythonAsync(`clear_animation_frames()`);
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '')
          .replace(/import\s+matplotlib\.animation\s+as\s+animation/g, '')
          .replace(/from\s+matplotlib\.animation\s+import\s+\*/g, '')
          .replace(/from\s+matplotlib\.animation\s+import\s+FuncAnimation/g, '')
          .replace(/ani\s*=\s*animation\.FuncAnimation\([^)]*\)/g, '')
          .replace(/ani\s*=\s*FuncAnimation\([^)]*\)/g, '')
          .replace(/ani\.save\([^)]*\)/g, '');

        const has3D = /projection\s*=\s*['"]3d['"]|\.bar3d\s*\(|\.plot_surface\s*\(|\.plot_wireframe\s*\(/.test(modifiedCode);
        if (has3D) {
          modifiedCode = modifiedCode
            .replace(/fig\s*=\s*plt\.figure\([^)]*\)/g, 'fig, ax = plt.subplots(figsize=(12, 8))')
            .replace(/ax\s*=\s*fig\.add_subplot\([^)]*projection\s*=\s*['"]3d['"][^)]*\)/g, '')
            .replace(/ax\s*=\s*fig\.add_subplot\([^)]*\)/g, '')
            .replace(/ax\.set_zlabel\([^)]*\)/g, '')
            .replace(/ax\.set_zlim\([^)]*\)/g, '');
        }

        const funcNameMatch = modifiedCode.match(/def\s+(update|animate|draw_frame)\s*\(\s*\w+\s*\)/);
        const animFuncName = funcNameMatch ? funcNameMatch[1] : null;
        if (animFuncName) {
          modifiedCode += `
try:
    _total_frames = 240
    for _frame_i in range(_total_frames):
        ${animFuncName}(_frame_i)
        capture_animation_frame()
except Exception as _anim_err:
    print(f"Animation error at frame: {_anim_err}")
    if not get_animation_frames():
        capture_animation_frame()
`;
        } else {
          modifiedCode += `\ncapture_animation_frame()`;
        }
        modifiedCode += `\n_result_img = get_animation_frames()[-1] if get_animation_frames() else get_plot_as_base64()`;
      } else {
        modifiedCode = modifiedCode
          .replace(/plt\.show\(\)/g, '')
          .replace(/plt\.savefig\([^)]+\)/g, '');
        modifiedCode += `
try:
    _result_img = get_plot_as_base64()
except:
    _result_img = None
`;
      }

      await window.pyodide.runPythonAsync(`import sys\nfrom io import StringIO\n_stdout_capture = StringIO()\nsys.stdout = _stdout_capture`);
      await window.pyodide.runPythonAsync(modifiedCode);
      const stdout = await window.pyodide.runPythonAsync(`sys.stdout = sys.__stdout__\n_stdout_capture.getvalue()`);
      if (stdout) setOutput(stdout);

      let hasAnimFrames = false;
      if (executionType === "ANIMATION") {
        const framesResult = await window.pyodide.runPythonAsync(`get_animation_frames()`);
        if (framesResult && framesResult.length > 0) {
          const frames = framesResult.toJs ? framesResult.toJs() : Array.from(framesResult);
          const dataUrls = frames.map((f: string) => `data:image/png;base64,${f}`);
          setAnimationFrames(dataUrls);
          setImageData(dataUrls[0]);
          hasAnimFrames = true;
          setIsAnimating(true);
          toast({ title: "Animation Ready! 🎞️", description: `${frames.length} frames` });
        }
      }
      if (!hasAnimFrames) {
        const imgResult = await window.pyodide.runPythonAsync(`_result_img if '_result_img' in dir() else None`);
        if (imgResult) setImageData(`data:image/png;base64,${imgResult}`);
      }
      toast({ title: "Executed! ✅" });
    } catch (err: any) {
      setError(err.message || "Python execution failed");
      toast({ title: "Error", description: "Execution failed", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }, [pyodideReady, code, sliders, executionType, toast, is3DMode]);

  const exportVideo = useCallback(async () => {
    if (animationFrames.length < 2) return;
    setRecordingAnimation(true);
    setAnimationProgress(0);
    try {
      const recorder = new CanvasVideoRecorder(800, 600);
      const blob = await recorder.recordFramesLive(animationFrames, 24, setAnimationProgress);
      setVideoBlob(blob);
      toast({ title: "Video Ready! 🎬" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to create video", variant: "destructive" });
    } finally {
      setRecordingAnimation(false);
    }
  }, [animationFrames, toast]);

  const handleVideoReady = useCallback((blob: Blob) => {
    setVideoBlob(blob);
    toast({ title: "Video Ready! 🎬" });
  }, [toast]);

  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSliderChange = (index: number, value: number[]) => {
    setSliders(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: value[0] };
      return updated;
    });
  };

  const exportPNG = () => {
    if (!imageData) return;
    const link = document.createElement('a');
    link.download = 'graph.png';
    link.href = imageData;
    link.click();
  };

  const exportPDF = async () => {
    if (!imageData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(255, 140, 0);
      doc.text("Weatherza AI - Python Graph", 15, 20);
      doc.addImage(imageData, 'PNG', 15, 30, 180, 120);
      doc.save('graph.pdf');
    } catch {} // eslint-disable-line
  };

  const resetSliders = () => setSliders(extractSliderConfigs(code));
  const toggleAnimation = () => setIsAnimating(!isAnimating);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'pyFadeIn 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <style>{`
        @keyframes pyFadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes pySlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .py-btn { transition: all 0.2s cubic-bezier(0.32,0.72,0,1); }
        .py-btn:hover { transform: scale(1.05); }
        .py-btn:active { transform: scale(0.96); }
        .py-panel { animation: pySlideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        .py-traffic:hover .py-red { background: #ff5f57 !important; box-shadow: 0 0 8px #ff5f5780; }
        .py-traffic:hover .py-yellow { background: #febc2e !important; box-shadow: 0 0 8px #febc2e80; }
        .py-traffic:hover .py-green { background: #28c840 !important; box-shadow: 0 0 8px #28c84080; }
        .py-output-line { animation: pySlideUp 0.2s cubic-bezier(0.32,0.72,0,1); }
        .py-toggle { transition: all 0.25s cubic-bezier(0.32,0.72,0,1); }
      `}</style>

      <div
        className={`py-panel flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[95vw] max-w-6xl h-[92vh] rounded-[18px]'}`}
        style={{
          background: 'rgba(20, 22, 30, 0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Title bar — Apple style */}
        <div
          className="py-traffic flex items-center justify-between px-5 py-3 select-none"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
            minHeight: 44,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button onClick={onClose} className="py-red w-3 h-3 rounded-full transition-all duration-200" style={{ background: '#3d3d3d' }} title="Close" />
              <button onClick={clearOutput} className="py-yellow w-3 h-3 rounded-full transition-all duration-200" style={{ background: '#3d3d3d' }} title="Clear" />
              <button onClick={() => setIsFullscreen(f => !f)} className="py-green w-3 h-3 rounded-full transition-all duration-200" style={{ background: '#3d3d3d' }} title="Fullscreen" />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui', letterSpacing: '-0.01em' }}>
              Python Visualizer
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 6,
              background: 'rgba(139,92,246,0.15)',
              color: '#a78bfa',
              border: '0.5px solid rgba(139,92,246,0.2)',
              fontFamily: 'system-ui', fontWeight: 500,
            }}>
              {badge.icon} {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 2D / 3D Toggle */}
            <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ color: !is3DMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>2D</span>
              <button
                onClick={() => setIs3DMode(m => !m)}
                className="py-toggle relative"
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: is3DMode ? 'linear-gradient(135deg,#7c3aed,#4338ca)' : 'rgba(255,255,255,0.1)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="absolute top-[3px] transition-all duration-250" style={{
                  width: 16, height: 16, borderRadius: 8, background: '#fff',
                  left: is3DMode ? 21 : 3,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }} />
              </button>
              <span style={{ color: is3DMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>3D</span>
            </div>
            {sliders.length > 0 && (
              <button onClick={() => setShowSliders(s => !s)} className="py-btn" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: showSliders ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', color: showSliders ? '#a78bfa' : 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                ⚙ Parameters
              </button>
            )}
          </div>
        </div>

        {/* Main content — split layout */}
        <div className="flex flex-1 min-h-0" style={{ gap: 0 }}>
          {/* Left: Code editor */}
          <div className="flex flex-col" style={{ width: '45%', borderRight: '0.5px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', minHeight: 36 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Source</span>
              <div className="flex gap-2">
                <button
                  onClick={runCode}
                  disabled={!pyodideReady || running}
                  className="py-btn flex items-center gap-1.5"
                  style={{
                    fontSize: 12, padding: '5px 14px', borderRadius: 8,
                    background: running ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: running ? 'rgba(255,255,255,0.4)' : '#fff',
                    border: 'none', fontWeight: 600, letterSpacing: '-0.01em',
                    boxShadow: running ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
                  }}
                >
                  {running ? '⏳ Running…' : is3DMode ? '▶ Run 3D' : '▶ Run'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <pre style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Menlo', monospace",
                fontSize: 13, lineHeight: 1.65,
                padding: '16px 20px', margin: 0,
                color: '#a5f3fc', whiteSpace: 'pre-wrap', wordBreak: 'break-all' as const,
              }}>
                <code>{code}</code>
              </pre>
            </div>
            {showSliders && sliders.length > 0 && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '12px 16px', background: 'rgba(0,0,0,0.2)' }}>
                <ParameterSliders sliders={sliders} onSliderChange={handleSliderChange} onReset={resetSliders} />
              </div>
            )}
          </div>

          {/* Right: Output */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', minHeight: 36 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                {is3DMode ? '3D Output' : 'Output'}
              </span>
              <div className="flex gap-2">
                {hasImageData && !is3DMode && (
                  <>
                    <button onClick={exportPNG} className="py-btn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.08)' }}>PNG</button>
                    <button onClick={exportPDF} className="py-btn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.08)' }}>PDF</button>
                  </>
                )}
                {videoBlob && (
                  <button onClick={downloadVideo} className="py-btn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '0.5px solid rgba(249,115,22,0.2)' }}>⬇ Video</button>
                )}
                {animationFrames.length > 1 && (
                  <button onClick={toggleAnimation} className="py-btn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '0.5px solid rgba(139,92,246,0.2)' }}>
                    {isAnimating ? '⏸' : '▶'} {animationFrames.length}f
                  </button>
                )}
                {animationFrames.length >= 2 && !recordingAnimation && (
                  <button onClick={exportVideo} className="py-btn" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '0.5px solid rgba(249,115,22,0.2)' }}>🎬 Video</button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto flex flex-col gap-3 p-4" style={{ background: 'rgba(0,0,0,0.15)' }}>
              {loading && (
                <div className="flex items-center gap-3 py-4 justify-center" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#8b5cf6' }} />
                  Initializing Python engine…
                </div>
              )}
              {recordingAnimation && (
                <div className="py-output-line" style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }}>
                  <div style={{ fontSize: 12, color: '#fdba74', marginBottom: 6 }}>Encoding Video… {animationProgress}%</div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                    <div style={{ width: `${animationProgress}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #f97316, #ef4444)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
              {(imageData || animationFrames.length > 0) && (
                <div className="py-output-line" style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                  <img
                    src={animationFrames.length > 0 ? animationFrames[currentFrame] : imageData!}
                    alt="Output"
                    style={{ width: '100%', display: 'block', borderRadius: 12 }}
                  />
                </div>
              )}
              {output && (
                <div className="py-output-line" style={{ fontFamily: "'SF Mono','Fira Code','Menlo',monospace", fontSize: 12, lineHeight: 1.6, color: '#a5f3fc', background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>
                  {output}
                </div>
              )}
              {error && (
                <div className="py-output-line" style={{ fontFamily: "'SF Mono','Fira Code','Menlo',monospace", fontSize: 12, lineHeight: 1.6, color: '#fca5a5', background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>
                  {error}
                </div>
              )}
              {!loading && !imageData && !output && !error && animationFrames.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 40 }}>🐍</div>
                  <div style={{ fontSize: 13, fontFamily: 'system-ui' }}>Click Run to execute</div>
                </div>
              )}
            </div>
            {animationFrames.length > 1 && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>
                <LiveCanvas frames={animationFrames} fps={24} autoPlay={isAnimating} onVideoReady={handleVideoReady} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui' }}>
            <span>▶ Run</span><span>⌘K Clear</span><span>Plots inline</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(139,92,246,0.6)', fontFamily: 'system-ui' }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: pyodideReady ? '#16a34a' : '#f59e0b', boxShadow: pyodideReady ? '0 0 6px #16a34a' : 'none' }} />
            {pyodideReady ? 'Pyodide Ready' : 'Loading…'} {is3DMode && '• Three.js'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PyodideRunner;
