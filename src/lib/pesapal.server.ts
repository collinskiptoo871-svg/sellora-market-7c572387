// Server-only Pesapal helper. NEVER import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PESAPAL_ENV = (process.env.PESAPAL_ENV || "sandbox").toLowerCase();
export const PESAPAL_BASE =
  PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPesapalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing Pesapal credentials");

  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });
  const data = (await res.json()) as { token?: string; expiryDate?: string; error?: unknown };
  if (!res.ok || !data.token) {
    throw new Error(`Pesapal auth failed: ${JSON.stringify(data)}`);
  }
  const expiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 4 * 60_000;
  cachedToken = { token: data.token, expiresAt };
  return data.token;
}

export async function ensureIpn(notificationUrl: string): Promise<string> {
  // Check cached IPN id in DB
  const { data: existing } = await supabaseAdmin
    .from("pesapal_config")
    .select("ipn_id, ipn_url, environment")
    .eq("id", 1)
    .maybeSingle();

  if (existing?.ipn_id && existing.ipn_url === notificationUrl && existing.environment === PESAPAL_ENV) {
    return existing.ipn_id;
  }

  const token = await getPesapalToken();
  const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: notificationUrl, ipn_notification_type: "GET" }),
  });
  const data = (await res.json()) as { ipn_id?: string; error?: unknown };
  if (!res.ok || !data.ipn_id) {
    throw new Error(`Pesapal IPN register failed: ${JSON.stringify(data)}`);
  }

  await supabaseAdmin.from("pesapal_config").upsert({
    id: 1,
    ipn_id: data.ipn_id,
    ipn_url: notificationUrl,
    environment: PESAPAL_ENV,
  });

  return data.ipn_id;
}

export interface PesapalStatusResponse {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string; // COMPLETED | FAILED | INVALID | REVERSED | PENDING
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number; // 0 INVALID, 1 COMPLETED, 2 FAILED, 3 REVERSED
  merchant_reference?: string;
  payment_status_code?: string;
  currency?: string;
  error?: { error_type?: string; code?: string; message?: string } | null;
  status?: string;
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalStatusResponse> {
  const token = await getPesapalToken();
  const url = `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as PesapalStatusResponse;
}

export function mapPesapalStatus(s: PesapalStatusResponse): "pending" | "completed" | "failed" | "cancelled" | "reversed" {
  const desc = (s.payment_status_description || "").toUpperCase();
  if (desc === "COMPLETED") return "completed";
  if (desc === "FAILED" || desc === "INVALID") return "failed";
  if (desc === "REVERSED") return "reversed";
  return "pending";
}
