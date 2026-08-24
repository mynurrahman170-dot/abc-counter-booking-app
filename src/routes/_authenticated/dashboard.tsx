import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bus, CalendarClock, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Car Booking Database" },
      { name: "description", content: "Overview of vehicles, booking points and schedules." },
      { property: "og:title", content: "Dashboard | Car Booking Database" },
      { property: "og:description", content: "Overview of vehicles, booking points and schedules." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { data: session } = useAuth();

  const { data } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => {
      const [v, b, s] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("booking_points").select("id", { count: "exact", head: true }),
        supabase.from("schedules").select("id", { count: "exact", head: true }),
      ]);
      return { vehicles: v.count ?? 0, points: b.count ?? 0, schedules: s.count ?? 0 };
    },
  });

  const roleLabel =
    session?.role === "master_admin"
      ? t("masterAdmin")
      : session?.role === "moderator"
        ? t("moderator")
        : session?.role === "booking_point"
          ? t("bookingPoint")
          : "";

  const cards = [
    { label: t("totalVehicles"), value: data?.vehicles ?? 0, icon: Bus },
    { label: t("totalPoints"), value: data?.points ?? 0, icon: MapPin },
    { label: t("totalSchedules"), value: data?.schedules ?? 0, icon: CalendarClock },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide">{t("dashboard")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session?.name} {roleLabel ? `• ${roleLabel}` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <c.icon className="size-5 text-primary" />
            <p className="mt-3 font-display text-4xl">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
