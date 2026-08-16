export const SCORE_START = 10000;
export const SCORE_PER_SECOND = 40;
export const SCORE_KNIGHT_DEATH = 700;
export const SCORE_UNIQUE_MACRO = 1000;
export const SCORE_MAX = 999_999;
export const INITIALS_LENGTH = 3;

/**
 * Points for beating the giant: a high start that falls with fight time
 * and with each knight death, plus a bonus for each distinct macro used.
 */
export function fightScore(
  elapsedSeconds: number,
  knightDeaths: number,
  uniqueMacros: number,
): number {
  const raw =
    SCORE_START -
    elapsedSeconds * SCORE_PER_SECOND -
    knightDeaths * SCORE_KNIGHT_DEATH +
    uniqueMacros * SCORE_UNIQUE_MACRO;
  return Math.max(0, Math.round(raw));
}

export function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}
