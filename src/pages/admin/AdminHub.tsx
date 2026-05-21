import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, Database, ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";

export default function AdminHubPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();

  const menu = [
    { title: "Insight", description: "Analisis Pasar", icon: BarChart3, path: "insight", color: "bg-primary" },
    { title: "Users", description: "Manajemen User", icon: Users, path: "user", color: "bg-brand-primary" },
    { title: "Master", description: "Data Master", icon: Database, path: "master", color: "bg-brand-secondary" },
  ];

  return (
    <div className="bg-white dark:bg-[#050505] text-zinc-900 dark:text-white font-sans transition-colors duration-300">
      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        <h1 className="text-3xl font-black mb-10 tracking-tight text-center">Admin Hub</h1>
        <div className="grid grid-cols-2 gap-4">
          {menu.map((item) => (
            <button
              key={item.title}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center p-6 gap-4 transition-all hover:bg-zinc-100 dark:hover:bg-white/5 rounded-3xl"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">{item.title}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
