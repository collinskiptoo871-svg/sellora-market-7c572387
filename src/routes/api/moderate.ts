import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface AIVerdict {
  verdict: "ok" | "warn" | "suspend";
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  reason: string;
}

async function callGroq(prompt: string): Promise<AIVerdict | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair content & abuse moderator for a marketplace app (Sellora). Analyze the provided user activity and recent content. Detect: spam, scam attempts, hate/harassment, sexual content, illegal items, rate-limit abuse (too many messages/posts/logins per minute), suspicious login patterns (many IPs/devices in short time), and multi-accounting. Respond ONLY in JSON: {\"verdict\":\"ok|warn|suspend\",\"severity\":\"low|medium|high|critical\",\"category\":\"content|rate_limit|login_anomaly|multi_account|spam|other\",\"reason\":\"short user-facing explanation\"}. Use 'suspend' only for critical/repeated abuse.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Groq error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as AIVerdict;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/moderate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("Authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return new Response("Unauthorized", { status: 401 });

          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          // Pull last 5 minutes of events
          const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: events } = await supabaseAdmin
            .from("moderation_events" as never)
            .select("event_type,content,ip,user_agent,created_at")
            .eq("user_id", userId)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);

          const evts = (events ?? []) as Array<{
            event_type: string;
            content: string | null;
            ip: string | null;
            user_agent: string | null;
            created_at: string;
          }>;

          // Hard rate-limit checks (no AI needed)
          const oneMinAgo = Date.now() - 60_000;
          const recent = evts.filter((e) => new Date(e.created_at).getTime() > oneMinAgo);
          const msgCount = recent.filter((e) => e.event_type === "message").length;
          const postCount = recent.filter((e) => e.event_type === "post").length;
          const loginIPs = new Set(
            evts.filter((e) => e.event_type === "login").map((e) => e.ip).filter(Boolean)
          );

          const flags: Array<{ severity: string; category: string; reason: string }> = [];
          if (msgCount > 15)
            flags.push({ severity: "medium", category: "rate_limit", reason: `Sent ${msgCount} messages in 1 minute. Slow down.` });
          if (postCount > 5)
            flags.push({ severity: "medium", category: "rate_limit", reason: `Posted ${postCount} listings in 1 minute. Looks like spam.` });
          if (loginIPs.size > 3)
            flags.push({ severity: "high", category: "login_anomaly", reason: `Logged in from ${loginIPs.size} different IPs in 5 minutes.` });

          // AI pass on content
          const contentEvents = evts.filter((e) => e.content && (e.event_type === "message" || e.event_type === "post")).slice(0, 10);
          let aiVerdict: AIVerdict | null = null;
          if (contentEvents.length > 0 || flags.length > 0) {
            const prompt = JSON.stringify({
              user_id: userId,
              window: "5 minutes",
              counts: { messages: msgCount, posts: postCount, unique_login_ips: loginIPs.size },
              recent_content: contentEvents.map((e) => ({ type: e.event_type, text: e.content?.slice(0, 500) })),
              hard_flags: flags,
            });
            aiVerdict = await callGroq(prompt);
          }

          // Decide & write flags
          const inserted: Array<{ severity: string; category: string; reason: string; ai?: AIVerdict | null }> = [];
          for (const f of flags) {
            inserted.push({ ...f, ai: null });
          }
          if (aiVerdict && aiVerdict.verdict !== "ok") {
            inserted.push({
              severity: aiVerdict.severity,
              category: aiVerdict.category,
              reason: aiVerdict.reason,
              ai: aiVerdict,
            });
          }

          if (inserted.length > 0) {
            await supabaseAdmin.from("moderation_flags" as never).insert(
              inserted.map((f) => ({
                user_id: userId,
                severity: f.severity,
                category: f.category,
                reason: f.reason,
                ai_verdict: f.ai ? (f.ai as unknown as Record<string, unknown>) : null,
              })) as never
            );

            // Increment warning_count; suspend if AI says so or critical severity
            const shouldSuspend =
              aiVerdict?.verdict === "suspend" ||
              inserted.some((f) => f.severity === "critical");

            const update: Record<string, unknown> = {};
            // increment via fetch
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("warning_count")
              .eq("user_id", userId)
              .maybeSingle();
            update.warning_count = ((prof as { warning_count?: number } | null)?.warning_count ?? 0) + inserted.length;
            if (shouldSuspend) {
              update.suspended_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin.from("profiles") as any).update(update).eq("user_id", userId);
          }

          return Response.json({ ok: true, flags: inserted, ai: aiVerdict });
        } catch (e) {
          console.error("moderate error", e);
          return new Response(JSON.stringify({ error: "moderation failed" }), { status: 500 });
        }
      },
    },
  },
});
