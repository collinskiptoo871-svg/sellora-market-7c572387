import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Sellora" }] }),
  component: Admin,
});

interface Report { id: string; reason: string; details: string | null; severity: number; resolved: boolean; created_at: string; reporter_id: string; target_user_id: string | null; target_product_id: string | null }

function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ users: 0, products: 0, reports: 0 });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = (data ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;
      const [{ data: rep }, { count: pCount }, { count: uCount }] = await Promise.all([
        supabase.from("reports").select("*").eq("resolved", false).order("severity", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setReports((rep as Report[]) ?? []);
      setStats({ users: uCount ?? 0, products: pCount ?? 0, reports: rep?.length ?? 0 });
    })();
  }, [user, loading, navigate]);

  if (isAdmin === false) return <AppLayout><p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">You don't have admin access.</p></AppLayout>;
  if (isAdmin === null) return <AppLayout><p className="p-8 text-center text-muted-foreground">Loading...</p></AppLayout>;

  const resolve = async (id: string) => {
    await supabase.from("reports").update({ resolved: true }).eq("id", id);
    setReports((r) => r.filter((x) => x.id !== id));
    toast.success("Report resolved");
  };

  return (
    <AppLayout>
      <h1 className="mb-3 text-xl font-bold">Admin</h1>
      <div className="grid grid-cols-3 gap-2">
        {[["Users", stats.users], ["Active products", stats.products], ["Open reports", stats.reports]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-5 mb-2 text-lg font-bold">Report queue</h2>
      <ul className="space-y-2">
        {reports.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No open reports</p>}
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium capitalize text-destructive">{r.reason}</span>
              <span className="text-xs text-muted-foreground">Severity {r.severity}</span>
            </div>
            {r.details && <p className="mt-2 text-sm">{r.details}</p>}
            <button onClick={() => resolve(r.id)} className="mt-2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Resolve</button>
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
