"use client";

import { useState } from "react";
import { Server, CheckCircle, XCircle, Trash2, Power } from "lucide-react";

interface ServerCardProps {
  server: any;
  onRemove: (id: string) => void;
  onToggleStatus: (id: string, disabled: boolean) => void;
  isLight: boolean;
}

export default function ServerCard({ server, onRemove, onToggleStatus, isLight }: ServerCardProps) {
  return (
    <div
      className="p-4 rounded-xl border transition-all mb-3 flex items-center justify-between"
      style={{
        background: isLight ? "rgba(255,255,255,0.7)" : "rgba(30,41,59,0.5)",
        borderColor: isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-lg"
          style={{ background: isLight ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)" }}
        >
          <Server className="w-5 h-5" style={{ color: isLight ? "#4f46e5" : "#818cf8" }} />
        </div>
        <div>
          <h4 className="font-bold text-sm" style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}>
            {server.name}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: isLight ? "#64748b" : "#94a3b8" }}>
            {server.transport === "stdio" ? server.command : server.url}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
          {server.disabled ? "موقوف" : "نشط"}
        </button>

        <button
          onClick={() => onRemove(server.name)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
          title="حذف"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
