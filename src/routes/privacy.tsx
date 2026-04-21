import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy — Sellora" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showOnline, setShowOnline] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Privacy Settings</h1>
      </div>

      <ul className="overflow-hidden rounded-lg border border-border bg-card">
        <Toggle label="Show online status" checked={showOnline} onChange={setShowOnline} />
        <Toggle label="Show my location on profile" checked={showLocation} onChange={setShowLocation} />
        <Toggle label="Allow direct messages" checked={allowMessages} onChange={setAllowMessages} />
        <Toggle label="Send read receipts" checked={readReceipts} onChange={setReadReceipts} />
      </ul>

      <button
        onClick={() => toast.success("Privacy preferences saved")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] py-3 text-sm font-semibold text-primary-foreground"
      >
        <Lock className="h-4 w-4" /> Save preferences
      </button>
    </AppLayout>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </li>
  );
}
