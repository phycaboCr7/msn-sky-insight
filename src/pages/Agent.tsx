import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentShell } from "@/components/agent-os/AgentShell";
import { loginWithGoogle, auth, onAuthStateChanged, type User } from "@/services/authService";
import logoSrc from "@/assets/logo.png";

export default function Agent() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); });
    return () => unsub();
  }, []);

  const handleGoogle = async () => {
    setErr(null); setBusy(true);
    try { await loginWithGoogle(); }
    catch (e: any) { setErr(e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-orange-400" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-black flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 20%, #6366f150, transparent 60%), radial-gradient(circle at 70% 80%, #ff8c0030, transparent 60%)" }} />
        <Link to="/" className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={16} /> Back to Weatherza</Link>
        <div className="relative z-10 w-full max-w-md bg-black/50 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl text-center">
          <img src={logoSrc} alt="" className="w-14 h-14 mx-auto mb-4" style={{ filter: "drop-shadow(0 0 14px #ff8c00aa)" }} />
          <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Weatherza Agent OS</h1>
          <p className="text-xs text-white/60 mb-6">Sign in with Google to launch your autonomous AI computer</p>
          <Button onClick={handleGoogle} disabled={busy} className="w-full bg-white text-black hover:bg-white/90">
            {busy ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
            Continue with Google
          </Button>
          {err && <p className="text-red-400 text-xs mt-3">{err}</p>}
        </div>
      </div>
    );
  }

  return <AgentShell user={user} />;
}
