import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { BadgeCheck, MapPin, Star, UserX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/$id")({
  component: Shop,
});

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  bio: string | null;
  shop_description: string | null;
  verified: boolean;
  created_at: string;
  response_rate: number;
  avg_response_minutes: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
}

function Shop() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("user_id", id).maybeSingle().then(({ data }) => setProfile(data as Profile | null));
    supabase.from("products").select("id,title,price,currency,location,photos,views,seller_id").eq("seller_id", id).eq("status", "active")
      .then(({ data }) => setProducts((data as ProductCardData[]) ?? []));
    supabase.from("reviews").select("id,rating,comment,created_at,reviewer_id").eq("seller_id", id).order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const list = (data as Review[]) ?? [];
        if (list.length) {
          const ids = Array.from(new Set(list.map((r) => r.reviewer_id)));
          const { data: profs } = await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", ids);
          const m = new Map((profs ?? []).map((p) => [p.user_id, p]));
          setReviews(list.map((r) => ({ ...r, reviewer_name: m.get(r.reviewer_id)?.display_name ?? null, reviewer_avatar: m.get(r.reviewer_id)?.avatar_url ?? null })));
        } else setReviews([]);
      });
  }, [id]);

  const blockSeller = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("blocked_users").eq("user_id", user.id).single();
    const list = new Set([...(data?.blocked_users ?? []), id]);
    await supabase.from("profiles").update({ blocked_users: Array.from(list) }).eq("user_id", user.id);
    toast.success("Seller blocked");
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));

  return (
    <AppLayout>
      <div className="-mx-4 -mt-4 h-32 bg-[image:var(--gradient-primary)]">
        {profile?.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="-mt-10 flex items-end gap-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full border-4 border-card object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full border-4 border-card bg-muted" />
        )}
        <div className="pb-1">
          <p className="flex items-center gap-1 text-lg font-bold">
            {profile?.display_name ?? "Seller"}
            {profile?.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </p>
          {profile?.location && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {profile.location}</p>}
        </div>
      </div>
      {profile?.shop_description && <p className="mt-2 text-sm text-muted-foreground">{profile.shop_description}</p>}
      {profile?.bio && <p className="mt-1 text-sm">{profile.bio}</p>}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-card p-2 border border-border"><p className="font-bold">{products.length}</p><p className="text-muted-foreground">Listings</p></div>
        <div className="rounded-lg bg-card p-2 border border-border"><p className="font-bold">{profile?.response_rate ?? 0}%</p><p className="text-muted-foreground">Response</p></div>
        <div className="rounded-lg bg-card p-2 border border-border"><p className="font-bold">{profile?.avg_response_minutes ?? 0}m</p><p className="text-muted-foreground">Avg reply</p></div>
      </div>

      <section className="mt-4 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-warning text-warning" />
          <span className="text-lg font-bold">{avg.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({reviews.length} reviews)</span>
        </div>
        <div className="mt-2 space-y-1">
          {dist.map(({ s, n }) => (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-3">{s}</span>
              <Star className="h-3 w-3 fill-warning text-warning" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-warning" style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
      </section>

      {user && user.id !== id && (
        <button onClick={blockSeller} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-destructive/30 py-2 text-sm font-medium text-destructive">
          <UserX className="h-4 w-4" /> Block Seller
        </button>
      )}

      <h2 className="mt-5 mb-2 text-lg font-bold">Active products</h2>
      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">No active products</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </AppLayout>
  );
}
