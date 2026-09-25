import { publicSettings } from "@/lib/settings";
import { ConfigPanel } from "@/components/ConfigPanel";
export const dynamic = "force-dynamic";

export default function ConfigurationPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-fg">Configuration</h1>
        <p className="text-sm text-muted">Choose what powers the company: the Claude Cowork bridge, a cloud AI API key (Claude, OpenAI/Codex, Gemini, OpenRouter, any OpenAI-compatible server), or a local Ollama model. Switch any time — the queue, the personas and the SOPs stay the same.</p>
      </header>
      <ConfigPanel initial={publicSettings()} />
    </div>
  );
}
