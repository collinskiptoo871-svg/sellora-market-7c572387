import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/preferences")({
  head: () => ({ meta: [{ title: "Preferences — Sellora" }] }),
  component: PreferencesPage,
});

const LANGUAGES = ["English", "Swahili", "French", "Arabic", "Spanish"];
const REGIONS = [
  { label: "Kenya (KES)", code: "KES" },
  { label: "Uganda (UGX)", code: "UGX" },
  { label: "Tanzania (TZS)", code: "TZS" },
  { label: "Nigeria (NGN)", code: "NGN" },
  { label: "United States (USD)", code: "USD" },
];
const THEMES: ("light" | "dark" | "system")[] = ["light", "dark", "system"];

function PreferencesPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("English");
  const [region, setRegion] = useState("KES");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const saved = localStorage.getItem("prefs");
    if (saved) {
      const p = JSON.parse(saved);
      setLang(p.lang || "English");
      setRegion(p.region || "KES");
      setTheme(p.theme || "system");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      const m = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", m);
    }
  }, [theme]);

  const save = () => {
    localStorage.setItem("prefs", JSON.stringify({ lang, region, theme }));
    toast.success("Preferences saved");
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/settings" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Preferences</h1>
      </div>

      <Section title="Language">
        {LANGUAGES.map((l) => (
          <Row key={l} label={l} active={lang === l} onClick={() => setLang(l)} />
        ))}
      </Section>

      <Section title="Region & Currency">
        {REGIONS.map((r) => (
          <Row key={r.code} label={r.label} active={region === r.code} onClick={() => setRegion(r.code)} />
        ))}
      </Section>

      <Section title="Appearance">
        {THEMES.map((t) => (
          <Row key={t} label={t[0].toUpperCase() + t.slice(1)} active={theme === t} onClick={() => setTheme(t)} />
        ))}
      </Section>

      <button
        onClick={save}
        className="mt-2 mb-10 w-full rounded-lg bg-[image:var(--gradient-primary)] py-3 text-sm font-semibold text-primary-foreground"
      >
        Save preferences
      </button>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{title.toUpperCase()}</h2>
      <ul className="overflow-hidden rounded-lg border border-border bg-card">{children}</ul>
    </section>
  );
}

function Row({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left text-sm last:border-b-0">
        <span>{label}</span>
        {active && <Check className="h-4 w-4 text-primary" />}
      </button>
    </li>
  );
}
