const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type SeatRow = { letter: string; seats: string[] };

/** Builds the bookable seats. The driver position is display-only. */
export function buildSeatRows(totalSeats: number): SeatRow[] {
  const total = Math.max(1, Math.min(totalSeats || 44, 104));
  if (total === 42 || total === 46) {
    const lastLetter = total === 42 ? "J" : "K";
    const regularRows = total === 42 ? 9 : 10;
    const rows = Array.from({ length: regularRows }, (_, index) => {
      const letter = String.fromCharCode(65 + index);
      return {
        letter,
        seats: [1, 2, 3, 4].map(
          (number) => `${letter}${number}`,
        ),
      };
    });
    rows.push({ letter: lastLetter, seats: [1, 2, 3, 4, 5].map((number) => `${lastLetter}${number}`) });
    rows.unshift({ letter: "EX", seats: ["EX-1"] });
    return rows;
  }

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
    // Unique id "EX" so it never clashes with regular row E (E1–E4).
    rows.unshift({ letter: "EX", seats: ["EX"] });
  }

  return rows;
}

