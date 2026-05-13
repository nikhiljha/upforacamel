import _ from "lodash";
import util from "util";
import {
  colorCamels,
  bwCamels,
  isColorCamel,
  getCamelPositionAndStack,
  pickBlackOrWhiteCamel,
  moveCamel,
} from "./camel-movement.js";

export function makeNewPlayer(gameState) {
  if (gameState.status !== "init") {
    console.log(
      `Invalid move. Player cannot be added to a ${gameState.status} game`
    );
    return;
  }

  gameState.numberPlayers += 1;
  const newPlayer = _.cloneDeep(initialPlayerState);
  newPlayer.displayName = `Player ${gameState.numberPlayers}`;
  gameState.players[gameState.numberPlayers.toString()] = newPlayer;

  return gameState.numberPlayers.toString();
}

export function startGame(gameState) {
  if (gameState.status !== "init") {
    console.log(
      `Invalid move. Player cannot start a game with status ${gameState.status}`
    );
    return;
  }

  var dice = _.cloneDeep(colorCamels).concat(_.cloneDeep(bwCamels));
  var track = gameState.track;
  while (dice.length > 0) {
    var color = _.sample(dice);
    var number = _.sample([1, 2, 3]);
    dice = _.filter(dice, (o) => {
      return o !== color;
    });
    if (colorCamels.includes(color)) {
      track[number - 1]["camels"].push(color);
    } else {
      track[16 - number]["camels"].push(color);
    }
  }
  gameState.currentPlayer = _.sample(Object.keys(gameState.players));
  gameState.status = "inprogress";
}

export function reduceEvent(gameState, event) {
  validateEvent(gameState, event);
  gameState.events.push(event);

  switch (event.type) {
    case "makeLegBet":
      makeLegBet(gameState, event);
      break;
    case "rollDice":
      rollDice(gameState, event);
      break;
    case "placeDesertTile":
      placeDesertTile(gameState, event);
      break;
    case "makeRaceBet":
      makeRaceBet(gameState, event);
      break;
    case "pickPartner":
      pickPartner(gameState, event);
      break;
  }
  // 1-indexed
  gameState.currentPlayer = (
    (parseInt(gameState.currentPlayer) % gameState.numberPlayers) +
    1
  ).toString();
  while (!gameState.players[gameState.currentPlayer]) {
    gameState.currentPlayer = (
      (parseInt(gameState.currentPlayer) % gameState.numberPlayers) +
      1
    ).toString();
  }
}

function validateEvent(gameState, event) {
  var track = gameState.track;
  var currentLegNum = gameState.currentLegNum;
  var currentPlayer = event.player;

  if (currentPlayer !== gameState.currentPlayer) {
    throw new Error(
      `Invalid move. Player ${currentPlayer} acted out of turn. It is player ${gameState.currentPlayer}'s turn.`
    );
  }
  switch (event.type) {
    case "makeLegBet":
      var selectedColor = event.data.color;
      if (
        gameState.legs[gameState.currentLegNum].remainingLegBets[selectedColor]
          .length === 0
      ) {
        throw new Error("Invalid move. Player has no more leg bets for color");
      }
      break;
    case "rollDice":
      // does anything need to be checked?
      break;
    case "placeDesertTile":
      var desertTileIndex = event.data.desertTileIndex;
      if (desertTileIndex === 0) {
        throw new Error("Invalid move. Cannot place on first tile");
      }
      var existingDesertTile =
        gameState["players"][currentPlayer]["legs"][currentLegNum][
          "desertTile"
        ];

      // current index cannot have a camel
      if (track[desertTileIndex]["camels"].length > 0) {
        throw new Error(
          `Invalid move. There are already camels ${track[desertTileIndex]["camels"]} on this tile`
        );
      }

      function checkDesertTileIndex(index) {
        if (
          index < 16 &&
          index > 0 &&
          track[index]["tiles"].length > 0 &&
          Math.abs(existingDesertTile) !== index
        ) {
          throw new Error(
            `Invalid move. Another player's tile is at index ${index}`
          );
        }
      }
      // there are no other users' tiles on +/- 1 of this spot
      checkDesertTileIndex(desertTileIndex);
      checkDesertTileIndex(desertTileIndex + 1);
      checkDesertTileIndex(desertTileIndex - 1);

      // if user is already already there, they must flip the tile side
      if (Math.abs(existingDesertTile) === desertTileIndex) {
        if (existingDesertTile > 0 && event.data.desertTileSide === "oasis") {
          throw new Error(
            "Invalid move. Player already has an oasis desert tile here"
          );
        } else if (
          existingDesertTile < 0 &&
          event.data.desertTileSide === "mirage"
        ) {
          throw new Error(
            "Invalid move. Player already has an mirage desert tile here"
          );
        }
      }
      break;
    case "makeRaceBet":
      var color = event.data.color;

      var raceBets = getPlayerExistingRaceBets(gameState, currentPlayer);
      if (
        raceBets["longRaceBets"].includes(color) ||
        raceBets["shortRaceBets"].includes(color)
      ) {
        throw new Error(
          "Invalid move. Player has already made a race bet with this color"
        );
      }
      break;
    case "pickPartner":
      var partner = event.data.partner;
      if (gameState.numberPlayers < 6) {
        throw new Error(
          `Invalid move. Can only pick partners in games of 6 or more players.`
        );
      }
      if (gameState.players[currentPlayer]["legs"][currentLegNum].partner) {
        throw new Error(
          `Invalid move. You already have a partner in this leg.`
        );
      }
      if (gameState.players[partner]["legs"][currentLegNum].partner) {
        throw new Error(
          `Invalid move. ${partner} already has a partner in this leg.`
        );
      }
      break;
  }
}

