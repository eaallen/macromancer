import { formatScore } from "./score.ts";
import {
  isValidInitials,
  loadBoard,
  normalizeInitials,
  rankOrdinal,
  readSavedInitials,
  submitHighScore,
  type BoardSnapshot,
  type ScoreEntry,
} from "./leaderboard.ts";
import { levelIdFromPath } from "./levelIds.ts";

type ScoreboardUi = {
  root: HTMLElement;
  rank: HTMLElement;
  place: HTMLElement;
  status: HTMLElement;
  board: HTMLOListElement;
  form: HTMLFormElement;
  initials: HTMLInputElement;
  submit: HTMLButtonElement;
  note: HTMLElement;
};

let ui: ScoreboardUi | null = null;
let loadGen = 0;
let currentScore = 0;
let posted = false;

export function showWinScoreboard(score: number): void {
  const view = ensureUi();
  currentScore = score;
  posted = false;
  view.root.classList.remove("hidden");
  view.rank.textContent = "Rank …";
  view.place.textContent = "";
  view.status.textContent = "Reading the board…";
  view.board.replaceChildren();
  view.note.textContent = "";
  view.form.classList.remove("hidden");
  view.submit.disabled = true;
  view.submit.textContent = "Submit score";
  const saved = readSavedInitials();
  view.initials.value = saved;
  const gen = ++loadGen;
  void loadBoard(levelIdFromPath(location.pathname), score)
    .then((snap) => {
      if (gen !== loadGen) {
        return;
      }
      renderBoard(view, snap);
      if (!view.form.classList.contains("hidden")) {
        view.initials.focus();
        view.initials.select();
      }
    })
    .catch(() => {
      if (gen !== loadGen) {
        return;
      }
      view.rank.textContent = "Rank ?";
      view.status.textContent = "Could not reach the board.";
    });
}

export function hideWinScoreboard(): void {
  loadGen += 1;
  posted = false;
  ui?.root.classList.add("hidden");
}

function ensureUi(): ScoreboardUi {
  if (ui) {
    return ui;
  }
  const winScore = document.querySelector("#win-score");
  if (!winScore) {
    throw new Error("Win overlay markup is missing.");
  }
  const root = document.createElement("div");
  root.id = "scoreboard";
  const rank = document.createElement("p");
  rank.className = "rank-line";
  const place = document.createElement("p");
  place.className = "rank-place";
  const status = document.createElement("p");
  status.className = "board-status";
  const board = document.createElement("ol");
  board.className = "board";
  const form = document.createElement("form");
  form.className = "score-submit";
  form.autocomplete = "off";
  const label = document.createElement("label");
  label.className = "initials-label";
  label.htmlFor = "score-initials";
  label.textContent = "Name";
  const initials = document.createElement("input");
  initials.id = "score-initials";
  initials.name = "initials";
  initials.maxLength = 3;
  initials.spellcheck = false;
  initials.autocomplete = "off";
  initials.autocapitalize = "characters";
  initials.placeholder = "AAA";
  initials.setAttribute("aria-label", "Three letter name");
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "cta";
  submit.id = "submit-score";
  submit.textContent = "Submit score";
  const note = document.createElement("p");
  note.className = "submit-note";
  form.append(label, initials, submit);
  root.append(rank, place, status, board, form, note);
  winScore.after(root);

  initials.addEventListener("input", () => {
    initials.value = normalizeInitials(initials.value);
    refreshSubmit(viewOf(root, rank, place, status, board, form, initials, submit, note));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void onSubmit();
  });

  ui = viewOf(root, rank, place, status, board, form, initials, submit, note);
  return ui;
}

function viewOf(
  root: HTMLElement,
  rank: HTMLElement,
  place: HTMLElement,
  status: HTMLElement,
  board: HTMLOListElement,
  form: HTMLFormElement,
  initials: HTMLInputElement,
  submit: HTMLButtonElement,
  note: HTMLElement,
): ScoreboardUi {
  return { root, rank, place, status, board, form, initials, submit, note };
}

function renderBoard(view: ScoreboardUi, snap: BoardSnapshot): void {
  view.rank.textContent = `Rank ${snap.rank}`;
  const among = snap.personalBest ? snap.posted : snap.posted + 1;
  view.place.textContent =
    snap.posted === 0
      ? "First on this field"
      : `${rankOrdinal(snap.rank)} of ${among}`;
  view.status.textContent = snap.entries.length === 0 ? "No scores posted yet." : "High scores";
  view.board.replaceChildren();
  view.board.hidden = snap.entries.length === 0;
  for (const [index, entry] of snap.entries.entries()) {
    view.board.append(boardRow(entry, rankForIndex(snap.entries, index), entry.uid === snap.personalBest?.uid));
  }
  if (snap.personalBest && !isValidInitials(view.initials.value)) {
    view.initials.value = snap.personalBest.name;
  }
  if (posted) {
    view.form.classList.add("hidden");
    view.note.textContent = `Posted as ${view.initials.value}.`;
    view.submit.disabled = true;
    return;
  }
  if (!snap.canSubmit) {
    view.form.classList.add("hidden");
    view.note.textContent = snap.personalBest
      ? `Not a new high. Best ${snap.personalBest.name} ${formatScore(snap.personalBest.score)}.`
      : "";
    return;
  }
  view.form.classList.remove("hidden");
  view.note.textContent = snap.personalBest
    ? `New high. Beats ${snap.personalBest.name} ${formatScore(snap.personalBest.score)}.`
    : "Three letters. Arcade rules.";
  refreshSubmit(view);
}

function boardRow(entry: ScoreEntry, rank: number, mine: boolean): HTMLLIElement {
  const row = document.createElement("li");
  if (mine) {
    row.classList.add("mine");
  }
  const rankEl = document.createElement("span");
  rankEl.className = "r";
  rankEl.textContent = String(rank);
  const nameEl = document.createElement("span");
  nameEl.className = "n";
  nameEl.textContent = entry.name;
  const scoreEl = document.createElement("span");
  scoreEl.className = "s";
  scoreEl.textContent = formatScore(entry.score);
  row.append(rankEl, nameEl, scoreEl);
  return row;
}

function rankForIndex(entries: ScoreEntry[], index: number): number {
  const score = entries[index]?.score;
  const first = entries.findIndex((entry) => entry.score === score);
  return first + 1;
}

function refreshSubmit(view: ScoreboardUi): void {
  view.submit.disabled = posted || !isValidInitials(view.initials.value);
}

async function onSubmit(): Promise<void> {
  const view = ui;
  if (!view || posted) {
    return;
  }
  const name = normalizeInitials(view.initials.value);
  if (!isValidInitials(name)) {
    view.note.textContent = "Enter three letters.";
    return;
  }
  view.submit.disabled = true;
  view.submit.textContent = "Submitting…";
  const gen = loadGen;
  try {
    const snap = await submitHighScore(
      levelIdFromPath(location.pathname),
      currentScore,
      name,
    );
    if (gen !== loadGen) {
      return;
    }
    posted = true;
    view.initials.value = name;
    renderBoard(view, snap);
    view.submit.textContent = "Posted";
  } catch {
    if (gen !== loadGen) {
      return;
    }
    view.submit.textContent = "Submit score";
    view.note.textContent = "Could not post that score.";
    refreshSubmit(view);
  }
}
