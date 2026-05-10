import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logoutUser, type User } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, Trash2, FileText, Download, ArrowLeft, Brain, Search, Globe, Save, Database, Cloud, ListChecks, Wrench, FileDown, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import logoSrc from "@/assets/logo.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";

type Thread = { id: string; title: string; created_at: string };
type Msg = { id: string; role: "user" | "assistant"; parts: any[]; created_at: string };
type Event =
  | { kind: "user"; text: string }
  | { kind: "thought"; text: string }
  | { kind: "plan"; steps: string[] }
  | { kind: "tool"; name: string; args: any; result?: any }
  | { kind: "text"; text: string }
  | { kind: "error"; text: string };
type FileRow = { id: string; path: string; mime: string; size_bytes: number; updated_at: string; content?: string };

const TOOL_ICON: Record<string, any> = {
  think: Brain, plan: ListChecks, web_search: Search, web_scrape: Globe,
  write_file: Save, read_file: FileText, list_files: FileText,
  remember: Database, recall: Database, weather: Cloud, make_report: FileDown,
};
const TOOL_COLOR: Record<string, string> = {
  think: "from-blue-500/20 to-blue-500/5 border-blue-400/30",
  plan: "from-violet-500/20 to-violet-500/5 border-violet-400/30",
  web_search: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
  web_scrape: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
  write_file: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  read_file: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  list_files: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  remember: "from-pink-500/20 to-pink-500/5 border-pink-400/30",
  recall: "from-pink-500/20 to-pink-500/5 border-pink-400/30",
  weather: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30",
  make_report: "from-orange-500/20 to-orange-500/5 border-orange-400/30",
};

