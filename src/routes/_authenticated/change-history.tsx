import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/change-history")({
  head: () => ({
    meta: [
      { title: "Change History | ZB SYSTEM" },
      { name: "description", content: "Who changed trip and schedule vehicle, supervisor and time, and when." },
      { property: "og:title", content: "Change History | ZB SYSTEM" },
      { property: "og:description", content: "Full audit trail of trip and schedule changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChangeHistoryPage,
});

const FIELD: Record<string, string> = { vehicle: "গাড়ি", supervisor: "সুপারভাইজার", time: "সময়" };
const ENTITY: Record<string, string> = { trips: "ট্রিপ", schedules: "শিডিউল" };

function ChangeHistoryPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["change_log_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("change_log").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const s = q.trim().toLowerCase();
  const rows = (data ?? []).filter((r) => !s || [r.old_value, r.new_value, r.actor_name].some((v) => (v ?? "").toLowerCase().includes(s)));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">পরিবর্তনের ইতিহাস</h1>
      <Input placeholder="গাড়ি নম্বর / নাম / সুপারভাইজার দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>সময়</TableHead><TableHead>ধরন</TableHead><TableHead>বিষয়</TableHead>
              <TableHead>আগে</TableHead><TableHead>পরে</TableHead><TableHead>কে করেছে</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                <TableCell>{ENTITY[r.entity_type] ?? r.entity_type}</TableCell>
                <TableCell>{FIELD[r.field] ?? r.field}</TableCell>
                <TableCell>{r.old_value ?? "—"}</TableCell>
                <TableCell className="font-semibold">{r.new_value ?? "—"}</TableCell>
                <TableCell>{r.actor_name ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো পরিবর্তন নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
