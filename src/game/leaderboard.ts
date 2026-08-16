import {
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase.ts";
import { INITIALS_LENGTH, SCORE_MAX } from "./score.ts";
import { type LevelId } from "./levelIds.ts";

export const BOARD_SIZE = 10;
const INITIALS_KEY = "macromancer.initials";

export type ScoreEntry = {
  uid: string;
  name: string;
  score: number;
};

export type BoardSnapshot = {
  rank: number;
  posted: number;
  entries: ScoreEntry[];
  personalBest: ScoreEntry | null;
  canSubmit: boolean;
};

let playerUid: Promise<string> | null = null;

export function ensurePlayer(): Promise<string> {
  playerUid ??= (async () => {
    try {
      const restored = await waitForAuthUser();
      if (restored) {
        return restored;
      }
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    } catch (error) {
      playerUid = null;
      throw error;
    }
  })();
  return playerUid;
}

export function normalizeInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, INITIALS_LENGTH);
}

export function isValidInitials(name: string): boolean {
  return name.length === INITIALS_LENGTH && /^[A-Z]+$/.test(name);
}

export function readSavedInitials(): string {
  try {
    return normalizeInitials(localStorage.getItem(INITIALS_KEY) ?? "");
  } catch {
    return "";
  }
}

export function saveInitials(name: string): void {
  if (!isValidInitials(name)) {
    return;
  }
  try {
    localStorage.setItem(INITIALS_KEY, name);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function rankOrdinal(rank: number): string {
  const teen = rank % 100;
  if (teen >= 11 && teen <= 13) {
    return `${rank}th`;
  }
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export async function loadBoard(
  levelId: LevelId,
  score: number,
): Promise<BoardSnapshot> {
  const uid = await ensurePlayer();
  const entriesRef = collection(db, "levelScores", levelId, "entries");
  const [ownSnap, higherSnap, totalSnap, topSnap] = await Promise.all([
    getDoc(doc(entriesRef, uid)),
    getCountFromServer(query(entriesRef, where("score", ">", score))),
    getCountFromServer(query(entriesRef)),
    getDocs(query(entriesRef, orderBy("score", "desc"), limit(BOARD_SIZE))),
  ]);
  const personalBest = ownSnap.exists() ? parseEntry(ownSnap.id, ownSnap.data()) : null;
  return {
    rank: higherSnap.data().count + 1,
    posted: totalSnap.data().count,
    entries: topSnap.docs.flatMap((item) => {
      const entry = parseEntry(item.id, item.data());
      return entry ? [entry] : [];
    }),
    personalBest,
    canSubmit: isValidScore(score) && (personalBest == null || score > personalBest.score),
  };
}

export async function fetchTopEntries(
  levelId: LevelId,
  size: number,
): Promise<ScoreEntry[]> {
  await ensurePlayer();
  const entriesRef = collection(db, "levelScores", levelId, "entries");
  const topSnap = await getDocs(
    query(entriesRef, orderBy("score", "desc"), limit(size)),
  );
  return topSnap.docs.flatMap((item) => {
    const entry = parseEntry(item.id, item.data());
    return entry ? [entry] : [];
  });
}

export async function submitHighScore(
  levelId: LevelId,
  score: number,
  rawName: string,
): Promise<BoardSnapshot> {
  const name = normalizeInitials(rawName);
  if (!isValidInitials(name)) {
    throw new Error("Enter a 3-letter name.");
  }
  if (!isValidScore(score)) {
    throw new Error("That score cannot be posted.");
  }
  const uid = await ensurePlayer();
  const ref = doc(db, "levelScores", levelId, "entries", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const previous = parseEntry(existing.id, existing.data());
    if (!previous || score <= previous.score) {
      throw new Error("This run is not a new high.");
    }
    await updateDoc(ref, {
      name,
      score,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      uid,
      levelId,
      name,
      score,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  saveInitials(name);
  return loadBoard(levelId, score);
}

function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= SCORE_MAX;
}

function parseEntry(uid: string, data: unknown): ScoreEntry | null {
  if (typeof data !== "object" || data == null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.name !== "string" || typeof record.score !== "number") {
    return null;
  }
  const name = normalizeInitials(record.name);
  if (!isValidInitials(name) || !isValidScore(record.score)) {
    return null;
  }
  return { uid, name, score: record.score };
}

function waitForAuthUser(): Promise<string | null> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser.uid);
  }
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        unsub();
        resolve(user?.uid ?? null);
      },
      reject,
    );
  });
}
