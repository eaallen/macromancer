export const LEVEL_IDS = [
  "training",
  "meadow",
  "hamlet",
  "siege",
  "sprinter",
  "tank",
  "watchman",
  "cleaver",
  "ember",
  "colossus",
  "twins",
] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export const LEVEL_CATALOG: readonly { id: LevelId; href: string; title: string }[] = [
  { id: "training", href: "index.html", title: "Training Ground" },
  { id: "meadow", href: "meadow.html", title: "Open Meadow" },
  { id: "hamlet", href: "hamlet.html", title: "The Hamlet" },
  { id: "siege", href: "siege.html", title: "The Siege" },
  { id: "sprinter", href: "sprinter.html", title: "The Sprinter" },
  { id: "tank", href: "tank.html", title: "The Tank" },
  { id: "watchman", href: "watchman.html", title: "The Watchman" },
  { id: "cleaver", href: "cleaver.html", title: "The Cleaver" },
  { id: "ember", href: "ember.html", title: "Ember" },
  { id: "colossus", href: "colossus.html", title: "The Colossus" },
  { id: "twins", href: "twins.html", title: "The Twins" },
];

export function isLevelId(value: string): value is LevelId {
  return (LEVEL_IDS as readonly string[]).includes(value);
}

export function levelIdFromPath(pathname: string): LevelId {
  const last = pathname.split("/").filter(Boolean).pop() ?? "index.html";
  const slug = last.replace(/\.html$/, "");
  const id = slug === "" || slug === "index" ? "training" : slug;
  if (!isLevelId(id)) {
    throw new Error(`Unknown field "${id}".`);
  }
  return id;
}
