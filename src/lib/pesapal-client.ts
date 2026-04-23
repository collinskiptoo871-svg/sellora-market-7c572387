import { supabase } from "@/integrations/supabase/client";

export interface InitiatePaymentInput {
  amount: number;
  currency?: string;
  description: string;
  purpose?: "boost_product" | "verification" | "subscription" | "other";
  metadata?: Record<string, unknown>;
  phone?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export async function initiatePesapalPayment(input: InitiatePaymentInput) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("You must be signed in to pay");

  let res: Response;
  try {
    res = await fetch("/api/pesapal/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  let data: { redirect_url?: string; order_tracking_id?: string; merchant_reference?: string; error?: string; details?: unknown } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error(`Payment service unavailable (HTTP ${res.status}). Please try again shortly.`);
  }

  if (!res.ok || !data.redirect_url) {
    const detail = typeof data.details === "object" && data.details
      ? ` (${JSON.stringify(data.details).slice(0, 200)})`
      : "";
    throw new Error((data.error || `Failed to start payment (HTTP ${res.status})`) + detail);
  }
  return data as { redirect_url: string; order_tracking_id: string; merchant_reference: string };
}

export async function verifyPesapalPayment(params: { orderTrackingId?: string; merchantReference?: string }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("You must be signed in");

  const qs = new URLSearchParams();
  if (params.orderTrackingId) qs.set("orderTrackingId", params.orderTrackingId);
  if (params.merchantReference) qs.set("merchantReference", params.merchantReference);

  const res = await fetch(`/api/pesapal/status?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as {
    status: "pending" | "completed" | "failed" | "cancelled" | "reversed";
    order?: Record<string, unknown>;
    error?: string;
  };
}
