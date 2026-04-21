import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BadgeCheck, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { initiatePesapalPayment } from "@/lib/pesapal-client";

export const Route = createFileRoute("/kyc")({
  head: () => ({ meta: [{ title: "Identity Verification — Sellora" }] }),
  component: KYC,
});

function KYC() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("verified").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setVerified(!!data?.verified);
    });
  }, [user]);

  const pay = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { redirect_url } = await initiatePesapalPayment({
        amount: 1000,
        currency: "KES",
        description: "Sellora — Verified seller badge",
        purpose: "verification",
        email: user.email || undefined,
      });
      window.location.href = redirect_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Identity Verification</h1>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <BadgeCheck className={`h-5 w-5 ${verified ? "text-primary" : "text-muted-foreground"}`} />
          <p className="font-semibold">{verified ? "You are verified" : "Not verified yet"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Verified sellers get a badge, higher trust, and more sales. We never share your ID.
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">1. Upload your government ID</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm">
          <Upload className="h-4 w-4 text-muted-foreground" />
          {file ? file.name : "Choose ID photo (JPG/PNG)"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Stored securely. Reviewed within 24 hours after payment.
        </p>
      </div>

      <button
        disabled={busy || verified}
        onClick={pay}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[image:var(--gradient-primary)] py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {verified ? "Already verified" : "Pay KES 1,000 & submit"}
      </button>
    </AppLayout>
  );
}
