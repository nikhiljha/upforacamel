import _ from "lodash";
import {
  getInitialGameState,
  makeNewPlayer,
  startGame,
  reduceEvent,
  updateDisplayName,
} from "./reducer.js";
import { makeBotMove } from "./bot.js";

const NUM_GAMES = 20;

function runGame(difficulties) {
  const gs = getInitialGameState();
  const players = {};
  for (const diff of difficulties) {
    const p = makeNewPlayer(gs);
    updateDisplayName(gs, p, `Bot-${diff}`);
    players[p] = diff;
  }
  startGame(gs);

  let turnCount = 0;
  const MAX_TURNS = 300;
  const actionCounts = {};
  for (const diff of difficulties) {
    actionCounts[diff] = { rollDice: 0, makeLegBet: 0, makeRaceBet: 0, placeDesertTile: 0 };
  }

  while (gs.status === "inprogress" && turnCount < MAX_TURNS) {
    const cp = gs.currentPlayer;
    const diff = players[cp];
    const event = makeBotMove(gs, cp, diff);
    if (!event) break;
    if (actionCounts[diff][event.type] !== undefined) {
      actionCounts[diff][event.type]++;
    }
    try {
      reduceEvent(gs, event);
    } catch (e) {
      break;
    }
    turnCount++;
  }

  const scores = {};
  if (gs.status === "ended" && gs.finalScore) {
    for (const [p, score] of Object.entries(gs.finalScore)) {
      scores[players[p]] = (scores[players[p]] || 0) + score;
    }
  }

  return { scores, actionCounts, turns: turnCount, legs: gs.currentLegNum + 1, ended: gs.status === "ended" };
}

// Run mixed-difficulty games
const totals = { easy: 0, medium: 0, hard: 0, easyWins: 0, mediumWins: 0, hardWins: 0, gamesEnded: 0 };
const actionTotals = {
  easy: { rollDice: 0, makeLegBet: 0, makeRaceBet: 0, placeDesertTile: 0 },
  medium: { rollDice: 0, makeLegBet: 0, makeRaceBet: 0, placeDesertTile: 0 },
  hard: { rollDice: 0, makeLegBet: 0, makeRaceBet: 0, placeDesertTile: 0 },
};

for (let i = 0; i < NUM_GAMES; i++) {
  const result = runGame(["easy", "medium", "hard"]);
  if (result.ended) {
    totals.gamesEnded++;
    totals.easy += result.scores.easy || 0;
    totals.medium += result.scores.medium || 0;
    totals.hard += result.scores.hard || 0;
    const best = Object.entries(result.scores).sort((a, b) => b[1] - a[1])[0];
    if (best) totals[best[0] + "Wins"]++;
  }
  for (const diff of ["easy", "medium", "hard"]) {
    for (const action of Object.keys(actionTotals[diff])) {
      actionTotals[diff][action] += result.actionCounts[diff][action] || 0;
    }
  }
}

console.log(`\n=== ${NUM_GAMES} Games: Easy vs Medium vs Hard ===`);
console.log(`Games completed: ${totals.gamesEnded}/${NUM_GAMES}`);
console.log(`\nAvg scores:  Easy=${(totals.easy/totals.gamesEnded).toFixed(1)}  Medium=${(totals.medium/totals.gamesEnded).toFixed(1)}  Hard=${(totals.hard/totals.gamesEnded).toFixed(1)}`);
console.log(`Win counts:  Easy=${totals.easyWins}  Medium=${totals.mediumWins}  Hard=${totals.hardWins}`);
console.log(`\nAction distribution (totals across all games):`);
for (const diff of ["easy", "medium", "hard"]) {
  const a = actionTotals[diff];
  const total = a.rollDice + a.makeLegBet + a.makeRaceBet + a.placeDesertTile;
  console.log(`  ${diff}: roll=${a.rollDice}(${(100*a.rollDice/total).toFixed(0)}%) legBet=${a.makeLegBet}(${(100*a.makeLegBet/total).toFixed(0)}%) raceBet=${a.makeRaceBet}(${(100*a.makeRaceBet/total).toFixed(0)}%) tile=${a.placeDesertTile}(${(100*a.placeDesertTile/total).toFixed(0)}%)`);
}
