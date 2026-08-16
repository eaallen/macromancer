import "./style.css";

const GITHUB_URL = "https://github.com/eaallen/macromancer";
const GOLD = "#e8c872";
const CREAM = "#f4ead2";
const MUTED = "rgba(244, 234, 210, 0.35)";

const TIMELINE = [
  { label: "11:30", value: 1 },
  { label: "11:45", value: 1 },
  { label: "12:00", value: 4 },
  { label: "12:15", value: 6 },
  { label: "12:30", value: 7 },
  { label: "12:45", value: 2 },
  { label: "1:00", value: 5 },
  { label: "1:15", value: 3 },
  { label: "1:30", value: 6 },
  { label: "1:45", value: 5 },
  { label: "2:00", value: 4 },
  { label: "2:15", value: 3 },
  { label: "2:30", value: 4 },
] as const;

const THEMES = [
  { label: "Macro / mancer loop", value: 10 },
  { label: "Combat and collision", value: 9 },
  { label: "Levels and giants", value: 7 },
  { label: "World and presentation", value: 6 },
  { label: "Camera and controls", value: 4 },
  { label: "Scoring and leaderboard", value: 4 },
  { label: "Mobile play", value: 3 },
  { label: "Shipping", value: 3 },
  { label: "Console bugs", value: 2 },
  { label: "First brief", value: 1 },
  { label: "Process", value: 2 },
] as const;

const TOOLS = [
  { label: "Read", value: 732 },
  { label: "StrReplace", value: 504 },
  { label: "Grep", value: 206 },
  { label: "Glob", value: 86 },
  { label: "Shell", value: 85 },
  { label: "Write", value: 42 },
  { label: "Other", value: 101 },
] as const;

const STACK = [
  { name: "Vite 7", role: "Dev server and production build" },
  { name: "TypeScript 5.9", role: "The game engine source" },
  { name: "Babylon.js 8", role: "WebGL scene, cameras, combat" },
  { name: "KayKit (CC0)", role: "Knight, ogre, forest, village" },
  { name: "Firebase Hosting", role: "macromancer.web.app" },
  { name: "Cloud Firestore", role: "Per-field high scores" },
  { name: "Anonymous Auth", role: "Leaderboard identities" },
  { name: "Cursor agents", role: "Wrote nearly all of the code" },
] as const;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function verticalBars(
  title: string,
  caption: string,
  rows: readonly { label: string; value: number }[],
  yLabel: string,
): HTMLElement {
  const wrap = el("figure", "how-chart");
  wrap.append(el("figcaption", "how-chart-title", title));
  const max = Math.max(...rows.map((row) => row.value));
  const width = 720;
  const height = 220;
  const left = 36;
  const right = 12;
  const top = 12;
  const bottom = 36;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const gap = 6;
  const barW = (plotW - gap * (rows.length - 1)) / rows.length;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": title,
  });
  for (let tick = 0; tick <= max; tick += 2) {
    const y = top + plotH - (tick / max) * plotH;
    svg.append(
      svgEl("line", {
        x1: left,
        x2: width - right,
        y1: y,
        y2: y,
        stroke: MUTED,
        "stroke-width": 1,
      }),
    );
    const label = svgEl("text", {
      x: left - 8,
      y: y + 4,
      fill: CREAM,
      "font-size": 11,
      "text-anchor": "end",
      opacity: 0.7,
    });
    label.textContent = String(tick);
    svg.append(label);
  }
  rows.forEach((row, index) => {
    const x = left + index * (barW + gap);
    const h = (row.value / max) * plotH;
    const y = top + plotH - h;
    svg.append(
      svgEl("rect", {
        x,
        y,
        width: barW,
        height: Math.max(h, 1),
        fill: GOLD,
      }),
    );
    const axis = svgEl("text", {
      x: x + barW / 2,
      y: height - 12,
      fill: CREAM,
      "font-size": 10,
      "text-anchor": "middle",
      opacity: 0.8,
    });
    axis.textContent = row.label;
    svg.append(axis);
  });
  wrap.append(svg);
  wrap.append(el("p", "how-chart-caption", `${caption}  Y axis: ${yLabel}.`));
  return wrap;
}

function horizontalBars(
  title: string,
  caption: string,
  rows: readonly { label: string; value: number }[],
  xLabel: string,
): HTMLElement {
  const wrap = el("figure", "how-chart");
  wrap.append(el("figcaption", "how-chart-title", title));
  const max = Math.max(...rows.map((row) => row.value));
  const width = 720;
  const rowH = 28;
  const left = 210;
  const right = 56;
  const top = 8;
  const height = top + rows.length * rowH + 8;
  const plotW = width - left - right;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": title,
  });
  rows.forEach((row, index) => {
    const y = top + index * rowH;
    const name = svgEl("text", {
      x: left - 12,
      y: y + 16,
      fill: CREAM,
      "font-size": 13,
      "text-anchor": "end",
    });
    name.textContent = row.label;
    svg.append(name);
    svg.append(
      svgEl("rect", {
        x: left,
        y: y + 4,
        width: Math.max((row.value / max) * plotW, 2),
        height: 16,
        fill: GOLD,
      }),
    );
    const n = svgEl("text", {
      x: left + (row.value / max) * plotW + 8,
      y: y + 16,
      fill: GOLD,
      "font-size": 12,
    });
    n.textContent = formatCount(row.value);
    svg.append(n);
  });
  wrap.append(svg);
  wrap.append(el("p", "how-chart-caption", `${caption}  X axis: ${xLabel}.`));
  return wrap;
}

