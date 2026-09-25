"use client";
// src/components/system.tsx
// Client-side primitives: ToastProvider, ActionForm (server action + toast + confirm), Modal, ThemeToggle, Icon.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type FormHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

/* ---------------- Toasts ---------------- */
type Toast = { id: number; tone: "good" | "bad" | "info"; text: string };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto animate-fadein flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-pop ${t.tone === "good" ? "border-good/30 bg-surface text-fg" : t.tone === "bad" ? "border-bad/40 bg-surface text-fg" : "border-border bg-surface text-fg"}`}>
            <span className={`h-2 w-2 rounded-full ${t.tone === "good" ? "bg-good" : t.tone === "bad" ? "bg-bad" : "bg-accent"}`} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- ActionForm ---------------- */
type ActionFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (fd: FormData) => Promise<void>;
  success?: string;
  confirm?: string; // show a confirm dialog before submitting
  resetOnSuccess?: boolean;
};
/** A <form> bound to a server action that shows a toast on completion and optionally asks for confirmation. */
export function ActionForm({ action, success = "Saved", confirm: confirmText, resetOnSuccess, children, ...rest }: ActionFormProps) {
  const { push } = useToast();
  const router = useRouter();
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const run = async (fd: FormData) => {
    try {
      await action(fd);
      push({ tone: "good", text: success });
      router.refresh();
      if (resetOnSuccess) ref.current?.reset();
    } catch (e) {
      // Next.js redirect() throws internally; let it propagate.
      if ((e as Error)?.message?.includes("NEXT_REDIRECT")) throw e;
      push({ tone: "bad", text: (e as Error)?.message ?? "Something went wrong" });
    }
  };
  return (
    <>
      <form
        ref={ref}
        {...rest}
        action={async (fd) => {
          if (confirmText) { setPendingFd(fd); return; }
          await run(fd);
        }}
      >
        {children}
      </form>
      {confirmText && pendingFd && (
        <Modal title="Please confirm" onClose={() => setPendingFd(null)}>
          <p className="text-sm text-fg-2">{confirmText}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setPendingFd(null)} type="button">Cancel</button>
            <button className="btn-danger" type="button" onClick={async () => { const fd = pendingFd; setPendingFd(null); await run(fd); }}>Confirm</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Submit button that shows a pending state while the server action runs. */
export function SubmitButton({ children, className = "btn-primary", pendingText = "Saving…", ...rest }: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? <><Spinner /> {pendingText}</> : children}
    </button>
  );
}
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>;
}

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-fg/30 p-4 pt-[10vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal className={`card animate-fadein w-full ${wide ? "max-w-3xl" : "max-w-lg"} p-5 shadow-pop`}>
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Theme ---------------- */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("theme") as "light" | "dark" | null)) || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
  };
  return (
    <button onClick={toggle} className="btn-ghost btn-sm" aria-label="Toggle theme" title="Toggle light/dark">
      <Icon name={theme === "dark" ? "sun" : "moon"} /> <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

/* ---------------- Icons (tiny inline set) ---------------- */
const paths: Record<string, string> = {
  home: "M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  grid: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  flow: "M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6",
  board: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z",
  doc: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6",
  shield: "M12 2 20 6v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z",
  spark: "M12 2l2.1 5.9L20 10l-5.9 2.1L12 18l-2.1-5.9L4 10l5.9-2.1zM19 16l1 2.5 2.5 1-2.5 1L19 23l-1-2.5-2.5-1 2.5-1z",
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4-4",
  x: "M6 6l12 12M18 6 6 18",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M5 19l-1.5 1.5M20.5 3.5 19 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  chevron: "M9 6l6 6-6 6",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  bolt: "M13 2 3 14h8l-1 8 10-12h-8z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  check: "M5 12l5 5L20 7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
  edit: "M4 20h4l10-10-4-4L4 16zM14 6l4 4",
  users: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  download: "M12 3v12M6 11l6 6 6-6M4 21h16",
  menu: "M4 6h16M4 12h16M4 18h16",
};
export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.grid} />
    </svg>
  );
}
