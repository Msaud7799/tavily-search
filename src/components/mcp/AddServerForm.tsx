"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface AddServerFormProps {
  onAdd: (server: any) => void;
  isLight: boolean;
}

export default function AddServerForm({ onAdd, isLight }: AddServerFormProps) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "sse">("stdio");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (transport === "sse" && !url.trim()) return;
    if (transport === "stdio" && !command.trim()) return;

    onAdd({
      name,
      transport,
      url: transport === "sse" ? url : undefined,
      command: transport === "stdio" ? command : undefined,
      args: transport === "stdio" ? args.split(" ").filter(Boolean) : [],
      disabled: false,
    });

    setName("");
    setUrl("");
    setCommand("");
    setArgs("");
  };

  const inputClass = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition-colors mb-3`;
  const bg = isLight ? "bg-white border-indigo-100 text-slate-800 focus:border-indigo-400" 
                    : "bg-slate-800 border-slate-700 text-slate-100 focus:border-indigo-500";

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl mb-4" style={{
      background: isLight ? "rgba(99,102,241,0.04)" : "rgba(0,0,0,0.2)"
    }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}>
        إضافة سيرفر MCP جديد
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-1">
        <div>
          <label className="block text-xs mb-1 opacity-70">الاسم</label>
          <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} ${bg}`} placeholder="أمثلة: filesystem, github" />
        </div>
        <div>
          <label className="block text-xs mb-1 opacity-70">نوع الاتصال</label>
          <select value={transport} onChange={(e) => setTransport(e.target.value as any)} className={`${inputClass} ${bg}`}>
            <option value="stdio">Local (Stdio)</option>
            <option value="sse">Remote (SSE HTTP)</option>
          </select>
        </div>
      </div>

      {transport === "sse" ? (
        <div>
          <label className="block text-xs mb-1 opacity-70">رابط السيرفر (URL)</label>
          <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={`${inputClass} ${bg}`} placeholder="http://localhost:3000/sse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1 opacity-70">الأمر (Command)</label>
            <input required type="text" value={command} onChange={(e) => setCommand(e.target.value)} className={`${inputClass} ${bg}`} placeholder="npx أو node" />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">المتغيرات (Arguments)</label>
            <input type="text" value={args} onChange={(e) => setArgs(e.target.value)} className={`${inputClass} ${bg}`} placeholder="-y @modelcontextprotocol/server-filesystem ." />
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
        style={{
          background: isLight ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
        }}
      >
        <Plus className="w-4 h-4" />
        إضافة السيرفر
      </button>
    </form>
  );
}