function tokenSplit(): HTMLElement {
  const wrap = el("figure", "how-chart");
  wrap.append(el("figcaption", "how-chart-title", "Estimated tokens processed by the models"));
  const input = 3_085_560;
  const output = 150_599;
  const total = input + output;
  const width = 720;
  const height = 72;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Input versus output tokens",
  });
  const inW = (input / total) * width;
  svg.append(svgEl("rect", { x: 0, y: 18, width: inW, height: 28, fill: GOLD }));
  svg.append(
    svgEl("rect", {
      x: inW,
      y: 18,
      width: width - inW,
      height: 28,
      fill: "#d4543a",
    }),
  );
  const inLabel = svgEl("text", {
    x: 12,
    y: 38,
    fill: "#1b1424",
    "font-size": 13,
    "font-weight": 700,
  });
  inLabel.textContent = `Input ${formatCount(input)}`;
  svg.append(inLabel);
  const outLabel = svgEl("text", {
    x: width - 12,
    y: 38,
    fill: CREAM,
    "font-size": 13,
    "font-weight": 700,
    "text-anchor": "end",
  });
  outLabel.textContent = `Output ${formatCount(output)}`;
  svg.append(outLabel);
  wrap.append(svg);
  wrap.append(
    el(
      "p",
      "how-chart-caption",
      "Source: Cursor agent transcripts, Aug 15–16 2026. Each assistant turn is counted against the growing conversation (chars ÷ 4). This is an estimate, not an official Cursor invoice.",
    ),
  );
  return wrap;
}

const root = document.querySelector("#how-root");
if (!root) {
  throw new Error("How page is missing #how-root.");
}

const panel = el("div", "panel");
panel.append(el("p", "eyebrow", "Macromancer · making of"));
panel.append(el("h1", undefined, "How this was made"));
const lead = el(
  "p",
  undefined,
  "One sitting. Saturday 11:32 PM to Sunday 2:37 AM, Mountain Time, August 15–16 2026. Elijah Allen directed; Cursor agents wrote the code.",
);
panel.append(lead);

const stats = el("div", "how-stats");
const statItems: Array<[string, string]> = [
  ["3.1", "Hours"],
  ["51", "Prompts"],
  ["3.2M", "Est. tokens"],
  ["23", "Agent chats"],
  ["1,756", "Tool calls"],
  ["5,550", "Lines of src"],
];
for (const [value, label] of statItems) {
  const item = el("div", "how-stat");
  item.append(el("strong", undefined, value));
  item.append(el("span", undefined, label));
  stats.append(item);
}
panel.append(stats);

panel.append(
  el(
    "p",
    "how-note",
    "Counts exclude this making-of page. Duplicate copies of the opening brief were collapsed. Tokens are estimated from transcript size, including conversation context sent on every turn.",
  ),
);

panel.append(
  verticalBars(
    "Player prompts by 15 minutes",
    "Source: unique Cursor user_query messages · 11:32 PM–2:37 AM MDT.",
    TIMELINE,
    "prompts",
  ),
);

panel.append(
  horizontalBars(
    "What those prompts were about",
    "Source: 51 unique player prompts, grouped by topic.",
    THEMES,
    "prompts",
  ),
);

panel.append(tokenSplit());

panel.append(
  horizontalBars(
    "What the agents did",
    "Source: tool_use events in parent Cursor chats that built the game.",
    TOOLS,
    "calls",
  ),
);

panel.append(el("h2", undefined, "Tech stack"));
const stack = el("ul", "how-stack");
for (const item of STACK) {
  const li = el("li");
  li.append(el("strong", undefined, item.name));
  li.append(document.createTextNode(` — ${item.role}`));
  stack.append(li);
}
panel.append(stack);

panel.append(el("h2", undefined, "The night"));
const night = el("ol", "how-night");
const beats: Array<[string, string]> = [
  ["11:32 PM", "Opening brief: Vite, Babylon.js, KayKit, Firebase, macros vs mancer, one giant to teach the loop."],
  ["12:04 AM", "Collision, auto-attack, camera orbit, start overlay, giant chase. The village gets spread around the field."],
  ["12:42 AM", "Mancer-first play. Click the ground to start a knight. Macros keep fighting while you record another."],
  ["1:18 AM", "A hundred knights, then ten, then a pool that recording spends. Giants cannot walk through houses."],
  ["1:31 AM", "The engine becomes eleven JSON fields. Scoring, unique-macro bonus, Firestore leaderboards."],
  ["2:17 AM", "Touch stick, attack / jump / sprint. Then ship: macromancer.web.app and GitHub."],
];
for (const [when, what] of beats) {
  const li = el("li");
  li.append(el("strong", undefined, when));
  li.append(document.createTextNode(` — ${what}`));
  night.append(li);
}
panel.append(night);

panel.append(el("h2", undefined, "Credits"));
const credits = el("p");
credits.append(
  document.createTextNode(
    "Characters, trees, rocks, and buildings are KayKit by Kay Lousberg (CC0). Play the game at ",
  ),
);
const play = el("a") as HTMLAnchorElement;
play.href = "fields.html";
play.textContent = "the fields";
credits.append(play);
credits.append(document.createTextNode(". Source is public on "));
const gh = el("a") as HTMLAnchorElement;
gh.href = GITHUB_URL;
gh.textContent = "GitHub";
credits.append(gh);
credits.append(document.createTextNode("."));
panel.append(credits);

const nav = el("p", "level-nav");
const back = el("a") as HTMLAnchorElement;
back.href = "fields.html";
back.textContent = "All fields";
nav.append(back);
panel.append(nav);

root.append(panel);
