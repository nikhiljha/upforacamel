import _ from "lodash";
import {
  getInitialGameState,
  makeNewPlayer,
  startGame,
  reduceEvent,
  updateDisplayName,
} from "./reducer.js";
import { makeBotMove, debugScoreActions } from "./bot.js";

const NUM_GAMES = 3;

function runGame(gameNum, difficulties) {
  const gs = getInitialGameState();
  const players = {};
  for (const diff of difficulties) {
    const p = makeNewPlayer(gs);
    updateDisplayName(gs, p, `Bot-${diff}`);
    players[p] = diff;
  }
  startGame(gs);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`GAME ${gameNum}: ${difficulties.join(" vs ")} | ${Object.keys(players).length} players`);
  console.log(`${"=".repeat(60)}`);

  let turnCount = 0;
  const MAX_TURNS = 200;

  while (gs.status === "inprogress" && turnCount < MAX_TURNS) {
    const cp = gs.currentPlayer;
    const diff = players[cp];
    const legNum = gs.currentLegNum;

    // Log debug info for first few turns per leg
    const legTurns = gs.legs[legNum].rolledDice.length;
    const isEarlyTurn = turnCount < 6 || legTurns === 0;

    let debugInfo = null;
    if (isEarlyTurn) {
      debugInfo = debugScoreActions(gs, cp, diff);
    }

    const event = makeBotMove(gs, cp, diff);
    if (!event) {
      console.log(`  [Turn ${turnCount}] Player ${cp} (${diff}) — no action available, stuck!`);
      break;
    }

    try {
      reduceEvent(gs, event);
    } catch (e) {
      console.log(`  [Turn ${turnCount}] ERROR: ${e.message}`);
      break;
    }

    // Log move
    const moveDesc = formatMove(event);
    if (isEarlyTurn) {
      console.log(`  [L${legNum} T${turnCount}] P${cp}(${diff}): ${moveDesc}  | lead@${debugInfo.leadCamelPos} top=[${debugInfo.top5.map(a => `${a.label}:${a.ev}`).join(", ")}]`);
    }

    // Log leg transitions
    if (gs.currentLegNum > legNum && gs.status === "inprogress") {
      console.log(`  --- Leg ${legNum} ended → Leg ${gs.currentLegNum} ---`);
    }

    turnCount++;
  }

  if (gs.status === "ended") {
    console.log(`\n  GAME OVER after ${turnCount} turns, ${gs.currentLegNum + 1} legs`);
    console.log(`  Final scores:`);
    for (const [p, score] of Object.entries(gs.finalScore)) {
      console.log(`    Player ${p} (${players[p]}): ${score} coins`);
    }
  } else {
    console.log(`  Game did not end in ${MAX_TURNS} turns`);
  }
}

function formatMove(event) {
  switch (event.type) {
    case "rollDice":
      return "rollDice";
    case "makeLegBet":
      return `legBet(${event.data.color})`;
    case "makeRaceBet":
      return `raceBet(${event.data.kind}:${event.data.color})`;
    case "placeDesertTile":
      return `tile(${event.data.desertTileSide}@${event.data.desertTileIndex})`;
    default:
      return event.type;
  }
}

console.log("Running bot simulations...\n");

// Game 1: Easy vs Easy
runGame(1, ["easy", "easy", "easy"]);

// Game 2: Hard vs Hard
runGame(2, ["hard", "hard", "hard"]);

// Game 3: Easy vs Medium vs Hard
runGame(3, ["easy", "medium", "hard"]);

console.log("\n\nDone.");
