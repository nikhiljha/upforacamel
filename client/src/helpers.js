export function playerNumberToColor(n) {
  return [
    "#6CB4EE",
    "#F08080",
    "#90D5A0",
    "#FFD580",
    "#C5A3FF",
    "#87CEEB",
    "#DDA0DD",
    "#F4A460",
  ][n - 1];
}

export function camelToNumber(camelColor) {
  switch (camelColor) {
    case "red":
      return 1;
    case "yellow":
      return 2;
    case "blue":
      return 3;
    case "green":
      return 4;
    case "purple":
      return 5;
    case "black":
      return -1;
    case "white":
      return -2;
    default:
      console.error("unknown camel color");
      return null;
  }
}

// Returns the named color string used in server protocol
export function camelToColor(camelNumber) {
  switch (camelNumber) {
    case 1:
      return "red";
    case 2:
      return "yellow";
    case 3:
      return "blue";
    case 4:
      return "green";
    case 5:
      return "purple";
    case -1:
      return "black";
    case -2:
      return "white";
    default:
      console.error("unknown camel number");
      return null;
  }
}

// Returns a richer hex color for display/rendering
export function camelToDisplayColor(camelNumber) {
  switch (camelNumber) {
    case 1:
      return "#D94F4F";
    case 2:
      return "#E8A832";
    case 3:
      return "#4A7FD4";
    case 4:
      return "#3DAA6D";
    case 5:
      return "#855FCC";
    case -1:
      return "#333333";
    case -2:
      return "#F5F5F5";
    default:
      console.error("unknown camel number");
      return null;
  }
}

export function camelToTextColor(camelNumber) {
  switch (camelNumber) {
    case 1:
      return "#FFFFFF";
    case 2:
      return "#2C1810";
    case 3:
      return "#FFFFFF";
    case 4:
      return "#FFFFFF";
    case 5:
      return "#FFFFFF";
    case -1:
      return "#FFFFFF";
    case -2:
      return "#2C1810";
    default:
      console.error("unknown camel number");
      return null;
  }
}

export function camelToName(camelNumber) {
  switch (camelNumber) {
    case 1:
      return "Red";
    case 2:
      return "Yellow";
    case 3:
      return "Blue";
    case 4:
      return "Green";
    case 5:
      return "Purple";
    case -1:
      return "Black";
    case -2:
      return "White";
    default:
      return "?";
  }
}

export function getPositions(gameState) {
  if (!gameState) {
    return [];
  }
  return Object.values(gameState.track).map((v) =>
    v.camels.map((c) => camelToNumber(c)).reverse()
  );
}

export function getFinishers(gameState) {
  if (!gameState) {
    return [];
  }
  return (gameState.finishers || []).map((c) => camelToNumber(c)).reverse();
}

export function getCrowds(gameState) {
  if (!gameState) {
    return [];
  }
  const crowds = [];
  for (let i = 0; i < 16; i++) {
    crowds.push(null);
    for (const n in gameState.players) {
      const v = Object.values(gameState.players[n].legs).slice(-1)[0]
        .desertTile;
      if (Math.abs(v) === i) {
        crowds[i] = { player: parseInt(n), direction: v ? v / Math.abs(v) : 1 };
      }
    }
  }
  return crowds;
}
export function getCurrentLeg(gameState) {
  return gameState.legs[gameState.currentLegNum];
}

export function getAvailableBets(gameState) {
  if (!gameState) {
    return [];
  }
  const bets = [];
  for (const c in getCurrentLeg(gameState).remainingLegBets) {
    bets[camelToNumber(c) - 1] = getCurrentLeg(gameState).remainingLegBets[
      c
    ].slice(-1)[0];
  }
  return bets;
}

export function getLongBets(gameState) {
  if (!gameState) {
    return { toLose: [], toWin: [] };
  }
  return {
    toLose: gameState.shortRaceBets.map((b) => ({
      player: parseInt(b.player),
      camel: camelToNumber(b.color),
    })),
    toWin: gameState.longRaceBets.map((b) => ({
      player: parseInt(b.player),
      camel: camelToNumber(b.color),
    })),
  };
}