function makeLegBet(gameState, event) {
  var currentPlayer = event.player;
  var currentLegNum = gameState.currentLegNum;
  var selectedColor = event.data.color;
  var payoff = gameState.legs[gameState.currentLegNum].remainingLegBets[
    selectedColor
  ].pop();
  gameState.players[currentPlayer]["legs"][currentLegNum]["legBets"][
    selectedColor
  ].push(payoff);
}

export function getPlayerExistingRaceBets(gameState, player) {
  var longRaceBets = [];
  for (const o of gameState["longRaceBets"]) {
    if (o.player == player) {
      longRaceBets.push(o.color);
    }
  }
  var shortRaceBets = [];
  for (const o of gameState["shortRaceBets"]) {
    if (o.player == player) {
      shortRaceBets.push(o.color);
    }
  }
  return {
    longRaceBets: longRaceBets,
    shortRaceBets: shortRaceBets,
  };
}

function makeRaceBet(gameState, event) {
  var kind = event.data.kind;
  var color = event.data.color;
  var currentPlayer = event.player;

  var category = kind === "long" ? "longRaceBets" : "shortRaceBets";
  gameState[category].push({
    player: currentPlayer,
    color: color,
  });
}

function pickPartner(gameState, event) {
  const currentPlayer = event.player;
  const partner = event.data.partner;
  const currentLegNum = gameState.currentLegNum;

  gameState.players[currentPlayer]["legs"][currentLegNum].partner = partner;
  gameState.players[partner]["legs"][currentLegNum].partner = currentPlayer;
}

function placeDesertTile(gameState, event) {
  var track = gameState.track;
  var currentLegNum = gameState.currentLegNum;
  var currentPlayer = event.player;

  var desertTileIndex = event.data.desertTileIndex;
  var isOasis = event.data.desertTileSide === "oasis";

  // remove existing desert tile
  var existingDesertTile =
    gameState["players"][currentPlayer]["legs"][currentLegNum]["desertTile"];
  if (existingDesertTile !== -100) {
    track[Math.abs(existingDesertTile)]["tiles"] = [];
  }

  // add new desert tile
  track[desertTileIndex]["tiles"] = [isOasis ? "+" : "-"];
  gameState["players"][currentPlayer]["legs"][currentLegNum][
    "desertTile"
  ] = isOasis ? desertTileIndex : -1 * desertTileIndex;
}



