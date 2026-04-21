import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { initiatePesapalPayment } from "@/lib/pesapal-client";
import { ArrowLeft, BadgeCheck, Crown, Loader2, Rocket, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — Sellora" }] }),
  component: Payments,
});

interface Order {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

const BOOST_PRICE = 500; // KES, 7-day boost
const VERIFY_PRICE = 1000; // KES, identity verified badge
const PRO_PRICE = 1500; // KES / month

function Payments() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("payment_orders")
      .select("id,amount,currency,description,status,payment_method,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setOrders((data as Order[]) || []));
  }, [user]);

  const pay = async (purpose: "boost_product" | "verification" | "subscription", amount: number, description: string) => {
    if (!user) return;
    setBusy(purpose);
    try {
      const { redirect_url } = await initiatePesapalPayment({
        amount,
        currency: "KES",
        description,
        purpose,
        email: user.email || undefined,
      });
      window.location.href = redirect_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Payments</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Pay securely via M-Pesa, card, or bank with Pesapal.</p>

      <div className="space-y-3">
        <PayCard
          Icon={Rocket}
          title="Boost a product"
          sub="7 days top placement in search & feed"
          price={BOOST_PRICE}
          loading={busy === "boost_product"}
          onPay={() => pay("boost_product", BOOST_PRICE, "Sellora — 7-day product boost")}
        />
        <PayCard
          Icon={BadgeCheck}
          title="Verified seller badge"
          sub="One-time identity verification fee"
          price={VERIFY_PRICE}
          loading={busy === "verification"}
          onPay={() => pay("verification", VERIFY_PRICE, "Sellora — Verified seller badge")}
        />
        <PayCard
          Icon={Crown}
          title="Sellora Pro"
          sub="Unlimited listings, priority support"
          price={PRO_PRICE}
          suffix="/mo"
          loading={busy === "subscription"}
          onPay={() => pay("subscription", PRO_PRICE, "Sellora Pro — monthly")}
        />
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold tracking-wide text-muted-foreground">RECENT PAYMENTS</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-card">
          {orders.map((o, i) => (
            <li key={o.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
              <Wallet className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{o.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {o.payment_method || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{o.currency} {Number(o.amount).toLocaleString()}</p>
                <StatusPill status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Payments verified server-side via Pesapal IPN. <Link to="/settings" className="underline">Settings</Link>
      </p>
    </AppLayout>
  );
}

function PayCard({
  Icon,
  title,
  sub,
  price,
  suffix,
  loading,
  onPay,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  price: number;
  suffix?: string;
  loading: boolean;
  onPay: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">KES {price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">{suffix || ""}</span></p>
        <button
          disabled={loading}
          onClick={onPay}
          className="mt-1 inline-flex h-9 items-center gap-1 rounded-md bg-[image:var(--gradient-primary)] px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {loading ? "Starting…" : "Pay"}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    cancelled: "bg-muted text-muted-foreground",
    reversed: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  };
  return (
    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