export function getAvailableLongBets(gameState, player) {
  const placed = [].concat(
    gameState.players[player]?.raceBets?.longRaceBets || [],
    gameState.players[player]?.raceBets?.shortRaceBets || []
  );
  return [1, 2, 3, 4, 5].filter((n) => !placed.includes(camelToColor(n)));
}

export function getPlayers(gameState) {
  if (!(gameState && gameState.players)) {
    return [];
  }
  const players = [];
  for (const k in gameState.players) {
    const p = gameState.players[k];

    const lastLeg = Object.values(p.legs).slice(-1)[0];
    const bets = [];
    if (gameState.status === "inprogress") {
      for (const c in lastLeg.legBets) {
        for (const payout of lastLeg.legBets[c]) {
          bets.push({ camel: camelToNumber(c), payout });
        }
      }
    }
    let money = Object.values(p.legs)
      .map((leg) => leg.score || 0)
      .reduce((x, y) => x + y);
    if (gameState.finalScore) {
      money = gameState.finalScore[k] || 0;
    }
    players[parseInt(k) - 1] = { name: p.displayName, money, bets };
  }
  return players;
}

export function getRolls(gameState) {
  if (!gameState) {
    return [];
  }
  return getCurrentLeg(gameState).rolledDice.map(
    ({ color, number, player }) => ({
      camel: camelToNumber(color),
      number,
      player: parseInt(player),
    })
  );
}

const COLORED_DICE = ["red", "yellow", "blue", "green", "purple"];

export function getUnrolledDice(gameState) {
  if (!gameState) return [];
  const remaining = new Set(getCurrentLeg(gameState).remainingDice || []);
  return COLORED_DICE.filter((c) => remaining.has(c)).map((c) => camelToNumber(c));
}

export function getDiceRemaining(gameState) {
  if (!gameState) return 6;
  return (getCurrentLeg(gameState).remainingDice || []).length;
}

export function getCurrentPlayerName(gameState) {
  if (!gameState || !gameState.currentPlayer) return null;
  const p = gameState.players[gameState.currentPlayer];
  return p ? p.displayName : null;
}

export function getLegResults(gameState) {
  if (!gameState || !gameState.players) {
    return [];
  }

  const results = [];

  for (let legNum = 0; legNum < gameState.currentLegNum; legNum++) {
    const leg = gameState.legs[legNum];
    const winnerCamel = leg.winner;
    const runnerUpCamel = leg.runnerUp;

    const legResults = {
      legNumber: legNum + 1,
      winner: camelToNumber(winnerCamel),
      runnerUp: camelToNumber(runnerUpCamel),
      players: []
    };

    for (const playerId in gameState.players) {
      const player = gameState.players[playerId];
      const legData = player.legs[legNum];

      if (!legData) continue;

      const bets = [];
      let totalBetPoints = 0;

      for (const color in legData.legBets) {
        for (const betValue of legData.legBets[color]) {
          let payout = 0;
          let result = "lost";

          if (color === winnerCamel) {
            payout = betValue;
            result = "won";
            totalBetPoints += betValue;
          } else if (color === runnerUpCamel) {
            payout = 1;
            result = "second";
            totalBetPoints += 1;
          } else {
            payout = -1;
            result = "lost";
            totalBetPoints -= 1;
          }

          bets.push({
            color: color,
            betValue: betValue,
            payout: payout,
            result: result
          });
        }
      }

      const rollPoints = legData.rolls;
      const desertTilePoints = legData.desertTilePoints;

      legResults.players.push({
        playerId: parseInt(playerId),
        name: player.displayName,
        totalScore: legData.score,
        rollPoints: rollPoints,
        betPoints: totalBetPoints,
        desertTilePoints: desertTilePoints,
        bets: bets
      });
    }

    results.push(legResults);
  }

  return results;
}
