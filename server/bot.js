import _ from "lodash";
import {
  colorCamels,
  bwCamels,
  isColorCamel,
  getCamelPositionAndStack,
  pickBlackOrWhiteCamel,
  moveCamel,
  cloneTrack,
} from "./camel-movement.js";

const LEG_SIMULATIONS = 500;
const RACE_SIMULATIONS = 200;
const TILE_SIMULATIONS = 80;

const FULL_DICE = ["red", "green", "blue", "purple", "yellow", "bw"];

const DIFFICULTY_WEIGHTS = {
  easy: 0.2,
  medium: 0.6,
  hard: 0.95,
};

// ─── Core simulation step ───────────────────────────────────────────────────
// Rolls one die and moves the corresponding camel on the given track.
// Returns { finished, landedOn } where finished is true if a camel crossed
// space 16, and landedOn is the position the camel landed on (for tile tracking).

function simRollAndMove(simTrack, dice) {
  let rolledColor = _.sample(dice);
  const newDice = dice.filter((d) => d !== rolledColor);

  if (rolledColor === "bw") {
    rolledColor = _.sample(bwCamels);
  }
  const rolledNumber = _.sample([1, 2, 3]);

  const camelColor = bwCamels.includes(rolledColor)
    ? pickBlackOrWhiteCamel(simTrack, rolledColor)
    : rolledColor;

  const [pos] = getCamelPositionAndStack(simTrack, camelColor);
  if (pos < 0) return { dice: newDice, finished: false, landedOn: -1 };

  const movement = isColorCamel(camelColor) ? rolledNumber : -rolledNumber;
  let newPos = pos + movement;

  if (newPos > 15) {
    moveCamel(simTrack, camelColor, pos, null, false);
    return { dice: newDice, finished: true, landedOn: -1 };
  }
  if (newPos < 0) newPos = 0;

  let placeUnder = false;
  if (simTrack[newPos] && simTrack[newPos].tiles.length > 0) {
    if (simTrack[newPos].tiles[0] === "+") {
      newPos += isColorCamel(camelColor) ? 1 : -1;
    } else {
      newPos += isColorCamel(camelColor) ? -1 : 1;
      placeUnder = true;
    }
  }
  if (newPos > 15 || newPos < 0) {
    moveCamel(simTrack, camelColor, pos, null, false);
    return { dice: newDice, finished: true, landedOn: -1 };
  }

  moveCamel(simTrack, camelColor, pos, newPos, placeUnder);
  return { dice: newDice, finished: false, landedOn: newPos };
}

// ─── Track ranking helpers ──────────────────────────────────────────────────

function getWinnerAndRunnerUp(track) {
  let winner = null;
  let runnerUp = null;
  for (let i = Object.keys(track).length - 1; i >= 0; i--) {
    for (let j = track[i].camels.length - 1; j >= 0; j--) {
      if (colorCamels.includes(track[i].camels[j])) {
        if (!winner) winner = track[i].camels[j];
        else if (!runnerUp) {
          runnerUp = track[i].camels[j];
          return { winner, runnerUp };
        }
      }
    }
  }
  return { winner, runnerUp };
}

function getLoser(track) {
  for (let i = 0; i < Object.keys(track).length; i++) {
    for (let j = 0; j < track[i].camels.length; j++) {
      if (colorCamels.includes(track[i].camels[j])) {
        return track[i].camels[j];
      }
    }
  }
  return null;
}

// ─── Leg simulation (for leg bet EV) ────────────────────────────────────────

function simulateLeg(track, remainingDice) {
  const simTrack = cloneTrack(track);
  let dice = [...remainingDice];

  while (dice.length > 1) {
    const result = simRollAndMove(simTrack, dice);
    dice = result.dice;
    if (result.finished) break;
  }

  return getWinnerAndRunnerUp(simTrack);
}

function estimateLegProbabilities(gameState) {
  const track = gameState.track;
  const remainingDice = gameState.legs[gameState.currentLegNum].remainingDice;

  const winCounts = {};
  const secondCounts = {};
  for (const c of colorCamels) {
    winCounts[c] = 0;
    secondCounts[c] = 0;
  }

  for (let i = 0; i < LEG_SIMULATIONS; i++) {
    const { winner, runnerUp } = simulateLeg(track, remainingDice);
    if (winner) winCounts[winner]++;
    if (runnerUp) secondCounts[runnerUp]++;
  }

  const probs = {};
  for (const c of colorCamels) {
    probs[c] = {
      win: winCounts[c] / LEG_SIMULATIONS,
      second: secondCounts[c] / LEG_SIMULATIONS,
    };
  }
  return probs;
}

