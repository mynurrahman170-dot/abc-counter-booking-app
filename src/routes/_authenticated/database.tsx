import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { RequireRole } from "@/components/RequireRole";
import { listStaffAccounts } from "@/lib/accounts.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/database")({
  head: () => ({
    meta: [
      { title: "Database | Chandra Paribahan Booking" },
      {
        name: "description",
        content: "Full database view: staff IDs, vehicles, booking points, routes and supervisors.",
      },
      { property: "og:title", content: "Database | Chandra Paribahan Booking" },
      {
        property: "og:description",
        content: "Complete record of staff logins, buses, booking points, routes and supervisors.",
      },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator"]}>
      <DatabasePage />
    </RequireRole>
  ),
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl uppercase tracking-wide">{title}</h2>
      <div className="panel overflow-x-auto">{children}</div>
    </section>
  );
}

function DatabasePage() {
  const { t } = useI18n();
  const listFn = useServerFn(listStaffAccounts);

  const { data: staff } = useQuery({ queryKey: ["staff-accounts"], queryFn: () => listFn({}) });
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => (await supabase.from("vehicles").select("*").order("vehicle_number")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => (await supabase.from("booking_points").select("*").order("name")).data ?? [],
  });
  const { data: routeList } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => (await supabase.from("routes").select("*").order("name")).data ?? [],
  });
  const { data: supervisors } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => (await supabase.from("supervisors").select("*").order("name")).data ?? [],
  });

  const roleLabel = (role: string | null) =>
    role === "master_admin"
      ? t("masterAdmin")
      : role === "moderator"
        ? t("moderator")
        : role === "booking_point"
          ? t("bookingPoint")
          : "—";

  const empty = (cols: number) => (
    <TableRow>
      <TableCell colSpan={cols} className="text-muted-foreground">
        {t("noData")}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("database")}</h1>

      <Panel title={t("staffAccounts")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("loginId")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("pin")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(staff?.length ?? 0) === 0 && empty(4)}
            {staff?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell>{s.login_id ?? s.email ?? "—"}</TableCell>
                <TableCell>{roleLabel(s.role)}</TableCell>
                <TableCell className="text-muted-foreground">{t("pinHidden")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title={t("vehicles")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("group")}</TableHead>
              <TableHead>{t("vehicleType")}</TableHead>
              <TableHead>{t("seatCount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(vehicles?.length ?? 0) === 0 && empty(4)}
            {vehicles?.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-semibold">{v.vehicle_number}</TableCell>
                <TableCell>{v.vehicle_group ?? "—"}</TableCell>
                <TableCell>{v.vehicle_type ?? "—"}</TableCell>
                <TableCell>{v.seat_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title={t("bookingPoints")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("pointType")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("address")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(points?.length ?? 0) === 0 && empty(5)}
            {points?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell>{p.code}</TableCell>
                <TableCell>
                  {p.point_type === "master" ? t("masterPoint") : t("normalPoint")}
                </TableCell>
                <TableCell>{p.phone ?? "—"}</TableCell>
                <TableCell>{p.address ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title={t("routes")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("routeName")}</TableHead>
              <TableHead>{t("fromPlace")}</TableHead>
              <TableHead>{t("toPlace")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(routeList?.length ?? 0) === 0 && empty(3)}
            {routeList?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell>{r.from_place ?? "—"}</TableCell>
                <TableCell>{r.to_place ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel title={t("supervisors")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("supervisorName")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(supervisors?.length ?? 0) === 0 && empty(3)}
            {supervisors?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell>{s.phone ?? "—"}</TableCell>
                <TableCell>{s.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
