import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { buildSeatRows } from "@/lib/seats";
import { SeatPlan } from "@/components/SeatPlan";
import { TicketDialog, type TicketData } from "@/components/TicketDialog";
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

export const Route = createFileRoute("/_authenticated/seat-booking")({
  head: () => ({
    meta: [
      { title: "Seat Booking | Car Booking Database" },
      {
        name: "description",
        content: "Book seats on a trip; booked seats turn red for every booking point.",
      },
      { property: "og:title", content: "Seat Booking | Car Booking Database" },
      { property: "og:description", content: "Shared seat plan with live booked seats and amounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeatBookingPage,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function SeatBookingPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";
  const isMasterPoint = session?.pointType === "master";

  const [tripId, setTripId] = useState("");
  const [seats, setSeats] = useState<string[]>([]);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [staffPointId, setStaffPointId] = useState("");
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () =>
      (await supabase.from("vehicles").select("id, vehicle_number, seat_count")).data ?? [],
  });
  const { data: supervisors } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => (await supabase.from("supervisors").select("id, name")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () =>
      (await supabase.from("booking_points").select("id, name, point_type")).data ?? [],
  });

  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, vehicles(vehicle_number), supervisors(name), booking_points(name)")
        .order("departure_date", { ascending: false })
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  /** Seat locks are readable by every point, so the shared seat map stays accurate. */
  const { data: locks } = useQuery({
    queryKey: ["trip_seat_locks", tripId],
    enabled: Boolean(tripId),
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_seat_locks")
        .select("seat_number, booking_id")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });

  /** Only bookings this user is allowed to see (own point, own trips as master point, or staff). */
  const { data: bookings } = useQuery({
    queryKey: ["seat_bookings", tripId],
    enabled: Boolean(tripId),
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seat_bookings")
        .select("*, booking_points(name)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const trip = trips?.find((tr) => tr.id === tripId);

  useEffect(() => {
    setTotalAmount("");
  }, [trip?.id]);

  const visibleByBooking = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings ?? []) map.set(b.id, b.booking_points?.name ?? "—");
    return map;
  }, [bookings]);

  const bookedMap = useMemo(() => {
    const map = new Map<string, { point: string; id: string }>();
    for (const l of locks ?? []) {
      map.set(l.seat_number, {
        point: visibleByBooking.get(l.booking_id) ?? t("otherPoint"),
        id: l.booking_id,
      });
    }
    return map;
  }, [locks, visibleByBooking, t]);

  const seatRows = useMemo(() => buildSeatRows(trip?.total_seats ?? 44), [trip?.total_seats]);
  const myTotal = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
  const myPointId = isStaff ? staffPointId : (session?.bookingPointId ?? "");
  const amount = Number(totalAmount) || 0;

  /** Live updates: any booking/seat-lock change on this trip refreshes instantly. */
  useEffect(() => {
    const channel = supabase
      .channel("seat-booking-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "seat_bookings" }, () => {
        void qc.invalidateQueries({ queryKey: ["seat_bookings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_seat_locks" }, () => {
        void qc.invalidateQueries({ queryKey: ["trip_seat_locks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        void qc.invalidateQueries({ queryKey: ["trips"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  function bookingError(message: string) {
    if (message.includes("SEAT_TAKEN")) return t("seatTaken");
    if (message.includes("TRIP_FULL")) return t("tripFull");
    if (message.includes("INVALID_SEAT") || message.includes("DUPLICATE_SEATS"))
      return t("invalidSeat");
    return message;
  }

  const book = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error(t("selectTrip"));
      if (seats.length === 0) throw new Error(t("selectSeats"));
      if (!myPointId) throw new Error(t("noBookingPointLinked"));
      if (amount <= 0) throw new Error(t("totalFare"));
      // Re-check the shared seat map right before insert so stale UI can't double-book.
      const { data: fresh, error: freshError } = await supabase
        .from("trip_seat_locks")
        .select("seat_number")
        .eq("trip_id", tripId);
      if (freshError) throw freshError;
      const taken = new Set((fresh ?? []).map((l) => l.seat_number));
      const clash = seats.filter((s) => taken.has(s));
      if (clash.length > 0) {
        void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
        setSeats((prev) => prev.filter((s) => !taken.has(s)));
        throw new Error(`${t("seatTaken")}: ${clash.join(", ")}`);
      }
      const capacity = trip?.total_seats ?? 44;
      if ((fresh?.length ?? 0) + seats.length > capacity) throw new Error(t("tripFull"));

      const { data, error } = await supabase
        .from("seat_bookings")
        .insert({
          trip_id: tripId,
          booking_point_id: myPointId,
          seat_numbers: seats,
          fare_per_seat: seats.length > 0 ? amount / seats.length : 0,
          amount,
          passenger_name: passengerName.trim() || null,
          passenger_phone: passengerPhone.trim() || null,
          status: "confirmed",
          created_by: session?.userId ?? null,
        })
        .select("*, booking_points(name)")
        .single();
      if (error) throw new Error(bookingError(error.message));
      return data;
    },
    onSuccess: (row) => {
      toast.success(t("bookingConfirmed"));
      setTicket({
        ticketNo: row.ticket_no ?? "—",
        pointName: row.booking_points?.name ?? "—",
        route: trip?.route ?? "—",
        date: trip?.departure_date ?? "—",
        time: trip?.departure_time?.slice(0, 5) ?? "—",
        vehicle: trip?.vehicles?.vehicle_number ?? "—",
        seats: row.seat_numbers ?? [],
        passengerName: row.passenger_name ?? "",
        passengerPhone: row.passenger_phone ?? "",
        farePerSeat: Number(row.fare_per_seat ?? 0),
        amount: Number(row.amount ?? 0),
      });
      setSeats([]);
      setPassengerName("");
      setPassengerPhone("");
      setTotalAmount("");
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Moderator/point cancel: keeps the row, releases the seats and logs the change. */
  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seat_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: session?.userId ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("seatsReleased"));
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seat_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  function toggleSeat(seat: string) {
    if (bookedMap.has(seat)) return;
    setSeats((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("seatBooking")}</h1>

      {(isMasterPoint || isStaff) && (
        <TripForm vehicles={vehicles ?? []} supervisors={supervisors ?? []} points={points ?? []} />
      )}

      <div className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sb-trip">{t("trip")}</Label>
            <select
              id="sb-trip"
              className={selectClass}
              value={tripId}
              onChange={(e) => {
                setTripId(e.target.value);
                setSeats([]);
              }}
            >
              <option value="">{t("selectTrip")}</option>
              {trips?.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.departure_date} {tr.departure_time?.slice(0, 5)} ·{" "}
                  {tr.vehicles?.vehicle_number ?? "—"} · {tr.booking_points?.name ?? "—"}
                </option>
              ))}
            </select>
            {(trips?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground">{t("noTrips")}</p>
            )}
          </div>
          {isStaff && (
            <div className="space-y-1.5">
              <Label htmlFor="sb-point">{t("bookingPoint")}</Label>
              <select
                id="sb-point"
                className={selectClass}
                value={staffPointId}
                onChange={(e) => setStaffPointId(e.target.value)}
              >
                <option value="">{t("select")}</option>
                {points?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {trip && (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p>
                {t("vehicleNumber")}: <strong>{trip.vehicles?.vehicle_number ?? "—"}</strong>
              </p>
              <p>
                {t("supervisorName")}: <strong>{trip.supervisors?.name ?? "—"}</strong>
              </p>
              <p>
                {t("fare")}: <strong>৳{trip.fare}</strong>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold text-destructive">{bookedMap.size}</p>
                <p className="text-xs text-muted-foreground">{t("bookedSeats")}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold">
                  {Math.max(0, (trip.total_seats ?? 44) - bookedMap.size)}
                </p>
                <p className="text-xs text-muted-foreground">{t("remainingSeats")}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold">৳{myTotal}</p>
                <p className="text-xs text-muted-foreground">{t("totalIncome")}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">{t("seatPlan")}</p>
              <SeatPlan
                rows={seatRows}
                bookedMap={bookedMap}
                selected={seats}
                onToggle={toggleSeat}
              />
            </div>

            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                book.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>{t("seatsSelected")}</Label>
                <Input readOnly value={`${seats.length} — ${seats.join(", ")}`} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-pname">{t("passengerName")}</Label>
                <Input
                  id="sb-pname"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-pphone">{t("passengerPhone")}</Label>
                <Input
                  id="sb-pphone"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-amount">{t("totalFare")}</Label>
                <Input
                  id="sb-amount"
                  type="number"
                  min={0}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="font-bold"
                  required
                />
              </div>
              <Button type="submit" disabled={book.isPending} className="self-end">
                {t("confirmBooking")}
              </Button>
            </form>
          </>
        )}
      </div>

      {trip && (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ticketNo")}</TableHead>
                <TableHead>{t("bookingPoint")}</TableHead>
                <TableHead>{t("seats")}</TableHead>
                <TableHead>{t("passengerName")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bookings?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {bookings?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.ticket_no ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{b.booking_points?.name ?? "—"}</TableCell>
                  <TableCell
                    className={b.status === "cancelled" ? "line-through opacity-60" : "text-destructive"}
                  >
                    {(b.seat_numbers ?? []).join(", ")}
                  </TableCell>
                  <TableCell>{b.passenger_name ?? "—"}</TableCell>
                  <TableCell>৳{b.amount}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("cancelBooking")}
                      disabled={b.status === "cancelled" || cancelBooking.isPending}
                      onClick={() => cancelBooking.mutate(b.id)}
                    >
                      <XCircle className="size-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeBooking.mutate(b.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
          <div className="border-t border-border p-3 text-right text-sm font-semibold">
            {t("totalAmount")}: ৳{myTotal}
          </div>
        </div>
      )}

      <TicketDialog ticket={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

function TripForm({
  vehicles,
  supervisors,
  points,
}: {
  vehicles: { id: string; vehicle_number: string; seat_count: number }[];
  supervisors: { id: string; name: string }[];
  points: { id: string; name: string; point_type: string }[];
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";
  const [form, setForm] = useState({
    vehicle_id: "",
    supervisor_id: "",
    master_point_id: "",
    route: "",
    departure_date: new Date().toISOString().slice(0, 10),
    departure_time: "",
    fare: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const masterPointId = isStaff ? form.master_point_id : (session?.bookingPointId ?? "");
      if (!masterPointId) throw new Error(t("noBookingPointLinked"));
      const seatCount = vehicles.find((v) => v.id === form.vehicle_id)?.seat_count || 44;
      const { error } = await supabase.from("trips").insert({
        vehicle_id: form.vehicle_id || null,
        supervisor_id: form.supervisor_id || null,
        master_point_id: masterPointId,
        route: form.route.trim() || null,
        departure_date: form.departure_date,
        departure_time: form.departure_time,
        total_seats: seatCount,
        fare: Number(form.fare) || 0,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ ...form, departure_time: "", route: "", fare: "" });
      void qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 className="font-display text-lg uppercase tracking-wide sm:col-span-2 lg:col-span-4">
        {t("createTrip")} · {t("masterPoint")}
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="tf-vehicle">{t("vehicleNumber")}</Label>
        <select
          id="tf-vehicle"
          className={selectClass}
          value={form.vehicle_id}
          onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          required
        >
          <option value="">{t("select")}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-supervisor">{t("supervisorName")}</Label>
        <select
          id="tf-supervisor"
          className={selectClass}
          value={form.supervisor_id}
          onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
        >
          <option value="">{t("select")}</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {isStaff && (
        <div className="space-y-1.5">
          <Label htmlFor="tf-point">{t("masterPoint")}</Label>
          <select
            id="tf-point"
            className={selectClass}
            value={form.master_point_id}
            onChange={(e) => setForm({ ...form, master_point_id: e.target.value })}
            required
          >
            <option value="">{t("select")}</option>
            {points
              .filter((p) => p.point_type === "master")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tf-route">{t("route")}</Label>
        <Input
          id="tf-route"
          value={form.route}
          onChange={(e) => setForm({ ...form, route: e.target.value })}
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-date">{t("date")}</Label>
        <Input
          id="tf-date"
          type="date"
          value={form.departure_date}
          onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-time">{t("departureTime")}</Label>
        <Input
          id="tf-time"
          type="time"
          value={form.departure_time}
          onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-fare">{t("fare")}</Label>
        <Input
          id="tf-fare"
          type="number"
          min={0}
          value={form.fare}
          onChange={(e) => setForm({ ...form, fare: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={create.isPending} className="self-end">
        {t("createTrip")}
      </Button>
    </form>
  );
}
