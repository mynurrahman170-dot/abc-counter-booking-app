const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type SeatRow = { letter: string; seats: string[] };

/**
 * Builds a bus-style seat plan: rows of 4 seats (2 + aisle + 2).
 * If the total seat count is odd, the leftover single seat becomes an
 * "extra" seat placed at the very front, above row A (never at the back).
 */
export function buildSeatRows(totalSeats: number): SeatRow[] {
  const total = Math.max(1, Math.min(totalSeats || 44, 104));
  const hasExtra = total % 2 === 1;
  const pairTotal = hasExtra ? total - 1 : total;

  const rows: SeatRow[] = [];
  let placed = 0;
  for (let r = 0; placed < pairTotal && r < ROW_LETTERS.length; r += 1) {
    const letter = ROW_LETTERS[r]!;
    const seats: string[] = [];
    for (let i = 1; i <= 4 && placed < pairTotal; i += 1) {
      seats.push(`${letter}${i}`);
      placed += 1;
    }
    rows.push({ letter, seats });
  }

  if (hasExtra) {
    rows.unshift({ letter: "E", seats: ["E1"] });
  }

  return rows;
}

