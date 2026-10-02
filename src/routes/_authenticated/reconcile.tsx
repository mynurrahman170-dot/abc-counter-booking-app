import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

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

  const { data: trips, isLoading } = useQuery({
    queryKey: ["reconcile", from, to],
    enabled: Boolean(from || to),
    queryFn: async () => {
      let q = supabase
        .from("trips")
        .select("id, departure_date, route, trip_direction, vehicles(vehicle_number), supervisors(name), seat_bookings(amount, status)")
        .order("departure_date", { ascending: false });
      if (from) q = q.gte("departure_date", from);
      if (to) q = q.lte("departure_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const vq = vehicleQ.trim().toLowerCase();
    for (const tr of trips ?? []) {
      const vehicle = tr.vehicles?.vehicle_number ?? "—";
      if (vq && !vehicle.toLowerCase().includes(vq)) continue;
      const key = `${tr.departure_date}|${vehicle}`;
      let r = map.get(key);
      if (!r) {
        r = { key, date: tr.departure_date, vehicle, routes: new Set(), types: new Set(), supervisors: new Set(), up: 0, down: 0 };
        map.set(key, r);
      }
      if (tr.route) r.routes.add(tr.route);
      const isDown = tr.trip_direction === "down";
      r.types.add(isDown ? t("downTrip") : t("upTrip"));
      if (tr.supervisors?.name) r.supervisors.add(tr.supervisors.name);
      const sum = (tr.seat_bookings ?? [])
        .filter((b) => b.status !== "cancelled")
        .reduce((s, b) => s + Number(b.amount ?? 0), 0);
      if (isDown) r.down += sum;
      else r.up += sum;
    }
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date) || a.vehicle.localeCompare(b.vehicle));
  }, [trips, vehicleQ, t]);

  const totals = rows.reduce((a, r) => ({ up: a.up + r.up, down: a.down + r.down }), { up: 0, down: 0 });
  const join = (s: Set<string>) => (s.size ? [...s].join(", ") : "—");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("reconcile")}</h1>

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
                <TableCell className="font-semibold">{r.vehicle}</TableCell>
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
