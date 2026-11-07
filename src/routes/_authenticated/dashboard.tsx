import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bus, CalendarDays, CircleDollarSign, Ticket } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড | ZB SYSTEM" },
      { name: "description", content: "গাড়ি, বুকিং পয়েন্ট ও সুপারভাইজারের ট্রিপ এবং আয়ের সারসংক্ষেপ।" },
      { property: "og:title", content: "ড্যাশবোর্ড | ZB SYSTEM" },
      { property: "og:description", content: "গাড়ি, বুকিং পয়েন্ট ও সুপারভাইজারের ট্রিপ এবং আয়ের সারসংক্ষেপ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
const bnNumber = new Intl.NumberFormat("bn-BD");

function Dashboard() {
  const { t } = useI18n();
  const { data: session } = useAuth();
  const today = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pointId, setPointId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  const { data: latestDate } = useQuery({
    queryKey: ["dashboard-latest-trip-date"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("departure_date").order("departure_date", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0]?.departure_date ?? today;
    },
  });

  useEffect(() => {
    if (latestDate && !from && !to) {
      setFrom(latestDate);
      setTo(latestDate);
    }
  }, [latestDate, from, to]);

  const { data: vehicles } = useQuery({
    queryKey: ["dashboard-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, vehicle_number").order("vehicle_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ["dashboard-trips", from, to],
    enabled: Boolean(from && to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, departure_date, trip_direction, vehicle_id, supervisor_id, vehicles(vehicle_number), supervisors(name), seat_bookings(id, amount, seat_numbers, status, booking_point_id, booking_points(name))")
        .gte("departure_date", from)
        .lte("departure_date", to)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredTrips = useMemo(
    () => (trips ?? []).filter((trip) => (!vehicleId || trip.vehicle_id === vehicleId) && (!supervisorId || trip.supervisor_id === supervisorId)),
    [trips, vehicleId, supervisorId],
  );

  const bookingPoints = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of filteredTrips) {
      for (const booking of trip.seat_bookings ?? []) {
        if (booking.booking_point_id) map.set(booking.booking_point_id, booking.booking_points?.name ?? "—");
      }
    }
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTrips]);

  const supervisors = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of trips ?? []) {
      if (trip.supervisor_id) map.set(trip.supervisor_id, trip.supervisors?.name ?? "—");
    }
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [trips]);

  const data = useMemo(() => {
    const vehicleMap = new Map<string, { name: string; up: number; down: number; total: number; trips: number; upTrips: number; downTrips: number }>();
    const pointMap = new Map<string, { name: string; seats: number; amount: number }>();
    const supervisorMap = new Map<string, { name: string; trips: number; amount: number }>();
    let seats = 0;
    let amount = 0;
    let bookedTrips = 0;

    for (const trip of filteredTrips) {
      const activeBookings = (trip.seat_bookings ?? []).filter((booking) => booking.status !== "cancelled");
      const tripAmount = activeBookings.reduce((sum, booking) => sum + Number(booking.amount ?? 0), 0);
      const tripSeats = activeBookings.reduce((sum, booking) => sum + (booking.seat_numbers ?? []).length, 0);
      seats += tripSeats;
      amount += tripAmount;
      if (activeBookings.length) bookedTrips += 1;

      const direction = trip.trip_direction === "down" ? "down" : "up";
      const vehicleKey = trip.vehicle_id ?? `missing-${trip.id}`;
      const vehicle = vehicleMap.get(vehicleKey) ?? {
        name: trip.vehicles?.vehicle_number ?? "—", up: 0, down: 0, total: 0, trips: 0, upTrips: 0, downTrips: 0,
      };
      vehicle[direction] += tripAmount;
      vehicle.total += tripAmount;
      vehicle.trips += 1;
      if (direction === "up") vehicle.upTrips += 1;
      else vehicle.downTrips += 1;
      vehicleMap.set(vehicleKey, vehicle);

      const supervisorKey = trip.supervisor_id ?? `missing-${trip.id}`;
      const supervisor = supervisorMap.get(supervisorKey) ?? { name: trip.supervisors?.name ?? "—", trips: 0, amount: 0 };
      supervisor.trips += 1;
      supervisor.amount += tripAmount;
      supervisorMap.set(supervisorKey, supervisor);

      for (const booking of activeBookings) {
        if (pointId && booking.booking_point_id !== pointId) continue;
        const pointKey = booking.booking_point_id ?? "unknown";
        const point = pointMap.get(pointKey) ?? { name: booking.booking_points?.name ?? "—", seats: 0, amount: 0 };
        point.seats += (booking.seat_numbers ?? []).length;
        point.amount += Number(booking.amount ?? 0);
        pointMap.set(pointKey, point);
      }
    }

    return {
      seats,
      amount,
      bookedTrips,
      vehicles: [...vehicleMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      points: [...pointMap.values()].sort((a, b) => b.amount - a.amount),
      supervisors: [...supervisorMap.values()].sort((a, b) => b.amount - a.amount),
    };
  }, [filteredTrips, pointId]);

  const roleLabel = session?.role === "master_admin" ? t("masterAdmin") : session?.role === "moderator" ? t("moderator") : session?.role === "booking_point" ? t("bookingPoint") : "";
  const cards = [
    { label: t("tripCount"), value: bnNumber.format(filteredTrips.length), icon: Bus },
    { label: t("tripsWithBookings"), value: bnNumber.format(data.bookedTrips), icon: CalendarDays },
    { label: t("totalSeats"), value: bnNumber.format(data.seats), icon: Ticket },
    { label: t("totalCollection"), value: `৳${bnNumber.format(data.amount)}`, icon: CircleDollarSign },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">{t("dashboard")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{session?.name} {roleLabel ? `• ${roleLabel}` : ""}</p>
      </div>

      <section aria-label={t("dashboardFilters")} className="panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="dash-date">{t("date")}</Label>
          <Input id="dash-date" type="date" value={from === to ? from : ""} onChange={(event) => { setFrom(event.target.value); setTo(event.target.value); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-from">{t("fromDate")}</Label>
          <Input id="dash-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-to">{t("toDate")}</Label>
          <Input id="dash-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-vehicle">{t("vehicleNumber")}</Label>
          <select id="dash-vehicle" className={selectClass} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">{t("allVehicles")}</option>
            {vehicles?.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dash-point">{t("bookingPoint")}</Label>
          <select id="dash-point" className={selectClass} value={pointId} onChange={(event) => setPointId(event.target.value)}>
            <option value="">{t("allPoints")}</option>
            {bookingPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="dash-supervisor">{t("supervisor")}</Label>
          <select id="dash-supervisor" className={selectClass} value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}>
            <option value="">{t("allSupervisors")}</option>
            {supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}
          </select>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="panel flex min-h-28 items-center gap-4 p-4">
            <card.icon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-2xl font-semibold">{isLoading ? "—" : card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title={t("vehicleRevenueChart")} loading={isLoading} empty={!data.vehicles.length} emptyLabel={t("noData")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.vehicles} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip formatter={(value) => `৳${bnNumber.format(Number(value))}`} />
              <Legend />
              <Bar dataKey="up" name={t("upTrip")} fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="down" name={t("downTrip")} fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title={t("pointPerformanceChart")} loading={isLoading} empty={!data.points.length} emptyLabel={t("noData")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis yAxisId="seats" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis yAxisId="amount" orientation="right" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip formatter={(value, name) => name === t("sales") ? `৳${bnNumber.format(Number(value))}` : bnNumber.format(Number(value))} />
              <Legend />
              <Bar yAxisId="seats" dataKey="seats" name={t("totalSeats")} fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="amount" dataKey="amount" name={t("sales")} fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title={t("supervisorPerformanceChart")} loading={isLoading} empty={!data.supervisors.length} emptyLabel={t("noData")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.supervisors} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis yAxisId="trips" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis yAxisId="amount" orientation="right" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip formatter={(value, name) => name === t("sales") ? `৳${bnNumber.format(Number(value))}` : bnNumber.format(Number(value))} />
              <Legend />
              <Bar yAxisId="trips" dataKey="trips" name={t("tripCount")} fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="amount" dataKey="amount" name={t("sales")} fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title={t("vehicleTripCountChart")} loading={isLoading} empty={!data.vehicles.length} emptyLabel={t("noData")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.vehicles} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value) => bnNumber.format(Number(value))} />
              <Legend />
              <Bar dataKey="upTrips" name={t("upTrip")} fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="downTrips" name={t("downTrip")} fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </div>
  );
}

function ChartPanel({ title, loading, empty, emptyLabel, children }: { title: string; loading: boolean; empty: boolean; emptyLabel: string; children: React.ReactNode }) {
  return (
    <section className="panel min-w-0 p-4">
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      {loading ? <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">তথ্য লোড হচ্ছে…</div> : empty ? <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">{emptyLabel}</div> : <div className="h-72 w-full">{children}</div>}
    </section>
  );
}