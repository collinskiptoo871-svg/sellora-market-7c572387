import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { GuestGate } from "@/components/GuestGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inbox/$userId")({
  validateSearch: (s: Record<string, unknown>) => ({
    product: typeof s.product === "string" ? s.product : undefined,
  }),
  head: () => ({ meta: [{ title: "Chat — Sellora" }] }),
  component: Chat,
});

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  product_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

function Chat() {
  const { userId } = Route.useParams();
  const { product } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [productInfo, setProductInfo] = useState<{ id: string; title: string; price: number; currency: string; photos: string[] } | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("display_name,avatar_url").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setOther(data ?? null));
    if (product) {
      supabase.from("products").select("id,title,price,currency,photos").eq("id", product).maybeSingle()
        .then(({ data }) => {
          setProductInfo(data ?? null);
          // Pre-fill shortcut message when arriving from a product page
          setBody((prev) => prev || (data ? `Hi! Is "${data.title}" still available?` : prev));
        });
    }
  }, [userId, product]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const q = supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      const { data } = await q;
      if (cancelled) return;
      const list = (data as Msg[]) ?? [];
      setMessages(list);
      // mark unread as read
      const unreadIds = list.filter((m) => m.recipient_id === user.id && !m.read).map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
      }
    };
    load();

    const channel = supabase
      .channel(`chat:${user.id}:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (
            (m.sender_id === user.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === user.id)
          ) {
            setMessages((prev) => [...prev, m]);
            if (m.recipient_id === user.id) {
              supabase.from("messages").update({ read: true }).eq("id", m.id);
            }
          }
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (loading) return <AppLayout><p>Loading…</p></AppLayout>;
  if (!user) return <AppLayout><GuestGate message="Sign in to chat" /></AppLayout>;

  const send = async () => {
    const text = body.trim();
    if (!text) {
      toast.error("Please type a message before sending.");
      return;
    }
    if (text.length > 2000) {
      toast.error("Message is too long (max 2000 characters).");
      return;
    }
    if (sending) return;
    if (user.id === userId) {
      toast.info("You can't message yourself");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: userId,
      product_id: product || null,
      body: text,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else setBody("");
  };

  const initial = (other?.display_name || "U").charAt(0).toUpperCase();

  return (
    <AppLayout>
      <div className="-mx-4 -mt-4 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate({ to: "/inbox" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link to="/shop/$id" params={{ id: userId }} className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={other?.avatar_url ?? undefined} className="h-9 w-9 rounded-full object-cover" />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <p className="font-semibold">{other?.display_name ?? "User"}</p>
        </Link>
      </div>

      {productInfo && (
        <Link
          to="/product/$id"
          params={{ id: productInfo.id }}
          className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-card p-2"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {productInfo.photos[0] && <img src={productInfo.photos[0]} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium">{productInfo.title}</p>
            <p className="text-xs font-bold text-primary">{productInfo.currency} {productInfo.price.toLocaleString()}</p>
          </div>
        </Link>
      )}

      <div ref={scrollRef} className="mt-3 flex max-h-[55vh] flex-col gap-2 overflow-y-auto pb-2">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Say hi 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                    : "mr-auto rounded-bl-sm bg-secondary"
                }`}
              >
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-16 -mx-4 mt-3 flex items-end gap-2 border-t border-border bg-card px-4 py-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          aria-label="Send"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </AppLayout>
  );
}
