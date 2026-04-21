import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/countries";
import { ArrowLeft, Image as ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Sell a product — Sellora" }] }),
  component: Sell,
});

const CONDITIONS = [
  { v: "new", label: "New" },
  { v: "like_new", label: "Like New" },
  { v: "used", label: "Used" },
  { v: "refurbished", label: "Refurbished" },
] as const;

function Sell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<typeof CONDITIONS[number]["v"]>("new");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [shipping, setShipping] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const addPhotos = (files: FileList) => {
    const remaining = 3 - photos.length;
    const next = Array.from(files).slice(0, remaining);
    setPhotos([...photos, ...next]);
    setPreviews([...previews, ...next.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (i: number) => {
    setPhotos(photos.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !price) {
      toast.error("Title and price are required");
      return;
    }
    setBusy(true);
    try {
      const photoUrls: string[] = [];
      for (const f of photos) {
        const path = `${user.id}/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
        const { error } = await supabase.storage.from("products").upload(path, f);
        if (error) throw error;
        photoUrls.push(supabase.storage.from("products").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        title: title.trim(),
        price: Number(price),
        description: description.trim(),
        condition,
        category,
        location: location.trim(),
        shipping_available: shipping,
        photos: photoUrls,
      });
      if (error) throw error;
      toast.success("Product listed!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/" })} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Sell Product</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Upload up to 3 photos. Free accounts: 3 products/day. Boosted: unlimited.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Photos (up to 3)</p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 rounded-full bg-card/90 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="mt-1 text-xs">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addPhotos(e.target.files)}
          />
        </div>

        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Samsung Galaxy S24" maxLength={120} className="input" />
        </Field>

        <Field label="Price (KES)">
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product..."
            maxLength={1000}
            rows={4}
            className="input min-h-[100px] py-2"
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium">Condition</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setCondition(c.v)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  condition === c.v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Nairobi, Kenya" className="input" />
        </Field>

        <label className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm font-medium">Shipping available?</span>
          <input
            type="checkbox"
            checked={shipping}
            onChange={(e) => setShipping(e.target.checked)}
            className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-muted transition checked:bg-primary"
            style={{ position: "relative" }}
          />
        </label>

        <button
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[image:var(--gradient-primary)] font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> {busy ? "Listing..." : "List Product"}
        </button>
      </form>

      <style>{`.input{height:44px;width:100%;border:1px solid var(--border);background:var(--card);border-radius:8px;padding:0 12px;font-size:14px;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