function rollDice(gameState, event) {
  var currentPlayer = event.player;
  var currentLegNum = gameState.currentLegNum;
  var track = gameState.track;
  var currentLeg = gameState.legs[currentLegNum];

  var rolledDiceColor = _.sample(currentLeg.remainingDice);
  currentLeg.remainingDice = _.filter(currentLeg.remainingDice, function (o) {
    return o !== rolledDiceColor;
  });

  if (rolledDiceColor === "bw") {
    rolledDiceColor = _.sample(bwCamels);
  }
  var rolledDiceNumber = _.sample([1, 2, 3]);
  console.log(`color ${rolledDiceColor}; number ${rolledDiceNumber}`);

  currentLeg.rolledDice.push({
    color: rolledDiceColor,
    number: rolledDiceNumber,
    player: currentPlayer,
  });

  gameState.players[currentPlayer]["legs"][currentLegNum]["rolls"] += 1;

  var camelColor = bwCamels.includes(rolledDiceColor)
    ? pickBlackOrWhiteCamel(track, rolledDiceColor)
    : rolledDiceColor;

  var [camelPosition, camelsToMove] = getCamelPositionAndStack(
    track,
    camelColor
  );
  if (camelPosition < 0) {
    throw new Error(`Something went wrong! ${camelColor} camel was not found`);
  }

  var movement = isColorCamel(camelColor)
    ? rolledDiceNumber
    : -1 * rolledDiceNumber;

  var newCamelPosition = camelPosition + movement;
  if (newCamelPosition > 15) {
    const moved = moveCamel(track, camelColor, camelPosition, null, null);
    gameState.finishers = moved;
    scoreGame(gameState, camelsToMove);
    return;
  }

  var placeUnder = false;
  if (track[newCamelPosition]["tiles"].length > 0) {
    updatePlayerScoreDesertTile(gameState, newCamelPosition);
    if (track[newCamelPosition]["tiles"][0] === "+") {
      newCamelPosition += isColorCamel(camelColor) ? 1 : -1;
    } else {
      newCamelPosition += isColorCamel(camelColor) ? -1 : +1;
      placeUnder = true;
    }
  }

  if (newCamelPosition > 15) {
    const moved = moveCamel(track, camelColor, camelPosition, null, null);
    gameState.finishers = moved;
    scoreGame(gameState, camelsToMove);
    return;
  }
  console.log(
    `moving camel ${camelColor} from ${camelPosition} to ${newCamelPosition}`
  );
  moveCamel(track, camelColor, camelPosition, newCamelPosition, placeUnder);

  if (gameState.legs[gameState.currentLegNum].remainingDice.length === 1) {
    var [winnerCamel, runnerUpCamel] = getWinnerRunnerUp(gameState);
    scoreLeg(gameState, winnerCamel, runnerUpCamel);
    newLeg(gameState);
  }
}

function getWinnerRunnerUpLoser(gameState, camelsToMove) {
  var winnerCamel = null;
  var runnerUpCamel = null;
  var loserCamel = null;
  while (camelsToMove.length > 0) {
    var camel = camelsToMove.pop();
    if (colorCamels.includes(camel)) {
      if (!winnerCamel) {
        winnerCamel = camel;
      } else if (!runnerUpCamel) {
        runnerUpCamel = camel;
      } else {
        loserCamel = camel;
      }
    }
  }
  if (!runnerUpCamel) {
    var [runnerUpCamel, dummy] = getWinnerRunnerUp(gameState);
  }
  if (!loserCamel) {
    loserCamel = getLoserCamel(gameState);
  }
  return [winnerCamel, runnerUpCamel, loserCamel];
}

