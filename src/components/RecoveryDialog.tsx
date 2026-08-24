import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { recoverWithCode } from "@/lib/recovery.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Mode = "master" | "moderator" | "booking_point";

export function RecoveryDialog({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const recover = useServerFn(recoverWithCode);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [newSecret, setNewSecret] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await recover({
        data: {
          code: code.trim(),
          role: mode,
          identifier: identifier.trim(),
          newSecret: newSecret.trim(),
        },
      });
      toast.success(mode === "master" ? t("passwordUpdated") : t("pinReset"));
      setOpen(false);
      setCode("");
      setNewSecret("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(
        msg.includes("INVALID_CODE")
          ? t("invalidRecoveryCode")
          : msg.includes("ACCOUNT_NOT_FOUND")
            ? t("accountNotFound")
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("forgotCredentials")}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("recoverAccess")}</DialogTitle>
          <DialogDescription>{t("recoverCodeHelp")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="rc-id">{mode === "master" ? t("email") : t("loginId")}</Label>
            <Input
              id="rc-id"
              type={mode === "master" ? "email" : "text"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-code">{t("secretCode")}</Label>
            <Input
              id="rc-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-new">{mode === "master" ? t("newPassword") : t("newPin")}</Label>
            <Input
              id="rc-new"
              type="password"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              required
              minLength={4}
              maxLength={72}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {t("recoverNow")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
