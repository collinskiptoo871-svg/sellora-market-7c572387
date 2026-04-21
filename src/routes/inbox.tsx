import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Sellora" }] }),
  component: Inbox,
});

function Inbox() {
  return (
    <AppLayout>
      <h1 className="mb-3 text-xl font-bold">Inbox</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-10 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No messages yet</p>
        <p className="mt-1 text-sm text-muted-foreground">When buyers message you, conversations will appear here.</p>
      </div>
    </AppLayout>
  );
}
