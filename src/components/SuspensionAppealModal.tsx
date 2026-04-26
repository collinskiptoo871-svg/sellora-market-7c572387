import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Appeal {
  id: string;
  status: "pending" | "approved" | "rejected";
  message: string;
  admin_response: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Flag {
  id: string;
  severity: string;
  category: string;
  reason: string;
  created_at: string;
}

function formatRemaining(until: string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export function SuspensionAppealModal() {
  const { user } = useAuth();
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [latestFlag, setLatestFlag] = useState<Flag | null>(null);
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [open, setOpen] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionShown, setDecisionShown] = useState<Appeal | null>(null);
  const [, tick] = useState(0);

  // tick for countdown
  useEffect(() => {
    if (!suspendedUntil) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [suspendedUntil]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prof } = await (supabase.from("profiles") as any)
        .select("suspended_until")
        .eq("user_id", user.id)
        .maybeSingle();
      const until = (prof?.suspended_until as string | null) ?? null;
      const isSusp = !!until && new Date(until) > new Date();
      if (!mounted) return;
      setSuspendedUntil(isSusp ? until : null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: flag } = await (supabase.from("moderation_flags" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestFlag((flag as Flag | null) ?? null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ap } = await (supabase.from("moderation_appeals" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setAppeal((ap as Appeal | null) ?? null);

      if (isSusp) setOpen(true);
    };

    void load();

    const channel = supabase
      .channel(`susp-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newUntil = (payload.new as any)?.suspended_until as string | null;
          const isSusp = !!newUntil && new Date(newUntil) > new Date();
          setSuspendedUntil(isSusp ? newUntil : null);
          if (!isSusp) {
            // unsuspended — close suspension modal, decision modal handles UX
            setOpen(false);
          } else {
            setOpen(true);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "moderation_appeals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const next = payload.new as any as Appeal;
          setAppeal(next);
          if (next.status === "approved" || next.status === "rejected") {
            setDecisionShown(next);
            if (next.status === "approved") {
              toast.success("Your appeal was approved — full access restored.");
            } else {
              toast.error("Your appeal was rejected.");
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "moderation_flags", filter: `user_id=eq.${user.id}` },
        (payload) => setLatestFlag(payload.new as Flag)
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const submitAppeal = async () => {
    if (!user) return;
    if (text.trim().length < 20) {
      toast.error("Please explain in at least 20 characters.");
      return;
    }
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("moderation_appeals" as any) as any)
      .insert({ user_id: user.id, flag_id: latestFlag?.id ?? null, message: text.trim() })
      .select("*")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAppeal(data as Appeal);
    setAppealing(false);
    setText("");
    toast.success("Appeal submitted. We'll review it shortly.");
  };

  const remaining = useMemo(() => (suspendedUntil ? formatRemaining(suspendedUntil) : null), [suspendedUntil]);

  if (!user) return null;

  // ---------- Decision modal (approved/rejected) ----------
  if (decisionShown) {
    const approved = decisionShown.status === "approved";
    return (
      <Dialog open onOpenChange={() => setDecisionShown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approved ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Appeal approved
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Appeal rejected
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {approved
                ? "Your account has been fully restored. You can post, message, and use Sellora normally again."
                : "Our team reviewed your appeal but decided to keep the restriction in place."}
            </DialogDescription>
          </DialogHeader>
          {decisionShown.admin_response && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1 font-semibold">Reviewer note</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{decisionShown.admin_response}</p>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setDecisionShown(null)}
              className="h-10 rounded-md bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground"
            >
              {approved ? "Continue" : "Got it"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------- Suspension modal ----------
  if (!suspendedUntil) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Account suspended
          </DialogTitle>
          <DialogDescription>
            Your account is temporarily restricted by Sellora's safety system. You can still browse, but messaging and
            posting are paused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">Lifts at {new Date(suspendedUntil).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{remaining}</p>
            </div>
          </div>

          {latestFlag && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Reason · {latestFlag.category.replace("_", " ")}
              </p>
              <p className="text-sm">{latestFlag.reason}</p>
            </div>
          )}

          {appeal?.status === "pending" ? (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm">
              <p className="font-semibold">Appeal under review</p>
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(appeal.created_at).toLocaleString()}. You'll be notified instantly when reviewed.
              </p>
            </div>
          ) : appealing ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold">Tell us why this is a mistake</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Explain what happened and why your account should be restored…"
                className="w-full resize-none rounded-md border border-border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-right text-[10px] text-muted-foreground">{text.length}/1000</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Believe this is a mistake? Submit an appeal — a human reviewer will look at it.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {appeal?.status !== "pending" &&
            (appealing ? (
              <>
                <button
                  onClick={() => {
                    setAppealing(false);
                    setText("");
                  }}
                  className="h-10 rounded-md border border-border px-4 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  onClick={submitAppeal}
                  className="h-10 rounded-md bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit appeal"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setAppealing(true)}
                className="h-10 rounded-md bg-[image:var(--gradient-primary)] px-4 text-sm font-semibold text-primary-foreground"
              >
                Appeal suspension
              </button>
            ))}
          <button onClick={() => setOpen(false)} className="h-10 rounded-md border border-border px-4 text-sm font-medium">
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
