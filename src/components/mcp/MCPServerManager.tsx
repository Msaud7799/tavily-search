"use client";

import React, { useState, useEffect } from "react";
import ServerCard from "./ServerCard";
import AddServerForm from "./AddServerForm";
import { Server, Activity } from "lucide-react";

export default function MCPServerManager({ isLight }: { isLight: boolean }) {
  const [servers, setServers] = useState<any[]>([]);

  // تحميل الإعدادات من المحافظة المحلية حاليا (ويمكن ربطها بـ json file أو قاعدة البيانات لاحقًا)
  useEffect(() => {
    const saved = localStorage.getItem("mcp-servers");
    if (saved) {
      try {
        setServers(JSON.parse(saved));
      } catch (e) {}
    } else {
      // إعدادات افتراضية مأخوذة من الكود الخاص بك
      const defaults = [
        {
          name: "filesystem",
          transport: "stdio",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "C:/Users/code4/Desktop/chat-ui-new/src"],
          disabled: false,
        },
        {
          name: "mongodb",
          transport: "stdio",
          command: "npx",
          args: ["-y", "mongodb-mcp-server"],
          disabled: false,
        },
        {
          name: "sequential-thinking",
          transport: "stdio",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
          disabled: false,
        }
      ];
      setServers(defaults);
      localStorage.setItem("mcp-servers", JSON.stringify(defaults));
    }
  }, []);

  const saveServers = (newServers: any[]) => {
    setServers(newServers);
    localStorage.setItem("mcp-servers", JSON.stringify(newServers));
  };

  const handleAdd = (server: any) => {
    saveServers([...servers, server]);
  };

  const handleRemove = (name: string) => {
    saveServers(servers.filter((s) => s.name !== name));
  };

  const handleToggle = (name: string, disabled: boolean) => {
    const updated = servers.map((s) => (s.name === name ? { ...s, disabled } : s));
    saveServers(updated);
  };

  return (
    <div dir="rtl" className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Activity className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}>إدارة MCP</h2>
          <p className="text-xs" style={{ color: isLight ? "#64748b" : "#94a3b8" }}>
            Model Context Protocol Tools
          </p>
        </div>
      </div>

      <AddServerForm onAdd={handleAdd} isLight={isLight} />

      <h3 className="text-sm font-bold mb-3 mt-5" style={{ color: isLight ? "#1e293b" : "#f1f5f9" }}>
        السيرفرات المثبتة ({servers.length})
      </h3>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {servers.map((server, i) => (
          <ServerCard
            key={i}
            server={server}
            onRemove={handleRemove}
            onToggleStatus={handleToggle}
            isLight={isLight}
          />
        ))}
        {servers.length === 0 && (
          <div className="text-center py-6 opacity-60 text-sm italic">
            لا توجد سيرفرات مضافة، قم بإضافة سيرفر لاستخدام أدواته.
          </div>
        )}
      </div>
    </div>
  );
}
