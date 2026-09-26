import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { generateDailySummary } from "@/lib/ai-summary.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/ai-summary")({
  head: () => ({
    meta: [
      { title: "AI Daily Summary | ZB SYSTEM" },
      { name: "description", content: "AI summary of daily seat bookings, busiest booking points and possible issues." },
      { property: "og:title", content: "AI Daily Summary | ZB SYSTEM" },
      { property: "og:description", content: "Daily booking and schedule insights for master admins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiSummaryPage,
});

function AiSummaryPage() {
  const [date, setDate] = useState(() => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10));
  const fn = useServerFn(generateDailySummary);
  const m = useMutation({ mutationFn: () => fn({ data: { date } }) });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">AI দৈনিক সারসংক্ষেপ</h1>
      <div className="panel flex flex-wrap items-end gap-3 p-5">
        <div className="space-y-1">
          <Label htmlFor="ai-date">তারিখ</Label>
          <Input id="ai-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>
          <Sparkles className="size-4" /> {m.isPending ? "তৈরি হচ্ছে…" : "সারসংক্ষেপ তৈরি করুন"}
        </Button>
      </div>
      {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
      {m.data && (
        <div className="panel whitespace-pre-wrap p-5 text-sm leading-relaxed">{m.data.summary || "কোনো তথ্য পাওয়া যায়নি"}</div>
      )}
    </div>
  );
}
