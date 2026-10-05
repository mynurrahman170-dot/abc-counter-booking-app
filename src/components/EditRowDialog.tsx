import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type EditField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "select" | "color";
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
};

type Row = Record<string, unknown> & { id: string };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

/** Generic edit dialog: patches one row of a table and refreshes the given query key. */
export function EditRowDialog({
  table,
  row,
  fields,
  queryKey,
  onClose,
}: {
  table: string;
  row: Row | null;
  fields: EditField[];
  queryKey: unknown[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!row) return;
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = row[f.key];
      next[f.key] = v === null || v === undefined ? "" : String(v);
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row) return;
      const patch: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = values[f.key] ?? "";
        if (f.type === "number") patch[f.key] = Number(raw) || 0;
        else patch[f.key] = raw.trim() === "" ? null : raw.trim();
      }
      const { error } = await supabase.from(table as never).update(patch as never).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void qc.invalidateQueries({ queryKey });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("edit")}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`edit-${f.key}`}>{f.label}</Label>
              {f.type === "select" ? (
                <select
                  id={`edit-${f.key}`}
                  className={selectClass}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                f.type === "color" ? (
                <input
                  id={`edit-${f.key}`}
                  type="color"
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
                  value={values[f.key] || "#888888"}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
                ) : (
                <Input
                  id={`edit-${f.key}`}
                  type={f.type ?? "text"}
                  required={f.required}
                  maxLength={f.maxLength}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
                )
              )}
            </div>
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
