export type StaffRole = "moderator" | "booking_point";

export function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function staffEmail(role: StaffRole, loginId: string) {
  const id = normalizeLoginId(loginId);
  return `${id}@${role === "moderator" ? "mod" : "bp"}.carbook.local`;
}

/** Deterministic password derived from ID + PIN so short PINs still satisfy auth rules. */
export function staffPassword(loginId: string, pin: string) {
  return `${normalizeLoginId(loginId)}#${pin.trim()}#cbk`;
}
