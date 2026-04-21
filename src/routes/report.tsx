import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report a Problem — Sellora" }] }),
  component: ReportPage,
});

const REASONS: { value: "misleading" | "counterfeit" | "scam" | "inappropriate" | "other"; label: string }[] = [
  { value: "misleading", label: "Misleading listing" },
  { value: "counterfeit", label: "Counterfeit goods" },
  { value: "scam", label: "Scam / fraud" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

function ReportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState<typeof REASONS[number]["value"]>("other");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reason,
      details: details || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Report submitted. Thank you.");
    setDetails("");
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Report a Problem</h1>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">REASON</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe the issue (optional)"
          rows={5}
          className="w-full rounded-md border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <TriangleAlert className="h-4 w-4" /> {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </AppLayout>
  );
}
