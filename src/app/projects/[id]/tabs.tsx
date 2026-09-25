"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/system";

const TABS = [
  { href: "", label: "Pipeline", icon: "flow" },
  { href: "/backlog", label: "Backlog", icon: "doc" },
  { href: "/contracts", label: "Contracts", icon: "doc" },
  { href: "/scrum", label: "Scrum", icon: "board" },
  { href: "/quality", label: "Quality & Delivery", icon: "shield" },
  { href: "/claude", label: "Claude", icon: "spark" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function ProjectTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/projects/${id}`;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-2">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? path === base : path.startsWith(href);
        return (
          <Link key={t.href} href={href} className={`tab flex items-center gap-1.5 whitespace-nowrap ${active ? "tab-active" : ""}`}><Icon name={t.icon} className="h-3.5 w-3.5" />{t.label}</Link>
        );
      })}
    </nav>
  );
}
