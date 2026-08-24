import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { escapeHtml, printDocument } from "@/lib/print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Chandra Paribahan Booking System" },
      {
        name: "description",
        content: "Daily sales and seat occupancy reports per booking point with date filters and PDF export.",
      },
      { property: "og:title", content: "Reports | Chandra Paribahan Booking System" },
      {
        property: "og:description",
        content: "Daily sales and occupancy per booking point, exportable to PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator", "booking_point"]}>
      <ReportsPage />
    </RequireRole>
  ),
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function ReportsPage() {
  const { t } = useI18n();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";

  const [from, setFrom] = useState(today(-7));
  const [to, setTo] = useState(today());
  const [pointId, setPointId] = useState("");

  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => (await supabase.from("booking_points").select("id, name")).data ?? [],
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["report-bookings", from, to, pointId],
    queryFn: async () => {
      let q = supabase
        .from("seat_bookings")
        .select(
          "*, booking_points(name), trips(id, departure_date, departure_time, route, total_seats, vehicles(vehicle_number))",
        )
        .neq("status", "cancelled")
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`)
        .limit(2000);
      if (pointId) q = q.eq("booking_point_id", pointId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const daily = useMemo(() => {
    const map = new Map<string, Map<string, { seats: number; amount: number; tickets: number }>>();
    for (const b of bookings ?? []) {
      const day = String(b.created_at).slice(0, 10);
      const point = b.booking_points?.name ?? "—";
      if (!map.has(day)) map.set(day, new Map());
      const perPoint = map.get(day)!;
      const cur = perPoint.get(point) ?? { seats: 0, amount: 0, tickets: 0 };
      cur.seats += (b.seat_numbers ?? []).length;
      cur.amount += Number(b.amount ?? 0);
      cur.tickets += 1;
      perPoint.set(point, cur);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .flatMap(([day, perPoint]) =>
        [...perPoint.entries()].map(([point, v]) => ({ day, point, ...v })),
      );
  }, [bookings]);

  const occupancy = useMemo(() => {
    const map = new Map<
      string,
      {
        trip: string;
        vehicle: string;
        date: string;
        totalSeats: number;
        booked: number;
        amount: number;
      }
    >();
    for (const b of bookings ?? []) {
      const trip = b.trips;
      if (!trip) continue;
      const vehicle = trip.vehicles?.vehicle_number ?? "—";
      const key = `${trip.id}|${vehicle}`;
      const cur =
        map.get(key) ??
        {
          trip: `${trip.route ?? "—"} · ${String(trip.departure_time ?? "").slice(0, 5)}`,
          vehicle,
          date: trip.departure_date ?? "—",
          totalSeats: trip.total_seats ?? 0,
          booked: 0,
          amount: 0,
        };
      cur.booked += (b.seat_numbers ?? []).length;
      cur.amount += Number(b.amount ?? 0);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [bookings]);

  /** Total bookings + occupancy grouped by schedule (trip), vehicle number and booking point. */
  const overview = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        vehicle: string;
        schedule: string;
        point: string;
        bookings: number;
        seats: number;
        totalSeats: number;
        amount: number;
      }
    >();
    for (const b of bookings ?? []) {
      const trip = b.trips;
      if (!trip) continue;
      const point = b.booking_points?.name ?? "—";
      const vehicle = trip.vehicles?.vehicle_number ?? "—";
      const key = `${trip.id}|${vehicle}|${point}`;
      const cur =
        map.get(key) ??
        {
          date: trip.departure_date ?? "—",
          vehicle,
          schedule: `${trip.route ?? "—"} · ${String(trip.departure_time ?? "").slice(0, 5)}`,
          point,
          bookings: 0,
          seats: 0,
          totalSeats: trip.total_seats ?? 0,
          amount: 0,
        };
      cur.bookings += 1;
      cur.seats += (b.seat_numbers ?? []).length;
      cur.amount += Number(b.amount ?? 0);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) =>
      a.date === b.date
        ? a.vehicle.localeCompare(b.vehicle) || a.point.localeCompare(b.point)
        : a.date < b.date
          ? 1
          : -1,
    );
  }, [bookings]);

  const totals = daily.reduce(
    (acc, r) => ({
      seats: acc.seats + r.seats,
      amount: acc.amount + r.amount,
      tickets: acc.tickets + r.tickets,
    }),
    { seats: 0, amount: 0, tickets: 0 },
  );

  function exportPdf() {
    const salesRows = daily
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.day)}</td><td>${escapeHtml(r.point)}</td><td>${r.tickets}</td><td>${r.seats}</td><td>৳${r.amount}</td></tr>`,
      )
      .join("");
    const occRows = occupancy
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.vehicle)}</td><td>${escapeHtml(
            r.trip,
          )}</td><td>${r.booked}/${r.totalSeats}</td><td>${
            r.totalSeats ? Math.round((r.booked / r.totalSeats) * 100) : 0
          }%</td><td>৳${r.amount}</td></tr>`,
      )
      .join("");
    const overviewRows = overview
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.vehicle)}</td><td>${escapeHtml(
            r.schedule,
          )}</td><td>${escapeHtml(
            r.point,
          )}</td><td>${r.bookings}</td><td>${r.seats}/${r.totalSeats}</td><td>${
            r.totalSeats ? Math.round((r.seats / r.totalSeats) * 100) : 0
          }%</td><td>৳${r.amount}</td></tr>`,
      )
      .join("");

    printDocument(
      `${t("reports")} ${from} – ${to}`,
      `<h1>${escapeHtml(t("appName"))} — ${escapeHtml(t("reports"))}</h1>
       <p class="muted">${escapeHtml(from)} → ${escapeHtml(to)}${
         pointId ? ` · ${escapeHtml(points?.find((p) => p.id === pointId)?.name ?? "")}` : ""
       }</p>
       <h2>${escapeHtml(t("bookingsOverview"))}</h2>
       <table><thead><tr><th>${escapeHtml(t("date"))}</th><th>${escapeHtml(
         t("vehicleNumber"),
       )}</th><th>${escapeHtml(
         t("schedule"),
       )}</th><th>${escapeHtml(t("bookingPoint"))}</th><th>${escapeHtml(
         t("totalBookings"),
       )}</th><th>${escapeHtml(t("seats"))}</th><th>${escapeHtml(t("fillRate"))}</th><th>${escapeHtml(
         t("sales"),
       )}</th></tr></thead><tbody>${overviewRows}</tbody></table>
       <h2>${escapeHtml(t("dailySales"))}</h2>
       <table><thead><tr><th>${escapeHtml(t("date"))}</th><th>${escapeHtml(t("bookingPoint"))}</th><th>${escapeHtml(
         t("tickets"),
       )}</th><th>${escapeHtml(t("seats"))}</th><th>${escapeHtml(t("sales"))}</th></tr></thead>
       <tbody>${salesRows}</tbody>
       <tfoot><tr><td colspan="2">${escapeHtml(t("grandTotal"))}</td><td>${totals.tickets}</td><td>${
         totals.seats
       }</td><td>৳${totals.amount}</td></tr></tfoot></table>
       <h2>${escapeHtml(t("occupancy"))}</h2>
       <table><thead><tr><th>${escapeHtml(t("date"))}</th><th>${escapeHtml(
         t("vehicleNumber"),
       )}</th><th>${escapeHtml(t("trip"))}</th><th>${escapeHtml(
         t("seats"),
       )}</th><th>${escapeHtml(t("fillRate"))}</th><th>${escapeHtml(t("sales"))}</th></tr></thead>
       <tbody>${occRows}</tbody></table>`,
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">{t("reports")}</h1>
        <Button onClick={exportPdf}>
          <FileDown className="mr-2 size-4" />
          {t("exportPdf")}
        </Button>
      </div>

      <div className="panel grid gap-4 p-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rp-from">{t("from")}</Label>
          <Input id="rp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rp-to">{t("to")}</Label>
          <Input id="rp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="rp-point">{t("bookingPoint")}</Label>
            <select
              id="rp-point"
              className={selectClass}
              value={pointId}
              onChange={(e) => setPointId(e.target.value)}
            >
              <option value="">{t("allPoints")}</option>
              {points?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("totalBookings")} value={String(totals.tickets)} />
        <Stat label={t("seats")} value={String(totals.seats)} />
        <Stat label={t("sales")} value={`৳${totals.amount}`} />
      </div>

      <section className="panel overflow-x-auto">
        <h2 className="p-4 pb-0 font-display text-lg uppercase tracking-wide">
          {t("bookingsOverview")}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("schedule")}</TableHead>
              <TableHead>{t("bookingPoint")}</TableHead>
              <TableHead>{t("totalBookings")}</TableHead>
              <TableHead>{t("seats")}</TableHead>
              <TableHead>{t("fillRate")}</TableHead>
              <TableHead>{t("sales")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && overview.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {overview.map((r) => (
              <TableRow key={`${r.date}-${r.vehicle}-${r.schedule}-${r.point}`}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-mono text-xs">{r.vehicle}</TableCell>
                <TableCell className="font-semibold">{r.schedule}</TableCell>
                <TableCell>{r.point}</TableCell>
                <TableCell>{r.bookings}</TableCell>
                <TableCell>
                  {r.seats}/{r.totalSeats}
                </TableCell>
                <TableCell>
                  {r.totalSeats ? Math.round((r.seats / r.totalSeats) * 100) : 0}%
                </TableCell>
                <TableCell>৳{r.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>


      <section className="panel overflow-x-auto">
        <h2 className="p-4 pb-0 font-display text-lg uppercase tracking-wide">{t("dailySales")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("bookingPoint")}</TableHead>
              <TableHead>{t("tickets")}</TableHead>
              <TableHead>{t("seats")}</TableHead>
              <TableHead>{t("sales")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && daily.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {daily.map((r) => (
              <TableRow key={`${r.day}-${r.point}`}>
                <TableCell>{r.day}</TableCell>
                <TableCell className="font-semibold">{r.point}</TableCell>
                <TableCell>{r.tickets}</TableCell>
                <TableCell>{r.seats}</TableCell>
                <TableCell>৳{r.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="panel overflow-x-auto">
        <h2 className="p-4 pb-0 font-display text-lg uppercase tracking-wide">{t("occupancy")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("trip")}</TableHead>
              <TableHead>{t("seats")}</TableHead>
              <TableHead>{t("fillRate")}</TableHead>
              <TableHead>{t("sales")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occupancy.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {occupancy.map((r) => (
              <TableRow key={`${r.date}-${r.vehicle}-${r.trip}`}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-mono text-xs">{r.vehicle}</TableCell>
                <TableCell className="font-semibold">{r.trip}</TableCell>
                <TableCell>
                  {r.booked}/{r.totalSeats}
                </TableCell>
                <TableCell>
                  {r.totalSeats ? Math.round((r.booked / r.totalSeats) * 100) : 0}%
                </TableCell>
                <TableCell>৳{r.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