export function AgentShell({ user }: { user: User }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<Msg[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [openFile, setOpenFile] = useState<FileRow | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>(["$ weatherza-agent --boot", "● kernel ready"]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const userId = user.uid;

  // Load threads
  const refreshThreads = useCallback(async () => {
    const { data } = await supabase.from("agent_threads").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setThreads(data ?? []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
  }, [activeId, userId]);

  useEffect(() => { refreshThreads(); }, [refreshThreads]);

  // Load messages + files for active thread
  useEffect(() => {
    if (!activeId) { setHistory([]); setEvents([]); return; }
    (async () => {
      const { data: msgs } = await supabase.from("agent_messages").select("*").eq("thread_id", activeId).order("created_at");
      setHistory((msgs ?? []) as any);
      const seed: Event[] = [];
      (msgs ?? []).forEach((m: any) => {
        if (m.role === "user") seed.push({ kind: "user", text: (m.parts?.[0]?.text) ?? "" });
        else seed.push({ kind: "text", text: m.parts?.[0]?.text ?? "" });
      });
      setEvents(seed);
      const { data: fs } = await supabase.from("agent_files").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      setFiles(fs ?? []);
    })();
  }, [activeId, userId]);

  useEffect(() => { eventsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events]);
  useEffect(() => { termRef.current?.scrollTo({ top: termRef.current.scrollHeight }); }, [terminalLines]);

  const newThread = async () => {
    const { data } = await supabase.from("agent_threads").insert({ user_id: userId, title: "New task" } as any).select().single();
    if (data) { setThreads(t => [data as any, ...t]); setActiveId(data.id); setEvents([]); setHistory([]); }
  };

  const deleteThread = async (id: string) => {
    await supabase.from("agent_threads").delete().eq("id", id);
    setThreads(t => t.filter(x => x.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const refreshFiles = async () => {
    const { data } = await supabase.from("agent_files").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    setFiles(data ?? []);
  };

  const pushTerm = (line: string) => setTerminalLines(l => [...l.slice(-200), line]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    let threadId = activeId;
    if (!threadId) {
      const { data } = await supabase.from("agent_threads").insert({ user_id: userId, title: text.slice(0, 60) } as any).select().single();
      if (!data) return;
      threadId = data.id;
      setThreads(t => [data as any, ...t]);
      setActiveId(threadId);
    } else if (threads.find(t => t.id === threadId)?.title === "New task") {
      await supabase.from("agent_threads").update({ title: text.slice(0, 60) }).eq("id", threadId);
      setThreads(t => t.map(x => x.id === threadId ? { ...x, title: text.slice(0, 60) } : x));
    }

    setInput("");
    setBusy(true);
    setEvents(e => [...e, { kind: "user", text }]);
    pushTerm(`$ user> ${text}`);

    // Persist user message
    await supabase.from("agent_messages").insert({ thread_id: threadId, user_id: userId, role: "user", parts: [{ type: "text", text }] } as any);

    const fullHistory = [...history.map(m => ({ role: m.role, text: m.parts?.[0]?.text ?? "" })), { role: "user", text }];

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-os`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ threadId, history: fullHistory, userId }),
      });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const block of blocks) {
          const lines = block.split("\n");
          let ev = "", data = "";
          for (const ln of lines) {
            if (ln.startsWith("event: ")) ev = ln.slice(7);
            else if (ln.startsWith("data: ")) data += ln.slice(6);
          }
          if (!ev) continue;
          let payload: any = {}; try { payload = JSON.parse(data); } catch {}
          if (ev === "tool_call") {
            if (payload.name === "think") {
              setEvents(e => [...e, { kind: "thought", text: payload.args.thought ?? "" }]);
              pushTerm(`▸ think: ${payload.args.thought}`);
            } else if (payload.name === "plan") {
              setEvents(e => [...e, { kind: "plan", steps: payload.args.steps ?? [] }]);
              pushTerm(`▸ plan: ${(payload.args.steps ?? []).length} steps`);
            } else {
              setEvents(e => [...e, { kind: "tool", name: payload.name, args: payload.args }]);
              pushTerm(`$ ${payload.name} ${JSON.stringify(payload.args).slice(0, 80)}`);
            }
          } else if (ev === "tool_result") {
            setEvents(e => {
              const copy = [...e];
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i].kind === "tool" && (copy[i] as any).name === payload.name && !(copy[i] as any).result) {
                  copy[i] = { ...(copy[i] as any), result: payload.result };
                  break;
                }
              }
              return copy;
            });
            pushTerm(`  ↳ ${payload.result?.ok ? "ok" : "fail"}`);
            if (["write_file", "make_report"].includes(payload.name)) refreshFiles();
          } else if (ev === "text") {
            setEvents(e => {
              const last = e[e.length - 1];
              if (last && last.kind === "text") return [...e.slice(0, -1), { kind: "text", text: last.text + payload.text }];
              return [...e, { kind: "text", text: payload.text }];
            });
          } else if (ev === "error") {
            setEvents(e => [...e, { kind: "error", text: payload.error }]);
            pushTerm(`✖ ${payload.error}`);
          } else if (ev === "done") {
            pushTerm("● task complete");
          }
        }
      }
    } catch (e: any) {
      setEvents(ev => [...ev, { kind: "error", text: String(e?.message ?? e) }]);
      pushTerm(`✖ ${e?.message ?? e}`);
    } finally {
      setBusy(false);
      // reload history so subsequent sends include assistant text
      const { data: msgs } = await supabase.from("agent_messages").select("*").eq("thread_id", threadId!).order("created_at");
      setHistory((msgs ?? []) as any);
    }
  };

  const downloadFile = async (f: FileRow) => {
    const { data } = await supabase.from("agent_files").select("content,mime").eq("id", f.id).single();
    if (!data) return;
    if (data.mime === "text/markdown+pdf") {
      // Render markdown content into a PDF in-browser
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 48;
      const maxW = pageW - margin * 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(20);
      pdf.text(f.path.split("/").pop()!.replace(/_/g, " ").replace(/\.md$/, ""), margin, 64);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(data.content, maxW);
      let y = 96;
      for (const ln of lines) {
        if (y > 780) { pdf.addPage(); y = 64; }
        pdf.text(ln, margin, y); y += 16;
      }
      pdf.save(f.path.split("/").pop()!.replace(/\.md$/, ".pdf"));
    } else {
      const blob = new Blob([data.content], { type: data.mime });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = u; a.download = f.path.split("/").pop()!; a.click();
      URL.revokeObjectURL(u);
    }
  };

  const openFileView = async (f: FileRow) => {
    const { data } = await supabase.from("agent_files").select("*").eq("id", f.id).single();
    if (data) setOpenFile(data as FileRow);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-[Quicksand]">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(circle at 15% 10%, #6366f140, transparent 50%), radial-gradient(circle at 85% 90%, #ff8c0030, transparent 50%), linear-gradient(180deg, #050816, #0a0518)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/60 hover:text-white"><ArrowLeft size={18} /></Link>
          <img src={logoSrc} alt="" className="w-8 h-8" style={{ filter: "drop-shadow(0 0 8px #ff8c00aa)" }} />
          <div>
            <h1 className="text-base sm:text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>Weatherza Agent OS</h1>
            <p className="text-[10px] text-white/40">Autonomous AI computer · {busy ? "● running" : "○ idle"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await logoutUser(); }} className="text-white/60 hover:text-white">
          <LogOut size={14} className="mr-1" /> Sign out
        </Button>
      </header>

      {/* Body grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-3 p-3 h-[calc(100vh-60px)]">
        {/* Left: threads + chat */}
        <aside className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col min-h-0">
          <Button onClick={newThread} size="sm" className="bg-orange-500 hover:bg-orange-600 mb-3"><Plus size={14} className="mr-1" /> New task</Button>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {threads.map(t => (
                <div key={t.id} className={`group flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer text-sm ${activeId === t.id ? "bg-white/10" : "hover:bg-white/5"}`} onClick={() => setActiveId(t.id)}>
                  <span className="flex-1 truncate text-white/80">{t.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
              {threads.length === 0 && <p className="text-xs text-white/40 px-2">No tasks yet — start one below.</p>}
            </div>
          </ScrollArea>
        </aside>

        {/* Center: AI computer view */}
        <main className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 text-xs text-white/50">
            <span className="w-2 h-2 rounded-full bg-red-500/70" /><span className="w-2 h-2 rounded-full bg-yellow-500/70" /><span className="w-2 h-2 rounded-full bg-green-500/70" />
            <span className="ml-2">ai-computer · live</span>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {events.length === 0 && (
                <div className="text-center py-16">
                  <Brain className="mx-auto text-orange-400 mb-3" size={42} />
                  <p className="text-white/60 text-sm">Watch the agent think, plan, search the web, write files, and build PDFs — all in real time.</p>
                  <p className="text-white/30 text-xs mt-2">Try: "Search the latest news on Delhi rain and save a PDF report."</p>
                </div>
              )}
              {events.map((e, i) => <EventView key={i} ev={e} />)}
              <div ref={eventsEndRef} />
            </div>
          </ScrollArea>

          {/* Visual terminal */}
          <div className="border-t border-white/10 bg-black/60 px-3 py-2 h-[120px] overflow-hidden">
            <div className="text-[10px] text-white/40 mb-1 flex items-center gap-2"><Wrench size={10} /> terminal</div>
            <div ref={termRef} className="font-mono text-[11px] leading-[1.4] text-green-300/90 overflow-y-auto h-[88px] pr-2">
              {terminalLines.map((l, i) => <div key={i} className={l.startsWith("✖") ? "text-red-400" : l.startsWith("●") ? "text-cyan-300" : l.startsWith("▸") ? "text-violet-300" : ""}>{l}</div>)}
              {busy && <div className="text-orange-300 animate-pulse">▌</div>}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-white/10 p-3 flex gap-2">
            <Textarea
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask the agent to do something — search, scrape, build a report…"
              rows={1} disabled={busy}
              className="bg-white/5 border-white/10 text-white text-sm resize-none min-h-[44px]"
            />
            <Button onClick={send} disabled={busy || !input.trim()} className="bg-orange-500 hover:bg-orange-600">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </main>

        {/* Right: files */}
        <aside className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 text-sm text-white/70"><FileText size={14} /> Workspace files</div>
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {files.map(f => (
                <div key={f.id} className="group flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs">
                  <FileText size={12} className="text-orange-400 shrink-0" />
                  <button onClick={() => openFileView(f)} className="flex-1 text-left truncate text-white/80 hover:text-white">{f.path}</button>
                  <button onClick={() => downloadFile(f)} className="text-white/40 hover:text-white opacity-0 group-hover:opacity-100"><Download size={12} /></button>
                </div>
              ))}
              {files.length === 0 && <p className="text-xs text-white/30 px-2">No files yet. The agent will create them as it works.</p>}
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* File preview modal */}
      {openFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setOpenFile(null)}>
          <div className="bg-zinc-950 border border-white/15 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-sm text-white/80">{openFile.path}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => downloadFile(openFile)}><Download size={14} className="mr-1" /> Download</Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenFile(null)}>Close</Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {openFile.mime.startsWith("text/markdown") ? (
                <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{openFile.content ?? ""}</ReactMarkdown></div>
              ) : (
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">{openFile.content}</pre>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

function EventView({ ev }: { ev: Event }) {
  if (ev.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-orange-500/90 text-white text-sm">{ev.text}</div>
      </div>
    );
  }
  if (ev.kind === "thought") {
    return (
      <div className="flex items-start gap-2 text-sm text-blue-200/80 italic">
        <Brain size={14} className="mt-0.5 shrink-0 text-blue-300" /> {ev.text}
      </div>
    );
  }
  if (ev.kind === "plan") {
    return (
      <div className="bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-400/30 rounded-xl p-3">
        <div className="text-xs text-violet-200 mb-2 flex items-center gap-1"><ListChecks size={12} /> Plan</div>
        <ol className="text-sm text-white/85 space-y-1 list-decimal pl-5">
          {ev.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
    );
  }
  if (ev.kind === "tool") {
    const Icon = TOOL_ICON[ev.name] ?? Wrench;
    const color = TOOL_COLOR[ev.name] ?? "from-white/10 to-transparent border-white/15";
    return (
      <div className={`bg-gradient-to-br ${color} border rounded-xl p-3`}>
        <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
          <Icon size={13} /> <span className="font-medium">{ev.name}</span>
          {!ev.result && <Loader2 size={11} className="animate-spin ml-1" />}
          {ev.result && <span className={`ml-auto text-[10px] ${ev.result.ok ? "text-green-300" : "text-red-300"}`}>{ev.result.ok ? "done" : "error"}</span>}
        </div>
        <details className="text-[11px]">
          <summary className="text-white/50 cursor-pointer">params & result</summary>
          <pre className="mt-2 text-white/70 whitespace-pre-wrap break-all max-h-40 overflow-auto">{JSON.stringify({ args: ev.args, result: ev.result }, null, 2)}</pre>
        </details>
        {ev.name === "web_search" && ev.result?.results && (
          <div className="mt-2 space-y-1">
            {ev.result.results.slice(0, 3).map((r: any, i: number) => (
              <a key={i} href={r.link} target="_blank" rel="noreferrer" className="block text-xs text-amber-200 hover:underline truncate">→ {r.title}</a>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (ev.kind === "text") {
    return (
      <div className="prose prose-invert prose-sm max-w-none text-white/90">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ev.text}</ReactMarkdown>
      </div>
    );
  }
  if (ev.kind === "error") {
    return <div className="text-red-300 text-sm">⚠ {ev.text}</div>;
  }
  return null;
}