// ─── Full-race simulation (for race bet EV) ─────────────────────────────────
// Simulates from current state until a camel crosses space 16, including
// leg transitions (dice reset, desert tile clearing).

function simulateRace(track, remainingDice) {
  let simTrack = cloneTrack(track);
  let dice = [...remainingDice];

  const MAX_LEGS = 20;
  for (let leg = 0; leg < MAX_LEGS; leg++) {
    while (dice.length > 1) {
      const result = simRollAndMove(simTrack, dice);
      dice = result.dice;
      if (result.finished) {
        const { winner } = getWinnerAndRunnerUp(simTrack);
        const loser = getLoser(simTrack);
        return { winner, loser };
      }
    }
    // Leg ended — clear desert tiles and reset dice
    for (const k of Object.keys(simTrack)) {
      simTrack[k].tiles = [];
    }
    dice = [...FULL_DICE];
  }

  // Fallback if race doesn't end (shouldn't happen)
  const { winner } = getWinnerAndRunnerUp(simTrack);
  const loser = getLoser(simTrack);
  return { winner, loser };
}

function estimateRaceProbabilities(gameState) {
  const track = gameState.track;
  const remainingDice = gameState.legs[gameState.currentLegNum].remainingDice;

  const winCounts = {};
  const loseCounts = {};
  for (const c of colorCamels) {
    winCounts[c] = 0;
    loseCounts[c] = 0;
  }

  for (let i = 0; i < RACE_SIMULATIONS; i++) {
    const { winner, loser } = simulateRace(track, remainingDice);
    if (winner) winCounts[winner]++;
    if (loser) loseCounts[loser]++;
  }

  const probs = {};
  for (const c of colorCamels) {
    probs[c] = {
      win: winCounts[c] / RACE_SIMULATIONS,
      lose: loseCounts[c] / RACE_SIMULATIONS,
    };
  }
  return probs;
}

// ─── Desert tile simulation ─────────────────────────────────────────────────
// For each candidate tile, simulate the remaining leg WITHOUT the tile and
// count how many times a camel's natural landing position equals tileIndex.
// Each such landing = 1 coin for the tile owner.

function estimateTileEV(gameState, tileIndex, tileSide) {
  const remainingDice = gameState.legs[gameState.currentLegNum].remainingDice;
  let totalHits = 0;

  for (let i = 0; i < TILE_SIMULATIONS; i++) {
    const simTrack = cloneTrack(gameState.track);
    simTrack[tileIndex].tiles = [tileSide === "oasis" ? "+" : "-"];

    let dice = [...remainingDice];
    while (dice.length > 1) {
      let rolledColor = _.sample(dice);
      dice = dice.filter((d) => d !== rolledColor);

      if (rolledColor === "bw") {
        rolledColor = _.sample(bwCamels);
      }
      const rolledNumber = _.sample([1, 2, 3]);

      const camelColor = bwCamels.includes(rolledColor)
        ? pickBlackOrWhiteCamel(simTrack, rolledColor)
        : rolledColor;

      const [pos] = getCamelPositionAndStack(simTrack, camelColor);
      if (pos < 0) continue;

      const movement = isColorCamel(camelColor) ? rolledNumber : -rolledNumber;
      let newPos = pos + movement;

      if (newPos > 15) {
        moveCamel(simTrack, camelColor, pos, null, false);
        break;
      }
      if (newPos < 0) newPos = 0;

      let placeUnder = false;
      if (simTrack[newPos] && simTrack[newPos].tiles.length > 0) {
        if (newPos === tileIndex) {
          totalHits++;
        }
        if (simTrack[newPos].tiles[0] === "+") {
          newPos += isColorCamel(camelColor) ? 1 : -1;
        } else {
          newPos += isColorCamel(camelColor) ? -1 : 1;
          placeUnder = true;
        }
      }
      if (newPos > 15 || newPos < 0) {
        moveCamel(simTrack, camelColor, pos, null, false);
        break;
      }

      moveCamel(simTrack, camelColor, pos, newPos, placeUnder);
    }
  }

  return totalHits / TILE_SIMULATIONS;
}

