import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { staffEmail, staffPassword, normalizeLoginId, type StaffRole } from "@/lib/staff-credentials";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { RecoveryDialog } from "@/components/RecoveryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In | ZB SYSTEM" },
      {
        name: "description",
        content: "Sign in to ZB SYSTEM as master admin, moderator or booking point.",
      },
      { property: "og:title", content: "Sign In | ZB SYSTEM" },
      {
        property: "og:description",
        content: "Master admin, moderator and booking point login for ZB SYSTEM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground texture-embossed texture-embossed-dark lg:flex">
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/20">
            <Bus className="size-6" />
          </span>
          <span className="font-display text-2xl tracking-wide text-white">{t("appName")}</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-6xl leading-tight text-white">{t("appName")}</h1>
          <p className="mt-2 font-display text-3xl text-sky-300">{t("appSubtitle")}</p>
          <p className="mt-4 max-w-md text-sidebar-foreground/80">{t("tagline")}</p>
        </div>
        <div className="relative text-xs text-sidebar-foreground/60">
          <p>
            {t("designAndDevelopment")}: {t("developerName")}
          </p>
          <p className="mt-1">© {new Date().getFullYear()}</p>
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center px-5 py-10 texture-embossed">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="lg:hidden">
              <p className="font-display text-xl text-foreground">{t("appName")}</p>
              <p className="font-display text-sm text-primary">{t("appSubtitle")}</p>
            </div>
            <LanguageToggle />
          </div>
          <Tabs defaultValue="master">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="master">{t("masterAdmin")}</TabsTrigger>
              <TabsTrigger value="moderator">{t("moderator")}</TabsTrigger>
              <TabsTrigger value="point">{t("bookingPoint")}</TabsTrigger>
            </TabsList>
            <TabsContent value="master">
              <MasterAdminForm />
            </TabsContent>
            <TabsContent value="moderator">
              <StaffForm role="moderator" />
            </TabsContent>
            <TabsContent value="point">
              <StaffForm role="booking_point" />
            </TabsContent>
          </Tabs>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
          <p>
            {t("designAndDevelopment")}: {t("developerName")}
          </p>
          <p className="mt-1">© {new Date().getFullYear()}</p>
        </div>
      </section>
    </main>
  );
}

function MasterAdminForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: name.trim(), role: "master_admin" },
          },
        });
        if (error) throw error;
        toast.success(t("saved"));
        if (data.session) navigate({ to: "/dashboard" });
        else setMode("signin");

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mt-4 space-y-4 p-6">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="ma-name">{t("name")}</Label>
          <Input id="ma-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="ma-email">{t("email")}</Label>
        <Input
          id="ma-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ma-pass">{t("password")}</Label>
        <Input
          id="ma-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {mode === "signup" ? t("createAdmin") : t("login")}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? t("needAccount") : t("haveAccount")}
      </button>
      <RecoveryDialog mode="master" />
    </form>
  );
}


function StaffForm({ role }: { role: StaffRole }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = normalizeLoginId(loginId);
      const { error } = await supabase.auth.signInWithPassword({
        email: staffEmail(role, id),
        password: staffPassword(id, pin),
      });
      if (error) throw new Error(t("nameMismatch"));

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();

      if ((profile?.name ?? "").trim().toLowerCase() !== name.trim().toLowerCase()) {
        await supabase.auth.signOut();
        throw new Error(t("nameMismatch"));
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mt-4 space-y-4 p-6">
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-name`}>{t("name")}</Label>
        <Input
          id={`${role}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-id`}>{t("loginId")}</Label>
        <Input
          id={`${role}-id`}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          required
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${role}-pin`}>{t("pin")}</Label>
        <Input
          id={`${role}-pin`}
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
          maxLength={20}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {t("signIn")}
      </Button>
      <RecoveryDialog mode={role} />
    </form>
  );
}
