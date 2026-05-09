import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AgentShell } from "@/components/agent-os/AgentShell";
import logoSrc from "@/assets/logo.png";

export default function Agent() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const fn = mode === "signup" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
      const { error } = await fn({ email, password: pwd, options: { emailRedirectTo: `${window.location.origin}/agent` } } as any);
      if (error) setErr(error.message);
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setErr(null); setBusy(true);
    try {
      const r: any = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/agent` });
      if (r?.error) setErr(String(r.error.message ?? r.error));
    } finally { setBusy(false); }
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-orange-400" /></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-black flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 20%, #6366f150, transparent 60%), radial-gradient(circle at 70% 80%, #ff8c0030, transparent 60%)" }} />
        <Link to="/" className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={16} /> Back to Weatherza</Link>
        <div className="relative z-10 w-full max-w-md bg-black/50 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <img src={logoSrc} alt="" className="w-12 h-12" style={{ filter: "drop-shadow(0 0 12px #ff8c00aa)" }} />
            <div>
              <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Weatherza Agent OS</h1>
              <p className="text-xs text-white/60">Sign in to launch the AI computer</p>
            </div>
          </div>
          <Button onClick={handleGoogle} disabled={busy} className="w-full mb-3 bg-white text-black hover:bg-white/90">
            <Sparkles size={16} className="mr-2" /> Continue with Google
          </Button>
          <div className="flex items-center gap-2 my-3 text-white/40 text-xs"><div className="flex-1 h-px bg-white/10" />or<div className="flex-1 h-px bg-white/10" /></div>
          <form onSubmit={handleEmail} className="space-y-2">
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/15 text-white" />
            <Input type="password" placeholder="Password (min 6 chars)" value={pwd} onChange={e => setPwd(e.target.value)} required minLength={6} className="bg-white/5 border-white/15 text-white" />
            <Button type="submit" disabled={busy} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {busy ? <Loader2 size={16} className="animate-spin" /> : (mode === "signup" ? "Create account" : "Sign in")}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="w-full mt-3 text-xs text-white/60 hover:text-white">
            {mode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
          </button>
          {err && <p className="text-red-400 text-xs mt-3 text-center">{err}</p>}
        </div>
      </div>
    );
  }

  return <AgentShell session={session} />;
}