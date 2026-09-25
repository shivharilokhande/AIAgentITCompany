import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ToastProvider } from "@/components/system";
import { listProjects } from "@/lib/repo";
import { ensureDemoProject } from "@/lib/seed";
import { engineInfo } from "@/lib/settings";

export const metadata: Metadata = {
  title: "AgentITCompany",
  description: "Project, product and scrum management for the Smart IT by Shiv pipeline",
  icons: { icon: "/favicon.svg" },
};
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  ensureDemoProject();
  const projects = listProjects();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>
        <ToastProvider>
          <AppShell projects={projects} engine={engineInfo()}>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
