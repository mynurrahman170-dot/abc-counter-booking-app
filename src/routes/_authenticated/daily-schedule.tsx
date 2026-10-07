import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/daily-schedule")({
  head: () => ({
    meta: [
      { title: "Daily Trip Schedule | ZB SYSTEM" },
      { name: "description", content: "View daily trip schedules by date and vehicle number." },
      { property: "og:title", content: "Daily Trip Schedule | ZB SYSTEM" },
      { property: "og:description", content: "Daily trip schedules for all booking points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailySchedulePage,
});

function DailySchedulePage() {
  const { t } = useI18n();
  const today = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [dir, setDir] = useState<"up" | "down">("up");

  // Default: today, or the latest schedule date if today has none
  useEffect(() => {
    void (async () => {
      const { count } = await supabase
        .from("schedules")
        .select("id", { count: "exact", head: true })
        .eq("departure_date", today);
      if (count) return setDate(today);
      const { data } = await supabase
        .from("schedules")
        .select("departure_date")
        .order("departure_date", { ascending: false })
        .limit(1);
      setDate(data?.[0]?.departure_date ?? today);
    })();
  }, [today]);

  const { data: all, isLoading } = useQuery({
    queryKey: ["daily-schedules", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, vehicles(vehicle_number), supervisors(name)")
        .eq("departure_date", date)
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const q = vehicle.trim().toLowerCase();
  const byVehicle = (all ?? []).filter(
    (r) => !q || (r.vehicles?.vehicle_number ?? "").toLowerCase().includes(q),
  );
  const rows = byVehicle.filter((r) => (r.trip_direction === "down" ? "down" : "up") === dir);
  const countUp = byVehicle.filter((r) => r.trip_direction !== "down").length;
  const countDown = byVehicle.length - countUp;
  const routeGroups = Array.from(new Set(rows.map((r) => r.route))).sort((a, b) => a.localeCompare(b, "bn"))
    .map((route) => ({ route, trips: rows.filter((r) => r.route === route) }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("dailySchedule")}</h1>

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="ds-date">{t("date")}</Label>
          <Input id="ds-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-vehicle">{t("vehicleNumber")}</Label>
          <div className="flex gap-1">
            <Input id="ds-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            {vehicle && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setVehicle("")}>
                ✕
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={dir === "up" ? "default" : "outline"} onClick={() => setDir("up")}>
            {t("upTrip")} ({countUp})
          </Button>
          <Button variant={dir === "down" ? "default" : "outline"} onClick={() => setDir("down")}>
            {t("downTrip")} ({countDown})
          </Button>
        </div>
      </div>

      {(isLoading || !date) && <p>{t("loading")}</p>}
      {date && !isLoading && rows.length === 0 && <p className="text-muted-foreground">{t("noData")}</p>}
      {routeGroups.map((group) => (
      <section key={group.route} className="space-y-3">
        <h2 className="border-b border-border pb-2 text-lg font-semibold">{group.route} <span className="text-sm text-muted-foreground">({group.trips.length})</span></h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("time")}</TableHead>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("route")}</TableHead>
              <TableHead>{t("supervisor")}</TableHead>
              <TableHead>নাইট হোল্ড</TableHead>
              <TableHead>{t("fare")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || !date) && (
              <TableRow><TableCell colSpan={7}>{t("loading")}</TableCell></TableRow>
            )}
            {date && !isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">{t("noData")}</TableCell></TableRow>
            )}
            {group.trips.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.departure_date}</TableCell>
                <TableCell className="font-semibold">{r.departure_time}</TableCell>
                <TableCell className="font-semibold">{r.vehicles?.vehicle_number ?? "—"}</TableCell>
                <TableCell>{r.route}</TableCell>
                <TableCell>{r.supervisors?.name ?? "—"}</TableCell>
                <TableCell>{r.night_hold ? "✓" : "—"}</TableCell>
                <TableCell>{r.fare}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </section>
      ))}
    </div>
  );
}
