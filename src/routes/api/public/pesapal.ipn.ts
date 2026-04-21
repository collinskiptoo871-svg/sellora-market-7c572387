// Pesapal IPN endpoint — public, called by Pesapal's servers.
// We do NOT trust the payload. We use it only as a hint, then verify
// the actual status by querying Pesapal directly with the tracking id.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTransactionStatus, mapPesapalStatus } from "@/lib/pesapal.server";

async function verifyAndUpdate(orderTrackingId: string, merchantReference: string | null) {
  const status = await getTransactionStatus(orderTrackingId);
  const mapped = mapPesapalStatus(status);
  const update = {
    status: mapped,
    payment_method: status.payment_method ?? null,
    confirmation_code: status.confirmation_code ?? null,
    raw_status_response: status as never,
  };
  if (merchantReference) {
    await supabaseAdmin.from("payment_orders").update(update).eq("merchant_reference", merchantReference);
  } else {
    await supabaseAdmin.from("payment_orders").update(update).eq("pesapal_tracking_id", orderTrackingId);
  }
  return mapped;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  let orderTrackingId = url.searchParams.get("OrderTrackingId");
  let merchantReference = url.searchParams.get("OrderMerchantReference");
  let notificationType = url.searchParams.get("OrderNotificationType");

  if (!orderTrackingId && request.method === "POST") {
    try {
      const body = (await request.json()) as Record<string, string | undefined>;
      orderTrackingId = body.OrderTrackingId || body.orderTrackingId || null;
      merchantReference = body.OrderMerchantReference || body.merchantReference || null;
      notificationType = body.OrderNotificationType || body.notificationType || null;
    } catch {
      // ignore
    }
  }

  if (!orderTrackingId) {
    return Response.json({ status: 500, message: "Missing OrderTrackingId" });
  }

  try {
    await verifyAndUpdate(orderTrackingId, merchantReference);
  } catch (err) {
    console.error("IPN verify error:", err);
    return Response.json({
      orderNotificationType: notificationType,
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 500,
    });
  }

  // Pesapal expects this exact ack shape
  return Response.json({
    orderNotificationType: notificationType,
    orderTrackingId,
    orderMerchantReference: merchantReference,
    status: 200,
  });
}

export const Route = createFileRoute("/api/public/pesapal/ipn")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
