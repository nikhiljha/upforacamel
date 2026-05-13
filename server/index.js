import { Server } from "http";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { predicates, objects } from "./words.js";
import {
  getInitialGameState,
  makeNewPlayer,
  startGame,
  reduceEvent,
  redactGameState,
  updateDisplayName,
  removePlayer,
} from "./reducer.js";
import { makeBotMove, getBotDifficulties } from "./bot.js";

function randomWord(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function generateGameId() {
  return `${randomWord(predicates)}-${randomWord(predicates)}-${randomWord(objects)}`;
}

const MAX_RETRIES = 10;

const app = express();

app.get("/api/create-game", (req, res) => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const id = generateGameId();
    if (!games[id]) {
      return res.json({ gameId: id });
    }
  }
  res.status(503).json({ error: "Could not generate a unique game ID. Try again." });
});

app.use(express.static("static"));

const server = Server(app);
console.log(`env: ${process.env.NODE_ENV}`);
const io = (process.env.NODE_ENV = "development"
  ? new SocketServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    })
  : new SocketServer(server));

const games = {};
const gameObservers = {}; // id to game id

const registerGameObserver = (gameId, callback) => {
  const id = uuidv4();
  if (!games[gameId]) {
    games[gameId] = {
      state: getInitialGameState(),
      observers: [],
      cookies: [],
      bots: {}, // player number → { difficulty }
    };
  }
  games[gameId].observers[id] = { callback };
  gameObservers[id] = gameId;
  return id;
};
const issueUpdate = (gameId) => {
  for (const o of Object.values(games[gameId].observers)) {
    const players = (o.cookie && games[gameId].cookies[o.cookie].players) || [];
    o.callback({
      type: "game_state",
      data: redactGameState(games[gameId].state, players),
    });
  }
};

const issuePlayerUpdate = (observerId) => {
  const gameId = gameObservers[observerId];
  const game = games[gameId];
  const observer = game.observers[observerId];
  const cookie = game.cookies[observer.cookie];
  observer.callback({
    type: "player_assignment",
    data: { players: cookie.players },
  });
};

const issueBotListUpdate = (gameId) => {
  const game = games[gameId];
  const botList = {};
  for (const [player, info] of Object.entries(game.bots)) {
    botList[player] = { difficulty: info.difficulty };
  }
  for (const o of Object.values(game.observers)) {
    o.callback({
      type: "bot_list",
      data: { bots: botList },
    });
  }
};

const registerCookie = (observerId, cookie) => {
  console.log("registering cookie");
  const gameId = gameObservers[observerId];
  const game = games[gameId];
  const cookies = game.cookies;
  if (!(cookie in cookies)) {
    const player = makeNewPlayer(game.state);
    cookies[cookie] = { players: [player] };
  }
  game.observers[observerId].cookie = cookie;
  issueUpdate(gameId);
  issuePlayerUpdate(observerId);
  issueBotListUpdate(gameId);
};

const addBot = (gameId, difficulty) => {
  const game = games[gameId];
  if (game.state.status !== "init") return null;

  const player = makeNewPlayer(game.state);
  if (!player) return null;

  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  updateDisplayName(game.state, player, `Bot (${diffLabel})`);
  game.bots[player] = { difficulty };

  issueUpdate(gameId);
  issueBotListUpdate(gameId);
  return player;
};

const removeBot = (gameId, player) => {
  const game = games[gameId];
  if (game.state.status !== "init") return;
  if (!game.bots[player]) return;

  delete game.bots[player];
  removePlayer(game.state, player);
  issueUpdate(gameId);
  issueBotListUpdate(gameId);
};

const start = (gameId) => {
  console.log(`starting game ${gameId}!`);
  startGame(games[gameId].state);
  issueUpdate(gameId);
  scheduleBotTurn(gameId);
};

const processEvent = (observerId, event) => {
  const gameId = gameObservers[observerId];
  const game = games[gameId];
  const cookie = game.observers[observerId].cookie;
  const coookie = game.cookies[cookie];
  if (event.player && !(coookie && coookie.players.includes(event.player))) {
    throw new Error("You arent that player you dirty dog");
  }

  reduceEvent(game.state, event);
  issueUpdate(gameId);
  scheduleBotTurn(gameId);
};

const scheduleBotTurn = (gameId) => {
  const game = games[gameId];
  if (!game || game.state.status !== "inprogress") return;

  const currentPlayer = game.state.currentPlayer;
  const botInfo = game.bots[currentPlayer];
  if (!botInfo) return;

  // Delay to make bot turns feel natural (600-1200ms)
  const delay = 600 + Math.random() * 600;
  setTimeout(() => {
    try {
      if (game.state.status !== "inprogress") return;
      if (game.state.currentPlayer !== currentPlayer) return;

      const event = makeBotMove(game.state, currentPlayer, botInfo.difficulty);
      if (event) {
        console.log(`Bot ${currentPlayer} (${botInfo.difficulty}):`, event.type, event.data);
        reduceEvent(game.state, event);
        issueUpdate(gameId);
        scheduleBotTurn(gameId);
      }
    } catch (e) {
      console.log(`Bot error: ${e.message}`, e.stack);
    }
  }, delay);
};

const changeName = (observerId, player, displayName) => {
  const gameId = gameObservers[observerId];
  const game = games[gameId];
  // Don't allow renaming bots
  if (game.bots[player]) return;
  updateDisplayName(game.state, player, displayName);
  issueUpdate(gameId);
};

const remove = (observerId, player) => {
  const gameId = gameObservers[observerId];
  const game = games[gameId];
  if (game.bots[player]) {
    removeBot(gameId, player);
  } else {
    removePlayer(game.state, player);
    issueUpdate(gameId);
  }
};

io.on("connection", (socket) => {
  console.log("connection", socket.id);

  socket.on("join", ({ gameId, cookie }) => {
    let observerId = registerGameObserver(gameId, (observerEvent) => {
      socket.emit(observerEvent.type, observerEvent.data);
    });

    registerCookie(observerId, cookie);

    socket.on("start_game", ({ gameId }) => {
      start(gameId);
    });

    socket.on("change_name", ({ player, displayName }) => {
      changeName(observerId, player, displayName);
    });

    socket.on("remove_player", ({ player }) => {
      remove(observerId, player);
    });

    socket.on("add_bot", ({ difficulty }) => {
      const gameId = gameObservers[observerId];
      addBot(gameId, difficulty);
    });

    socket.on("remove_bot", ({ player }) => {
      const gameId = gameObservers[observerId];
      removeBot(gameId, player);
    });

    socket.on("event", (event) => {
      console.log("got event ", event);
      try {
        processEvent(observerId, event);
      } catch (e) {
        console.log(e);
      }

      console.log("new game state");
    });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT);
