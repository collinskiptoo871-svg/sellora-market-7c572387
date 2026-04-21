import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/legal/$doc")({
  head: ({ params }) => ({ meta: [{ title: `${titleFor(params.doc)} — Sellora` }] }),
  component: LegalPage,
});

function titleFor(slug: string) {
  return DOCS[slug]?.title || "Legal";
}

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "Welcome to Sellora. By using our marketplace, you agree to these terms.",
      "You are responsible for the accuracy of listings, lawful sales, and payments you initiate.",
      "Sellora may suspend accounts that violate community standards or applicable law.",
      "Disputes are resolved per the laws of Kenya.",
    ],
  },
  buyer: {
    title: "Buyer Guidelines",
    body: [
      "Inspect items carefully and ask questions before paying.",
      "Use in-app messaging — do not share personal financial info outside Sellora.",
      "Report suspicious sellers immediately.",
    ],
  },
  seller: {
    title: "Seller Guidelines",
    body: [
      "Use clear photos and accurate titles & descriptions.",
      "Respond to buyer messages within 24 hours.",
      "Honor agreed prices and shipping timelines.",
      "Never list prohibited items (weapons, drugs, counterfeit goods).",
    ],
  },
  community: {
    title: "Community Standards",
    body: [
      "Be respectful. No harassment, hate speech, or discrimination.",
      "Repeat violations escalate: yellow → orange → red warning, then suspension.",
    ],
  },
  safety: {
    title: "Safety Tips",
    body: [
      "Meet in public places for in-person transactions.",
      "Verify product condition before paying.",
      "Use Pesapal-secured payments — never wire money outside the app.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect the minimum data needed to run the marketplace.",
      "Your ID for verification is stored securely and never shared.",
      "You may request data deletion at any time from Settings.",
    ],
  },
};

function LegalPage() {
  const { doc } = Route.useParams();
  const navigate = useNavigate();
  const data = DOCS[doc];

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">{data?.title || "Not found"}</h1>
      </div>

      {data ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed">
          {data.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">Last updated: 2026</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Document not found.</p>
      )}
    </AppLayout>
  );
}
