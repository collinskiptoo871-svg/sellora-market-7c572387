import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { verifyPesapalPayment } from "@/lib/pesapal-client";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

interface ReturnSearch {
  OrderTrackingId?: string;
  OrderMerchantReference?: string;
  OrderNotificationType?: string;
}

export const Route = createFileRoute("/payment/return")({
  head: () => ({ meta: [{ title: "Payment status — Sellora" }] }),
  validateSearch: (s: Record<string, unknown>): ReturnSearch => ({
    OrderTrackingId: typeof s.OrderTrackingId === "string" ? s.OrderTrackingId : undefined,
    OrderMerchantReference: typeof s.OrderMerchantReference === "string" ? s.OrderMerchantReference : undefined,
    OrderNotificationType: typeof s.OrderNotificationType === "string" ? s.OrderNotificationType : undefined,
  }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const search = useSearch({ from: "/payment/return" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "cancelled" | "reversed" | "checking">("checking");
  const [message, setMessage] = useState<string>("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!search.OrderTrackingId && !search.OrderMerchantReference) {
        setStatus("failed");
        setMessage("Missing payment reference.");
        return;
      }
      try {
        const r = await verifyPesapalPayment({
          orderTrackingId: search.OrderTrackingId,
          merchantReference: search.OrderMerchantReference,
        });
        if (cancelled) return;
        setStatus(r.status);
        if (r.error) setMessage(r.error);
      } catch (e) {
        if (cancelled) return;
        setStatus("failed");
        setMessage(e instanceof Error ? e.message : "Verification failed");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [search.OrderTrackingId, search.OrderMerchantReference, attempts]);

  // Auto-poll while pending, up to 6 times
  useEffect(() => {
    if (status !== "pending" || attempts >= 6) return;
    const t = setTimeout(() => setAttempts((a) => a + 1), 4000);
    return () => clearTimeout(t);
  }, [status, attempts]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-md py-10 text-center">
        {(status === "checking" || status === "pending") && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {status === "checking" ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Clock className="h-8 w-8 text-primary" />
              )}
            </div>
            <h1 className="text-xl font-bold">
              {status === "checking" ? "Verifying payment…" : "Payment pending"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {status === "checking"
                ? "We're confirming your payment with Pesapal."
                : "Your payment hasn't been confirmed yet. This can take a moment."}
            </p>
            {status === "pending" && (
              <button
                onClick={() => setAttempts((a) => a + 1)}
                className="mt-4 rounded-md border border-border bg-card px-4 py-2 text-sm"
              >
                Check again
              </button>
            )}
          </>
        )}

        {status === "completed" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold">Payment successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">Thanks! Your payment has been verified.</p>
          </>
        )}

        {(status === "failed" || status === "cancelled" || status === "reversed") && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold">
              {status === "reversed" ? "Payment reversed" : status === "cancelled" ? "Payment cancelled" : "Payment failed"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {message || "Your payment didn't go through. You can try again from your dashboard."}
            </p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Back to dashboard
          </Link>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm"
          >
            Settings
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
