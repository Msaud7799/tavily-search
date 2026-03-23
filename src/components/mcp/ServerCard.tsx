"use client";

import { useState } from "react";
import { Server, Trash2, Power, ChevronDown, ChevronUp, Loader2, Wrench } from "lucide-react";

interface ServerCardProps {
  server: any;
  onRemove: (id: string) => void;
  onToggleStatus: (id: string, disabled: boolean) => void;
  isLight: boolean;
}

export default function ServerCard({ server, onRemove, onToggleStatus, isLight }: ServerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  const toggleFold = async () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && tools.length === 0) {
      setLoadingTools(true);
      try {
        const res = await fetch("/api/mcp/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ server })
        });
        const data = await res.json();
        if (data.tools) {
          setTools(data.tools);
        }
      } catch (err) {
        console.error("Failed to load tools", err);
      } finally {
        setLoadingTools(false);
      }
    }
  };

  return (
    <div
      className="mb-3 rounded-xl border transition-all overflow-hidden relative"
      style={{
        background: isLight ? "rgba(255,255,255,0.7)" : "rgba(30,41,59,0.5)",
        borderColor: isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.1)",
      }}
    >
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={toggleFold}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg flex-shrink-0"
            style={{ background: isLight ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)" }}
          >
            <Server className="w-5 h-5" style={{ color: isLight ? "#4f46e5" : "#818cf8" }} />
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}>
              {server.name}
            </h4>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: isLight ? "#64748b" : "#94a3b8" }} title={server.transport === "stdio" ? server.command : server.url}>
              {server.transport === "stdio" ? server.command + ' ' + (server.args?.join(' ') || '') : server.url}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleStatus(server.name, !server.disabled)}
            className="p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold"
            style={{
              background: server.disabled ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
              color: server.disabled ? "#ef4444" : "#10b981",
            }}
            title={server.disabled ? "تفعيل السيرفر" : "إيقاف السيرفر"}
          >
            <Power className="w-4 h-4" />
            <span className="hidden sm:inline">{server.disabled ? "موقوف" : "نشط"}</span>
          </button>

          <button
            onClick={() => onRemove(server.name)}
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <div className="ml-1 text-slate-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div 
          className="px-4 pb-4 pt-2 border-t"
          style={{ borderColor: isLight ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold" style={{ color: isLight ? "#334155" : "#cbd5e1" }}>
              الأدوات المتوفرة
            </span>
            {loadingTools && <Loader2 className="w-3 h-3 animate-spin text-indigo-400 ml-2" />}
          </div>
          
          {!loadingTools && tools.length === 0 ? (
            <p className="text-xs italic text-gray-500">لا توجد أدوات متاحة أو فشل جلبها.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {tools.map((t, idx) => (
                <div key={idx} className="p-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div className="font-semibold text-xs mb-1 font-mono text-indigo-600 dark:text-indigo-400">
                    {t.function.name}
                  </div>
                  <div className="text-[11px] leading-relaxed opacity-80" style={{ color: isLight ? "#475569" : "#94a3b8" }}>
                    {t.function.description || "لا يوجد وصف للأداة."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
