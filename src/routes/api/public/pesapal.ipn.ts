// Pesapal IPN endpoint — public, called by Pesapal's servers.
// We do NOT trust the payload. We use it only as a hint, then verify
// the actual status by querying Pesapal directly with the tracking id.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTransactionStatus, mapPesapalStatus } from "@/lib/pesapal.server";

// Map tier id -> duration in days for boost tiers
const BOOST_DURATION_DAYS: Record<string, number> = {
  boost_bronze: 3,
  boost_silver: 7,
  boost_gold: 14,
};

interface OrderRow {
  id: string;
  user_id: string;
  status: string;
  purpose: string;
  metadata: Record<string, unknown> | null;
}

async function fulfillBenefits(merchantReference: string | null, trackingId: string) {
  // Re-fetch the order so we know what to grant
  const query = supabaseAdmin
    .from("payment_orders")
    .select("id,user_id,status,purpose,metadata")
    .limit(1);
  const { data: row } = merchantReference
    ? await query.eq("merchant_reference", merchantReference).maybeSingle()
    : await query.eq("pesapal_tracking_id", trackingId).maybeSingle();

  const order = row as OrderRow | null;
  if (!order || order.status !== "completed") return;

  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const tierId = typeof meta.tier_id === "string" ? meta.tier_id : null;

  if (order.purpose === "boost_product") {
    const productId = typeof meta.product_id === "string" ? meta.product_id : null;
    if (!productId || !tierId) return;
    const days = BOOST_DURATION_DAYS[tierId] ?? 7;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("products")
      .update({
        boosted: true,
        boost_tier: tierId,
        boost_expires_at: expires,
      })
      .eq("id", productId)
      .eq("seller_id", order.user_id); // safety: only the buyer's own product
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      category: "system",
      title: "Boost activated 🚀",
      body: `Your product is now boosted for ${days} days.`,
      link: `/product/${productId}`,
    });
    return;
  }

  if (order.purpose === "verification") {
    await supabaseAdmin
      .from("profiles")
      .update({
        verified: true,
        verified_tier: tierId,
        verified_at: new Date().toISOString(),
      })
      .eq("user_id", order.user_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      category: "system",
      title: "Verification active ✅",
      body: "Your account is now verified. Enjoy the perks!",
      link: "/dashboard",
    });
  }
}

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
  if (mapped === "completed") {
    try {
      await fulfillBenefits(merchantReference, orderTrackingId);
    } catch (err) {
      console.error("fulfillBenefits error:", err);
    }
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