function scoreGame(gameState, camelsToMove) {
  console.log("SCORING GAME");
  const [winnerCamel, runnerUpCamel, loserCamel] = getWinnerRunnerUpLoser(
    gameState,
    camelsToMove
  );
  console.log(
    `Winner camel is ${winnerCamel}. Runner up is ${runnerUpCamel}. Loser is ${loserCamel}`
  );
  scoreLeg(gameState, winnerCamel, runnerUpCamel);

  // sum up leg scores
  var scores = {};
  for (var i = 1; i <= gameState.numberPlayers; i++) {
    var playerLegScore = 0;
    var currentPlayer = gameState["players"][i];

    for (var j = 0; j <= gameState.currentLegNum; j++) {
      playerLegScore += currentPlayer["legs"][j]["score"];
    }
    scores[i] = playerLegScore;
  }

  var payoffs = [8, 5, 3, 2]; // everyone gets at least 1
  for (var key in gameState.longRaceBets) {
    var o = gameState.longRaceBets[key];
    if (o.color == winnerCamel) {
      scores[o.player] += payoffs.length > 0 ? payoffs.shift() : 1;
    } else {
      scores[o.player] -= 1;
    }
  }

  payoffs = [8, 5, 3, 2]; // everyone gets at least 1
  for (var key in gameState.shortRaceBets) {
    var o = gameState.shortRaceBets[key];
    if (o.color == loserCamel) {
      scores[o.player] += payoffs.length > 0 ? payoffs.shift() : 1;
    } else {
      scores[o.player] -= 1;
    }
  }
  gameState.finalScore = scores;
  gameState.status = "ended";
}

function updatePlayerScoreDesertTile(gameState, camelPosition) {
  var foundTileOwner = false;
  for (var i = 0; i < gameState.numberPlayers; i++) {
    var desertTile =
      gameState.players[i + 1]["legs"][gameState.currentLegNum].desertTile;
    if (Math.abs(desertTile) == camelPosition) {
      gameState.players[i + 1]["legs"][gameState.currentLegNum]["score"] += 1;
      gameState.players[i + 1]["legs"][gameState.currentLegNum]["desertTilePoints"] += 1;
      foundTileOwner = true;
    }
  }
  if (!foundTileOwner) {
    throw new Error(`No player found for tile on space ${camelPosition}`);
  }
}

function getWinnerRunnerUp(gameState) {
  var winnerCamel = null;
  var runnerUpCamel = null;
  var track = gameState.track;

  for (var i = Object.keys(track).length - 1; i >= 0; i--) {
    for (var j = track[i]["camels"].length - 1; j >= 0; j--) {
      var foundColorCamel = colorCamels.includes(track[i]["camels"][j]);
      if (foundColorCamel) {
        if (!winnerCamel) {
          winnerCamel = track[i]["camels"][j];
        } else if (!runnerUpCamel) {
          runnerUpCamel = track[i]["camels"][j];
          break;
        }
      }
    }
  }

  return [winnerCamel, runnerUpCamel];
}

function getLoserCamel(gameState) {
  var track = gameState.track;

  for (var i = 0; i < Object.keys(track).length; i++) {
    for (var j = 0; j < track[i]["camels"].length; j++) {
      if (colorCamels.includes(track[i]["camels"][j])) {
        return track[i]["camels"][j];
      }
    }
  }
}

function scoreLeg(gameState, winnerCamel, runnerUpCamel) {
  const currentLegNum = gameState.currentLegNum;

  // Store the winner and runner-up for this leg
  gameState.legs[currentLegNum].winner = winnerCamel;
  gameState.legs[currentLegNum].runnerUp = runnerUpCamel;

  for (var i = 1; i <= gameState.numberPlayers; i++) {
    var maxPartnerPayoff = 0;
    var playerPosition = gameState.players[i]["legs"][currentLegNum];
    var score = playerPosition.score;
    score += playerPosition.rolls;
    if (playerPosition.rolls > 0) {
      maxPartnerPayoff = 1;
    }
    for (let k in playerPosition.legBets) {
      if (k === winnerCamel) {
        score += _.sum(playerPosition.legBets[k]);
        if (playerPosition.legBets[k].length > 0) {
          maxPartnerPayoff = _.max(playerPosition.legBets[k]);
        }
      } else if (k === runnerUpCamel) {
        score += playerPosition.legBets[k].length;
        if (playerPosition.legBets[k].length > 0) {
          maxPartnerPayoff = Math.max(maxPartnerPayoff, 1);
        }
      } else {
        score -= playerPosition.legBets[k].length;
      }
    }
    gameState.players[i]["legs"][currentLegNum]["score"] = Math.max(score, 0); // can't go negative

    if (maxPartnerPayoff < 0 || maxPartnerPayoff == undefined) {
      throw new Error(
        "Something went wrong. Partner payoff cannot be negative or undefined"
      );
    }

    if (playerPosition.partner) {
      gameState.players[playerPosition.partner]["legs"][
        currentLegNum
      ].score = maxPartnerPayoff;
    }
  }
}

