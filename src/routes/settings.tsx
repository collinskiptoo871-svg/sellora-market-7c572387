import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, BadgeCheck, Bell, ChevronRight, CreditCard, FileText, Gift, Globe, HelpCircle, Languages, LogOut, Moon, Lock, MessageSquare, ScrollText, ShieldAlert, ShieldCheck, Star, Store, TriangleAlert, UserPen, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Sellora" }] }),
  component: Settings,
});

interface Item { label: string; sub?: string; Icon: React.ComponentType<{ className?: string }>; to?: string }

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "ACCOUNT",
    items: [
      { label: "Edit Profile", Icon: UserPen, to: "/onboarding" },
      { label: "Identity Verification (KYC)", sub: "Submit ID for verified badge", Icon: BadgeCheck },
      { label: "Notifications", Icon: Bell, to: "/notifications" },
      { label: "Privacy Settings", Icon: Lock },
      { label: "Invite Friends", sub: "Share Sellora with your network", Icon: Gift },
    ],
  },
  {
    title: "SELLING",
    items: [
      { label: "Start Selling", sub: "List your first product!", Icon: Store, to: "/sell" },
      { label: "Payments & Boosts", sub: "Pay via M-Pesa, card, or bank", Icon: CreditCard, to: "/payments" },
      { label: "Payment Settings", sub: "Payout method & history", Icon: Wallet, to: "/payments" },
      { label: "Verification & Boost", sub: "Get verified, boost listings", Icon: ShieldCheck, to: "/payments" },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { label: "Language", sub: "English", Icon: Languages },
      { label: "Region & Currency", sub: "Kenya (KES)", Icon: Globe },
      { label: "Appearance", sub: "Light / Dark / System", Icon: Moon },
      { label: "Saved Searches", Icon: Star },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { label: "Help Center", Icon: HelpCircle },
      { label: "Contact Support", Icon: MessageSquare },
      { label: "Rate Sellora", Icon: Star },
    ],
  },
  {
    title: "LEGAL & SAFETY",
    items: [
      { label: "Terms of Service", Icon: ScrollText },
      { label: "Buyer Guidelines", Icon: FileText },
      { label: "Seller Guidelines", Icon: FileText },
      { label: "Community Standards", Icon: TriangleAlert },
      { label: "Safety Tips", Icon: ShieldAlert },
      { label: "Privacy Policy", Icon: FileText },
      { label: "Report a Problem", Icon: TriangleAlert },
    ],
  },
];

function Settings() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/dashboard" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mb-5">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{s.title}</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-card">
            {s.items.map((it, i) => {
              const Inner = (
                <>
                  <it.Icon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.label}</p>
                    {it.sub && <p className="text-xs text-muted-foreground">{it.sub}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              );
              const cls = `flex w-full items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`;
              return (
                <li key={it.label}>
                  {it.to ? <Link to={it.to} className={cls}>{Inner}</Link> : <button className={cls + " text-left"}>{Inner}</button>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </AppLayout>
  );
}
