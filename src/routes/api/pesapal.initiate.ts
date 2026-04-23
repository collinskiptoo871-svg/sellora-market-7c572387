import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ensureIpn, getPesapalToken, PESAPAL_BASE } from "@/lib/pesapal.server";
import type { Database } from "@/integrations/supabase/types";

interface InitiateBody {
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

export const Route = createFileRoute("/api/pesapal/initiate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Authenticate user via bearer token
          const auth = request.headers.get("authorization");
          if (!auth?.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const token = auth.slice(7);
          const userClient = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
          );
          const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
          if (authErr || !claims?.claims?.sub) {
            return Response.json({ error: "Invalid token" }, { status: 401 });
          }
          const userId = claims.claims.sub;

          const body = (await request.json()) as InitiateBody;
          if (!body.amount || body.amount <= 0 || !body.description) {
            return Response.json({ error: "Invalid amount or description" }, { status: 400 });
          }
          if (body.amount > 1_000_000) {
            return Response.json({ error: "Amount too large" }, { status: 400 });
          }

          // Require completed profile (name + country) before allowing payments
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("display_name,country")
            .eq("user_id", userId)
            .maybeSingle();
          if (!prof?.display_name || !prof?.country) {
            return Response.json(
              { error: "Please complete your profile (name and verified location) before paying." },
              { status: 400 }
            );
          }

          // Build callback + IPN URLs from request origin
          const origin = new URL(request.url).origin;
          const callbackUrl = `${origin}/payment/return`;
          const ipnUrl = `${origin}/api/public/pesapal/ipn`;

          let ipnId: string;
          try {
            ipnId = await ensureIpn(ipnUrl);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return Response.json({ error: "Could not register payment notification URL.", details: msg }, { status: 502 });
          }

          const merchantReference = `SLR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

          const { error: insertErr } = await supabaseAdmin.from("payment_orders").insert({
            user_id: userId,
            merchant_reference: merchantReference,
            amount: body.amount,
            currency: body.currency || "KES",
            description: body.description.slice(0, 200),
            purpose: body.purpose || "other",
            metadata: (body.metadata || {}) as never,
            status: "pending",
          });
          if (insertErr) {
            return Response.json({ error: "Failed to create order", details: insertErr.message }, { status: 500 });
          }

          let accessToken: string;
          try {
            accessToken = await getPesapalToken();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return Response.json({ error: "Pesapal authentication failed. Please try again.", details: msg }, { status: 502 });
          }

          const submit = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              id: merchantReference,
              currency: body.currency || "KES",
              amount: body.amount,
              description: body.description.slice(0, 100),
              callback_url: callbackUrl,
              notification_id: ipnId,
              billing_address: {
                email_address: body.email || claims.claims.email || undefined,
                phone_number: body.phone || undefined,
                first_name: body.first_name || undefined,
                last_name: body.last_name || undefined,
              },
            }),
          });
          const submitData = (await submit.json()) as {
            order_tracking_id?: string;
            redirect_url?: string;
            merchant_reference?: string;
            error?: unknown;
          };
          if (!submit.ok || !submitData.order_tracking_id || !submitData.redirect_url) {
            await supabaseAdmin
              .from("payment_orders")
              .update({ status: "failed", raw_status_response: submitData as never })
              .eq("merchant_reference", merchantReference);
            const errMsg =
              (submitData.error as { message?: string } | undefined)?.message ||
              "Pesapal rejected the order. Please try again.";
            return Response.json({ error: errMsg, details: submitData }, { status: 502 });
          }

          await supabaseAdmin
            .from("payment_orders")
            .update({
              pesapal_tracking_id: submitData.order_tracking_id,
              redirect_url: submitData.redirect_url,
            })
            .eq("merchant_reference", merchantReference);

          return Response.json({
            redirect_url: submitData.redirect_url,
            order_tracking_id: submitData.order_tracking_id,
            merchant_reference: merchantReference,
          });
        } catch (err) {
          console.error("Pesapal initiate error:", err);
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ error: "Server error", details: msg }, { status: 500 });
        }
      },
    },
  },
});
