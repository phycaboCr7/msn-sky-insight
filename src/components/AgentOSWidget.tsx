import { Link } from "react-router-dom";
import { ArrowRight, Brain, Sparkles, Terminal, Zap } from "lucide-react";
import widgetImg from "@/assets/agent-os-widget.jpg";

export function AgentOSWidget() {
  return (
    <Link
      to="/agent"
      className="group col-span-full block relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 backdrop-blur-xl shadow-2xl transition-all hover:-translate-y-0.5 hover:shadow-orange-500/30"
      style={{ boxShadow: "0 0 40px hsl(28 100% 55% / 0.15)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">
        {/* Image */}
        <div className="relative h-44 md:h-auto overflow-hidden">
          <img
            src={widgetImg}
            alt="Weatherza Agent OS — futuristic AI brain"
            loading="lazy"
            width={1024}
            height={640}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-black/30 md:to-black/80" />
        </div>

        {/* Body */}
        <div className="relative p-5 sm:p-6 flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: "radial-gradient(circle at 80% 20%, #ff8c0030, transparent 60%), radial-gradient(circle at 10% 80%, #6366f130, transparent 60%)" }} />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-violet-500/20 border border-white/10 text-[11px] uppercase tracking-wider text-orange-200">
              <Sparkles size={11} /> New · Autonomous AI
            </div>

            <h3
              className="text-2xl sm:text-3xl font-semibold text-white mb-2 bg-gradient-to-r from-orange-300 via-white to-violet-300 bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Weatherza Agent OS
            </h3>

            <p className="text-sm text-white/70 leading-relaxed mb-4 max-w-prose">
              An autonomous AI computer that visibly thinks, plans, browses the web,
              writes files, and builds reports — all in real time. Watch the agent
              reason through your task step by step.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-white/60">
              <span className="flex items-center gap-1"><Brain size={12} className="text-blue-300" /> Thinks</span>
              <span className="flex items-center gap-1"><Terminal size={12} className="text-emerald-300" /> Executes</span>
              <span className="flex items-center gap-1"><Zap size={12} className="text-orange-300" /> Reports</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 text-white text-sm font-medium shadow-lg group-hover:shadow-orange-500/40 transition-all">
              Launch Agent OS <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