// ─── Action enumeration ─────────────────────────────────────────────────────

function getAvailableActions(gameState, player) {
  const actions = [];
  const currentLeg = gameState.legs[gameState.currentLegNum];

  actions.push({ type: "rollDice", data: {}, label: "roll" });

  for (const color of colorCamels) {
    const remaining = currentLeg.remainingLegBets[color];
    if (remaining.length > 0) {
      const topBet = remaining[remaining.length - 1];
      actions.push({
        type: "makeLegBet",
        data: { color },
        label: `legBet:${color}`,
        topBet,
      });
    }
  }

  const existingRaceBets = getPlayerRaceBetColors(gameState, player);
  for (const color of colorCamels) {
    if (!existingRaceBets.includes(color)) {
      actions.push({
        type: "makeRaceBet",
        data: { kind: "long", color },
        label: `raceBetWin:${color}`,
      });
      actions.push({
        type: "makeRaceBet",
        data: { kind: "short", color },
        label: `raceBetLose:${color}`,
      });
    }
  }

  const track = gameState.track;
  const playerLegData = gameState.players[player].legs[gameState.currentLegNum];
  const existingTile = playerLegData.desertTile;
  for (let i = 1; i < 16; i++) {
    if (track[i].camels.length > 0) continue;
    let blocked = false;
    for (const di of [i - 1, i, i + 1]) {
      if (
        di > 0 &&
        di < 16 &&
        track[di].tiles.length > 0 &&
        Math.abs(existingTile) !== di
      ) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    if (Math.abs(existingTile) === i) {
      if (existingTile > 0) {
        actions.push({
          type: "placeDesertTile",
          data: { desertTileIndex: i, desertTileSide: "mirage" },
          label: `desert:${i}:mirage`,
        });
      } else {
        actions.push({
          type: "placeDesertTile",
          data: { desertTileIndex: i, desertTileSide: "oasis" },
          label: `desert:${i}:oasis`,
        });
      }
    } else {
      actions.push({
        type: "placeDesertTile",
        data: { desertTileIndex: i, desertTileSide: "oasis" },
        label: `desert:${i}:oasis`,
      });
      actions.push({
        type: "placeDesertTile",
        data: { desertTileIndex: i, desertTileSide: "mirage" },
        label: `desert:${i}:mirage`,
      });
    }
  }

  return actions;
}

function getPlayerRaceBetColors(gameState, player) {
  const colors = [];
  for (const b of gameState.longRaceBets) {
    if (b.player === player) colors.push(b.color);
  }
  for (const b of gameState.shortRaceBets) {
    if (b.player === player) colors.push(b.color);
  }
  return colors;
}

// ─── Action scoring ─────────────────────────────────────────────────────────

function getRaceProgress(track) {
  let maxPos = 0;
  for (let i = Object.keys(track).length - 1; i >= 0; i--) {
    for (const c of track[i].camels) {
      if (colorCamels.includes(c)) {
        maxPos = Math.max(maxPos, i);
      }
    }
  }
  return maxPos;
}

function scoreActions(gameState, player, actions) {
  const legProbs = estimateLegProbabilities(gameState);

  const hasRaceBets = actions.some((a) => a.type === "makeRaceBet");
  const raceProbs = hasRaceBets ? estimateRaceProbabilities(gameState) : null;

  // Race progress: 0–15. Used to discount race bets early when predictions
  // are unreliable (winner's curse from noisy simulation estimates).
  const leadCamelPos = getRaceProgress(gameState.track);
  // Confidence ramps from ~0.15 at position 0 to ~1.0 at position 12+
  const raceConfidence = Math.min(1.0, leadCamelPos / 12);

  // Count existing race bets per color to determine payout position
  const longBetCounts = {};
  const shortBetCounts = {};
  for (const c of colorCamels) {
    longBetCounts[c] = 0;
    shortBetCounts[c] = 0;
  }
  for (const b of gameState.longRaceBets) {
    if (longBetCounts[b.color] !== undefined) longBetCounts[b.color]++;
  }
  for (const b of gameState.shortRaceBets) {
    if (shortBetCounts[b.color] !== undefined) shortBetCounts[b.color]++;
  }

  const RACE_PAYOFFS = [8, 5, 3, 2, 1, 1, 1, 1, 1];
  const UNIFORM_PRIOR = 1 / colorCamels.length; // 0.2

  return actions.map((action) => {
    let ev = 0;

    switch (action.type) {
      case "rollDice":
        ev = 1.0;
        break;

      case "makeLegBet": {
        const color = action.data.color;
        const pWin = legProbs[color].win;
        const pSecond = legProbs[color].second;
        const pLose = 1 - pWin - pSecond;
        ev = pWin * action.topBet + pSecond * 1 + pLose * -1;
        break;
      }

      case "makeRaceBet": {
        const color = action.data.color;
        const isWinBet = action.data.kind === "long";
        if (isWinBet) {
          // Bayesian shrinkage: blend sim estimate toward uniform prior
          const rawP = raceProbs[color].win;
          const pWin = raceConfidence * rawP + (1 - raceConfidence) * UNIFORM_PRIOR;
          const betPosition = longBetCounts[color];
          const payoff = RACE_PAYOFFS[Math.min(betPosition, RACE_PAYOFFS.length - 1)];
          ev = pWin * payoff - (1 - pWin) * 1;
        } else {
          const rawP = raceProbs[color].lose;
          const pLose = raceConfidence * rawP + (1 - raceConfidence) * UNIFORM_PRIOR;
          const betPosition = shortBetCounts[color];
          const payoff = RACE_PAYOFFS[Math.min(betPosition, RACE_PAYOFFS.length - 1)];
          ev = pLose * payoff - (1 - pLose) * 1;
        }
        break;
      }

      case "placeDesertTile": {
        const tilePos = action.data.desertTileIndex;
        let hasCamelNearby = false;
        for (let d = 1; d <= 3; d++) {
          const checkPos = tilePos - d;
          if (checkPos >= 0 && gameState.track[checkPos] &&
              gameState.track[checkPos].camels.length > 0) {
            hasCamelNearby = true;
            break;
          }
        }
        if (hasCamelNearby) {
          ev = estimateTileEV(
            gameState,
            tilePos,
            action.data.desertTileSide
          );
        } else {
          ev = 0;
        }
        break;
      }
    }

    return { ...action, ev };
  });
}

// ─── Decision making ────────────────────────────────────────────────────────

function chooseAction(gameState, player, difficulty) {
  const weight = DIFFICULTY_WEIGHTS[difficulty] || DIFFICULTY_WEIGHTS.medium;
  const actions = getAvailableActions(gameState, player);

  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];

  const scored = scoreActions(gameState, player, actions);

  const maxEv = Math.max(...scored.map((a) => a.ev));
  // Low temperature makes the optimal distribution sharply favor high-EV
  // actions. Difficulty blending then controls the noise level.
  const temperature = 0.25;
  const expScores = scored.map((a) =>
    Math.exp((a.ev - maxEv) / temperature)
  );
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const optimalProbs = expScores.map((e) => e / sumExp);

  const uniformProb = 1 / scored.length;

  const blended = scored.map((action, i) => ({
    action,
    prob: weight * optimalProbs[i] + (1 - weight) * uniformProb,
  }));

  const r = Math.random();
  let cumulative = 0;
  for (const { action, prob } of blended) {
    cumulative += prob;
    if (r <= cumulative) {
      return action;
    }
  }
  return blended[blended.length - 1].action;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function makeBotMove(gameState, player, difficulty) {
  const action = chooseAction(gameState, player, difficulty);
  if (!action) return null;
  return {
    type: action.type,
    player,
    data: action.data,
  };
}

export function getBotDifficulties() {
  return Object.keys(DIFFICULTY_WEIGHTS);
}

export function debugScoreActions(gameState, player, difficulty) {
  const actions = getAvailableActions(gameState, player);
  const scored = scoreActions(gameState, player, actions);
  const top5 = scored
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 5)
    .map((a) => ({ label: a.label, ev: a.ev.toFixed(3), type: a.type }));
  return { leadCamelPos: getRaceProgress(gameState.track), top5 };
}
