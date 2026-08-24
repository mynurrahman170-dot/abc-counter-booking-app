import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import {
  createStaffAccount,
  deleteStaffAccount,
  listStaffAccounts,
  resetStaffPin,
} from "@/lib/accounts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts | Car Booking Database" },
      { name: "description", content: "Master admin tools to create moderator and booking point logins." },
      { property: "og:title", content: "Accounts | Car Booking Database" },
      { property: "og:description", content: "Create moderator and booking point login IDs and PINs." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { t } = useI18n();
  const { data: session } = useAuth();

  if (session && session.role !== "master_admin") {
    return <p className="text-muted-foreground">{t("onlyMaster")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("accounts")}</h1>
      <Tabs defaultValue="moderator">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="moderator">{t("createModerator")}</TabsTrigger>
          <TabsTrigger value="point">{t("createBookingPointAccount")}</TabsTrigger>
        </TabsList>
        <TabsContent value="moderator">
          <StaffCreateForm role="moderator" />
        </TabsContent>
        <TabsContent value="point">
          <StaffCreateForm role="booking_point" />
        </TabsContent>
      </Tabs>
      <AccountsTable />
      <RecoveryRequests />
    </div>
  );
}

function StaffCreateForm({ role }: { role: "moderator" | "booking_point" }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const createFn = useServerFn(createStaffAccount);
  const [form, setForm] = useState({ name: "", loginId: "", pin: "", bookingPointId: "" });

  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => (await supabase.from("booking_points").select("id, name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          role,
          name: form.name,
          loginId: form.loginId,
          pin: form.pin,
          bookingPointId: role === "booking_point" ? form.bookingPointId || null : null,
        },
      }),
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ name: "", loginId: "", pin: "", bookingPointId: "" });
      void qc.invalidateQueries({ queryKey: ["staff-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="panel mt-4 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-c-name`}>{t("name")}</Label>
        <Input
          id={`${role}-c-name`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          minLength={2}
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-c-id`}>{t("loginId")}</Label>
        <Input
          id={`${role}-c-id`}
          value={form.loginId}
          onChange={(e) => setForm({ ...form, loginId: e.target.value })}
          required
          minLength={3}
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-c-pin`}>{t("pin")}</Label>
        <Input
          id={`${role}-c-pin`}
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
          required
          minLength={4}
          maxLength={20}
        />
      </div>
      {role === "booking_point" && (
        <div className="space-y-1.5">
          <Label htmlFor="c-point">{t("bookingPoint")}</Label>
          <select
            id="c-point"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={form.bookingPointId}
            onChange={(e) => setForm({ ...form, bookingPointId: e.target.value })}
            required
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
      <Button type="submit" disabled={create.isPending} className="sm:col-span-2 lg:col-span-1">
        {t("add")}
      </Button>
    </form>
  );
}

function AccountsTable() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listStaffAccounts);
  const deleteFn = useServerFn(deleteStaffAccount);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: () => listFn({}),
  });

  const resetFn = useServerFn(resetStaffPin);
  const [pins, setPins] = useState<Record<string, string>>({});

  const resetPin = useMutation({
    mutationFn: ({ userId, pin }: { userId: string; pin: string }) =>
      resetFn({ data: { userId, pin } }),
    onSuccess: (_d, v) => {
      toast.success(t("pinReset"));
      setPins((p) => ({ ...p, [v.userId]: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["staff-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleLabel = (role: string | null) =>
    role === "master_admin"
      ? t("masterAdmin")
      : role === "moderator"
        ? t("moderator")
        : role === "booking_point"
          ? t("bookingPoint")
          : "—";

  return (
    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("loginId")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{t("resetPin")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5}>{t("loading")}</TableCell>
            </TableRow>
          )}
          {!isLoading && (rows?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                {t("noData")}
              </TableCell>
            </TableRow>
          )}
          {rows?.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.name}</TableCell>
              <TableCell>{r.login_id ?? r.email ?? "—"}</TableCell>
              <TableCell>{roleLabel(r.role)}</TableCell>
              <TableCell>
                {r.login_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-28"
                      placeholder={t("newPin")}
                      value={pins[r.id] ?? ""}
                      onChange={(e) => setPins((p) => ({ ...p, [r.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={(pins[r.id] ?? "").trim().length < 4 || resetPin.isPending}
                      onClick={() => resetPin.mutate({ userId: r.id, pin: pins[r.id] ?? "" })}
                    >
                      {t("resetPin")}
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecoveryRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: rows } = useQuery({
    queryKey: ["credential-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credential_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credential_requests")
        .update({ status: "handled", handled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void qc.invalidateQueries({ queryKey: ["credential-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl uppercase tracking-wide">{t("recoveryRequests")}</h2>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("loginId")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("message")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell>{r.login_id ?? "—"}</TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{r.message ?? "—"}</TableCell>
                <TableCell>{r.status === "handled" ? t("handled") : t("open")}</TableCell>
                <TableCell className="text-right">
                  {r.status !== "handled" && (
                    <Button size="sm" variant="secondary" onClick={() => handle.mutate(r.id)}>
                      {t("markHandled")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
