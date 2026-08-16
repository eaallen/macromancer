import "./style.css";
import { fetchTopEntries } from "./game/leaderboard.ts";
import { LEVEL_CATALOG } from "./game/levelIds.ts";
import { formatScore } from "./game/score.ts";

const FIELD_BOARD_SIZE = 3;

async function fillFieldBoards(): Promise<void> {
  const items = document.querySelectorAll(".field-list > li");
  await Promise.all(
    LEVEL_CATALOG.map(async (level, index) => {
      const item = items[index];
      if (!(item instanceof HTMLElement)) {
        return;
      }
      try {
        const entries = await fetchTopEntries(level.id, FIELD_BOARD_SIZE);
        if (entries.length === 0) {
          const empty = document.createElement("p");
          empty.className = "field-board-empty";
          empty.textContent = "No scores yet";
          item.append(empty);
          return;
        }
        const board = document.createElement("ol");
        board.className = "field-board";
        for (const [rowIndex, entry] of entries.entries()) {
          const row = document.createElement("li");
          const rank = document.createElement("span");
          rank.className = "r";
          rank.textContent = String(rowIndex + 1);
          const name = document.createElement("span");
          name.className = "n";
          name.textContent = entry.name;
          const score = document.createElement("span");
          score.className = "s";
          score.textContent = formatScore(entry.score);
          row.append(rank, name, score);
          board.append(row);
        }
        item.append(board);
      } catch {
        // Keep the field list usable if scores cannot be loaded.
      }
    }),
  );
}

void fillFieldBoards();
