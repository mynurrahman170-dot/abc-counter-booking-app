import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | ZB SYSTEM" },
      {
        name: "description",
        content: "Set a new password for your Chandra Paribahan booking system admin account.",
      },
      { property: "og:title", content: "Reset Password | ZB SYSTEM" },
      { property: "og:description", content: "Set a new password for your admin account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("passwordUpdated"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 texture-embossed">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6">
        <h1 className="font-display text-2xl uppercase tracking-wide">{t("updatePassword")}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="rp-pass">{t("newPassword")}</Label>
          <Input
            id="rp-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {t("updatePassword")}
        </Button>
      </form>
    </main>
  );
}
