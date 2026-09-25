import { listActivity, listCommands, commandStats } from "@/lib/bridge";
import { engineInfo } from "@/lib/settings";
import { ClaudePanel, ConnectionCard } from "@/components/ClaudePanel";
import { Stat } from "@/components/ui";

export default function BridgePage() {
  const stats = commandStats();
  const engine = engineInfo();
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-fg">Claude Bridge</h1>
        <p className="text-sm text-muted">Two-way link between this console and Claude Cowork. Commands typed here are queued for Claude; commands you give Claude in Cowork land here with live progress.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Queued" value={stats.queued} sub="waiting for Claude" />
        <Stat label="Running" value={stats.running} />
        <Stat label="Done" value={stats.done} />
        <Stat label="Failed" value={stats.failed} />
      </div>
      <ConnectionCard engine={engine} tokenRequired={Boolean(process.env.BRIDGE_TOKEN)} />
      <ClaudePanel project={null} engine={engine} initialActivity={listActivity({ limit: 100 })} initialCommands={listCommands({ limit: 50 })} />
    </div>
  );
}