function newLeg(gameState) {
  gameState.currentLegNum += 1;
  gameState.legs[gameState.currentLegNum] = _.cloneDeep(initialLegState);

  var track = gameState.track;
  // clear desert tiles from track
  for (var i = Object.keys(track).length - 1; i >= 0; i--) {
    track[i]["tiles"] = [];
  }

  for (var i = 0; i < gameState.numberPlayers; i++) {
    gameState.players[i + 1]["legs"][gameState.currentLegNum] = _.cloneDeep(
      initialPlayerLegState
    );
  }
}

export function updateDisplayName(gameState, player, displayName) {
  // if (gameState.status !== "init") {
  //   console.log(
  //     `Invalid update. Name cannot be change in a ${gameState.status} game`
  //   );
  //   return;
  // }
  gameState.players[player].displayName = displayName;
}

export function removePlayer(gameState, player) {
  if (gameState.status !== "init") {
    console.log(
      `Invalid update. Players cannot be removed in a ${gameState.status} game`
    );
    return;
  }
  delete gameState.players[player];
}

var initialPlayerLegState = {
  legBets: {
    red: [],
    purple: [],
    blue: [],
    green: [],
    yellow: [],
  },
  partner: null,
  rolls: 0,
  desertTile: -100, // -100 means unused
  score: 0,
  desertTilePoints: 0, // this is only used for the leg results board
};

var initialPlayerState = {
  displayName: "",
  legs: {
    0: _.cloneDeep(initialPlayerLegState),
  },
};

var initialTrackState = {
  camels: [],
  tiles: [],
};

var initialLegBets = {
  red: [2, 2, 3, 5],
  purple: [2, 2, 3, 5],
  blue: [2, 2, 3, 5],
  green: [2, 2, 3, 5],
  yellow: [2, 2, 3, 5],
};

var initialLegState = {
  remainingLegBets: _.cloneDeep(initialLegBets),
  remainingDice: ["red", "green", "blue", "purple", "yellow", "bw"],
  rolledDice: [],
};

var initialGameState = {
  numberPlayers: 0,
  currentPlayer: "1",
  currentLegNum: 0,
  status: "init", // "init", "inprogress", "ended"
  longRaceBets: [],
  shortRaceBets: [],
  legs: {
    0: _.cloneDeep(initialLegState),
  },
  players: {},
  track: {
    0: _.cloneDeep(initialTrackState),
    1: _.cloneDeep(initialTrackState),
    2: _.cloneDeep(initialTrackState),
    3: _.cloneDeep(initialTrackState),
    4: _.cloneDeep(initialTrackState),
    5: _.cloneDeep(initialTrackState),
    6: _.cloneDeep(initialTrackState),
    7: _.cloneDeep(initialTrackState),
    8: _.cloneDeep(initialTrackState),
    9: _.cloneDeep(initialTrackState),
    10: _.cloneDeep(initialTrackState),
    11: _.cloneDeep(initialTrackState),
    12: _.cloneDeep(initialTrackState),
    13: _.cloneDeep(initialTrackState),
    14: _.cloneDeep(initialTrackState),
    15: _.cloneDeep(initialTrackState),
  },
  finalScore: null,
  events: [],
};

export function getInitialGameState() {
  return _.cloneDeep(initialGameState);
}

export function redactGameState(gameState, assignedPlayers) {
  const redacted = _.cloneDeep(gameState);
  const players =
    redacted.status === "ended"
      ? Object.keys(redacted.players)
      : assignedPlayers;
  for (const player of players) {
    if (!redacted.players[player]) {
      continue;
    }
    redacted.players[player].raceBets = getPlayerExistingRaceBets(
      gameState,
      player
    );
  }
  for (const k of ["longRaceBets", "shortRaceBets"]) {
    redacted[k] = redacted[k].map((b) =>
      !players.includes(b.player) ? { ...b, color: null } : b
    );
  }
  return redacted;
}
