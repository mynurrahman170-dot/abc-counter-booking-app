import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reconcile")({
  head: () => ({
    meta: [
      { title: "হিসাব সমন্বয় | ZB SYSTEM" },
      { name: "description", content: "Up and down trip collections per vehicle, combined by date." },
      { property: "og:title", content: "হিসাব সমন্বয় | ZB SYSTEM" },
      { property: "og:description", content: "Up/down trip totals and combined collection per vehicle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReconcilePage,
});

type Row = {
  key: string;
  date: string;
  vehicle: string;
  seq: number;
  held: boolean;
  routes: Set<string>;
  types: Set<string>;
  supervisors: Set<string>;
  up: number;
  down: number;
};

function ReconcilePage() {
  const { t } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vehicleQ, setVehicleQ] = useState("");

  // Default: date of the latest trip entry.
  const { data: latestDate } = useQuery({
    queryKey: ["reconcile-latest"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("departure_date")
        .order("departure_date", { ascending: false })
        .limit(1);
      return data?.[0]?.departure_date ?? new Date().toISOString().slice(0, 10);
    },
  });
  useEffect(() => {
    if (latestDate && !from && !to) {
      setFrom(latestDate);
      setTo(latestDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDate]);

  const shiftDay = (d: string, n: number) => {
    const x = new Date(d + "T00:00:00Z");
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };

  const { data: trips, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reconcile", from, to],
    enabled: Boolean(from || to),
    queryFn: async () => {
      // Fetch one extra day before `from` so night-hold up trips land on their down-trip date.
      let q = supabase
        .from("trips")
        .select("id, departure_date, departure_time, route, trip_direction, trip_seq, night_hold, vehicles(vehicle_number), supervisors(name), seat_bookings(amount, status)")
        .order("departure_date", { ascending: false });
      if (from) q = q.gte("departure_date", shiftDay(from, -1));
      if (to) q = q.lte("departure_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    type Tr = NonNullable<typeof trips>[number];
    const buckets = new Map<string, { date: string; vehicle: string; ups: { tr: Tr; held: boolean }[]; downs: Tr[] }>();
    const vq = vehicleQ.trim().toLowerCase();
    for (const tr of trips ?? []) {
      const vehicle = tr.vehicles?.vehicle_number ?? "—";
      if (vq && !vehicle.toLowerCase().includes(vq)) continue;
      const isDown = tr.trip_direction === "down";
      const held = !isDown && tr.night_hold;
      const date = held ? shiftDay(tr.departure_date, 1) : tr.departure_date;
      if ((from && date < from) || (to && date > to)) continue;
      const bk = `${date}|${vehicle}`;
      let b = buckets.get(bk);
      if (!b) { b = { date, vehicle, ups: [], downs: [] }; buckets.set(bk, b); }
      if (isDown) b.downs.push(tr); else b.ups.push({ tr, held });
    }
    const sum = (tr?: Tr) =>
      (tr?.seat_bookings ?? []).filter((x) => x.status !== "cancelled").reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const out: Row[] = [];
    for (const b of buckets.values()) {
      const byTime = (a: Tr, c: Tr) => (a.trip_seq - c.trip_seq) || (a.departure_time ?? "").localeCompare(c.departure_time ?? "");
      b.ups.sort((a, c) => (Number(c.held) - Number(a.held)) || byTime(a.tr, c.tr));
      b.downs.sort(byTime);
      const n = Math.max(b.ups.length, b.downs.length);
      for (let i = 0; i < n; i++) {
        const u = b.ups[i];
        const d = b.downs[i];
        const r: Row = {
          key: `${b.date}|${b.vehicle}|${i}`, date: b.date, vehicle: b.vehicle, seq: i + 1, held: Boolean(u?.held),
          routes: new Set(), types: new Set(), supervisors: new Set(), up: sum(u?.tr), down: sum(d),
        };
        for (const tr of [u?.tr, d]) {
          if (!tr) continue;
          if (tr.route) r.routes.add(tr.route);
          r.types.add(tr.trip_direction === "down" ? t("downTrip") : t("upTrip"));
          if (tr.supervisors?.name) r.supervisors.add(tr.supervisors.name);
        }
        out.push(r);
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date) || a.vehicle.localeCompare(b.vehicle) || a.seq - b.seq);
  }, [trips, vehicleQ, t, from, to]);

  const totals = rows.reduce((a, r) => ({ up: a.up + r.up, down: a.down + r.down }), { up: 0, down: 0 });
  const join = (s: Set<string>) => (s.size ? [...s].join(", ") : "—");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">{t("reconcile")}</h1>
        <Button type="button" disabled={isFetching} onClick={() => void refetch()}>
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("updateCombined")}
        </Button>
      </div>

      <div className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="rc-date">{t("date")}</Label>
          <Input id="rc-date" type="date" value={from === to ? from : ""} onChange={(e) => { setFrom(e.target.value); setTo(e.target.value); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-from">{t("fromDate")}</Label>
          <Input id="rc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-to">{t("toDate")}</Label>
          <Input id="rc-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-veh">{t("vehicleNumber")}</Label>
          <div className="flex gap-1">
            <Input id="rc-veh" value={vehicleQ} onChange={(e) => setVehicleQ(e.target.value)} placeholder={t("vehicleNumber")} />
            {vehicleQ && (
              <Button type="button" variant="ghost" size="icon" title={t("clear")} onClick={() => setVehicleQ("")}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("routeName")}</TableHead>
              <TableHead>{t("routeType")}</TableHead>
              <TableHead>{t("supervisor")}</TableHead>
              <TableHead className="text-right">{t("upTotal")}</TableHead>
              <TableHead className="text-right">{t("downTotal")}</TableHead>
              <TableHead className="text-right">{t("combinedTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8}>{t("loading")}</TableCell></TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-muted-foreground">{t("noData")}</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.date}</TableCell>
                <TableCell className={`font-semibold ${r.seq > 1 ? "text-destructive" : ""}`}>
                  {r.vehicle}
                  {r.seq > 1 && <span className="ml-1 text-xs">({["", "", "২য়", "৩য়", "৪র্থ", "৫ম"][r.seq] ?? r.seq} ট্রিপ)</span>}
                  {r.held && <span className="ml-1 text-xs font-normal text-muted-foreground">· নাইট হোল্ড</span>}
                </TableCell>
                <TableCell>{join(r.routes)}</TableCell>
                <TableCell>{join(r.types)}</TableCell>
                <TableCell>{join(r.supervisors)}</TableCell>
                <TableCell className="text-right">{r.up}</TableCell>
                <TableCell className="text-right">{r.down}</TableCell>
                <TableCell className="text-right font-semibold">{r.up + r.down}</TableCell>
              </TableRow>
            ))}
            {rows.length > 0 && (
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={5}>{t("combinedTotal")}</TableCell>
                <TableCell className="text-right">{totals.up}</TableCell>
                <TableCell className="text-right">{totals.down}</TableCell>
                <TableCell className="text-right">{totals.up + totals.down}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
