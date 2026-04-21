// Authenticated endpoint to (re-)verify a payment by tracking id.
// Always queries Pesapal directly — never trusts client-provided status.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTransactionStatus, mapPesapalStatus } from "@/lib/pesapal.server";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/pesapal/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const url = new URL(request.url);
        const trackingId = url.searchParams.get("orderTrackingId");
        const merchantRef = url.searchParams.get("merchantReference");

        if (!trackingId && !merchantRef) {
          return Response.json({ error: "Missing orderTrackingId or merchantReference" }, { status: 400 });
        }

        // Lookup order owned by user
        const query = supabaseAdmin.from("payment_orders").select("*").eq("user_id", userId);
        const { data: order } = trackingId
          ? await query.eq("pesapal_tracking_id", trackingId).maybeSingle()
          : await query.eq("merchant_reference", merchantRef!).maybeSingle();

        if (!order) {
          return Response.json({ error: "Order not found" }, { status: 404 });
        }

        const realTrackingId = order.pesapal_tracking_id || trackingId;
        if (!realTrackingId) {
          return Response.json({ status: order.status, order });
        }

        try {
          const status = await getTransactionStatus(realTrackingId);
          const mapped = mapPesapalStatus(status);
          const { data: updated } = await supabaseAdmin
            .from("payment_orders")
            .update({
              status: mapped,
              payment_method: status.payment_method ?? order.payment_method,
              confirmation_code: status.confirmation_code ?? order.confirmation_code,
              raw_status_response: status as never,
            })
            .eq("id", order.id)
            .select("*")
            .maybeSingle();
          return Response.json({ status: mapped, order: updated || order, pesapal: status });
        } catch (err) {
          console.error("Status check error:", err);
          return Response.json({ status: order.status, order, error: "Verification failed" }, { status: 502 });
        }
      },
    },
  },
});
