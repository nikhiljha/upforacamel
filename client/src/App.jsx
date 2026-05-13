import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

import {
  camelToColor,
  getPositions,
  getCrowds,
  getFinishers,
  getAvailableBets,
  getLongBets,
  getAvailableLongBets,
  getPlayers,
  getRolls,
  getUnrolledDice,
  getDiceRemaining,
  getCurrentPlayerName,
  getLegResults,
  playerNumberToColor,
} from "./helpers";
import { Track } from "./Track";
import { Bets } from "./Bets";
import { LongBets, FinalLongBets } from "./LongBets";
import { Dice } from "./Dice";
import { Player } from "./Player";
import { LegResults } from "./LegResults";
import { Rules } from "./Rules";
import { QuickStart } from "./QuickStart";
import { LegToast } from "./LegToast";
import { ActionLog } from "./ActionLog";
import "./App.css";

function getCookie() {
  let cookie = localStorage.getItem("camelCookie");
  if (!cookie) {
    cookie = crypto.randomUUID();
    localStorage.setItem("camelCookie", cookie);
  }
  return cookie;
}

function makeSocket(gameId, onEvent) {
  console.log(`env: ${import.meta.env.MODE}`);
  const socket = import.meta.env.DEV ? io("http://localhost:8080") : io();
  socket.on("connect", () => {
    const cookie = getCookie();
    socket.emit("join", {
      gameId,
      cookie,
    });
  });

  let _nEvents = 0;
  let _gameState = null;
  let _assignedPlayer = null;
  let _bots = {};
  const getStatus = () => _gameState?.status || "disconnected";
  const handleEvent = (type, event) => {
    switch (type) {
      case "game_state":
        import.meta.env.DEV && console.log("got game state", event);
        _gameState = event;
        break;
      case "player_assignment":
        _assignedPlayer = event.players[0];
        const name = localStorage.getItem("playerName");
        if (getStatus() === "init" && name) {
          socket &&
            socket.emit("change_name", {
              player: event.players[0],
              displayName: name,
            });
        }
        break;
      case "bot_list":
        _bots = event.bots || {};
        break;
      default:
        console.error("unknown event");
        return;
    }
    _nEvents += 1;
    onEvent(_nEvents);
  };
  socket.on("game_state", (e) => handleEvent("game_state", e));
  socket.on("player_assignment", (e) => handleEvent("player_assignment", e));
  socket.on("bot_list", (e) => handleEvent("bot_list", e));

  const getGameState = () => _gameState;
  const getAssignedPlayer = () => _assignedPlayer;
  const getBots = () => _bots;
  return { socket, handleEvent, getGameState, getAssignedPlayer, getStatus, getBots };
}

function Header({ onShowRules }) {
  return (
    <header className="game-header">
      <div className="game-header__title">
        <span className="game-header__title-icon">🐪</span>
        Up for a Camel
      </div>
      <div className="game-header__actions">
        <button className="btn" onClick={onShowRules}>
          How to play
        </button>
      </div>
    </header>
  );
}

const DIFFICULTIES = ["easy", "medium", "hard"];

function BotControls({ onAddBot }) {
  const [difficulty, setDifficulty] = useState("medium");
  return (
    <div className="bot-controls">
      <select
        className="bot-controls__select"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </option>
        ))}
      </select>
      <button
        className="btn btn--secondary"
        onClick={() => onAddBot(difficulty)}
      >
        + Add bot
      </button>
    </div>
  );
}

function Game(props) {
  const { id } = props;
  const setNEvents = useState(0)[1];
  const [showRules, setShowRules] = useState(false);
  const [legToast, setLegToast] = useState(null);
  const prevLegRef = useRef(0);
  const [s] = useState(() => {
    return makeSocket(id, (n) => {
      setNEvents(n);
    });
  });
  const { socket, getGameState, getAssignedPlayer, getStatus, getBots } = s;

  const emitEvent = (type, data) => {
    if (!getGameState()?.currentPlayer) {
      return;
    }
    socket.emit("event", {
      type,
      player: getGameState().currentPlayer,
      data,
    });
  };

  const isActive = (player) => {
    return getGameState()?.currentPlayer === (player + 1).toString();
  };

  const isLeader = () => {
    return getAssignedPlayer() === "1";
  };

  const placeBet = (camel) => {
    emitEvent("makeLegBet", { color: camelToColor(camel) });
  };

  const placeLongBet = (bet, camel) => {
    const kind = bet === "toWin" ? "long" : "short";
    const color = camelToColor(camel);
    emitEvent("makeRaceBet", { kind, color });
  };

  const placeCrowd = (position, direction) => {
    const desertTileIndex = position;
    const desertTileSide = direction === 1 ? "oasis" : "mirage";
    emitEvent("placeDesertTile", { desertTileIndex, desertTileSide });
  };

  const startGame = () => {
    socket.emit("start_game", { gameId: id });
  };

  const changeName = (player, displayName) => {
    localStorage.setItem("playerName", displayName);
    socket.emit("change_name", { player, displayName });
  };

  const removePlayer = (player) => {
    socket.emit("remove_player", { player });
  };

  const addBot = (difficulty) => {
    socket.emit("add_bot", { difficulty });
  };

  const removeBot = (player) => {
    socket.emit("remove_bot", { player });
  };

  const roll = () => {
    emitEvent("rollDice", {});
  };

  const isMyTurn =
    getStatus() === "inprogress" &&
    getAssignedPlayer() === getGameState().currentPlayer;

  const bots = getBots();

  // Detect leg transitions for toast
  const currentLegNum = getGameState()?.currentLegNum || 0;
  useEffect(() => {
    if (currentLegNum > prevLegRef.current) {
      const endedLeg = prevLegRef.current;
      const gs = getGameState();
      const results = getLegResults(gs);
      if (results[endedLeg]) {
        const r = results[endedLeg];
        setLegToast({ leg: endedLeg + 1, winner: r.winner, runnerUp: r.runnerUp });
      }
    }
    prevLegRef.current = currentLegNum;
  }, [currentLegNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- LOBBY ----
  if (getStatus() === "init") {
    const shareUrl = window.location.href;
    return (
      <>
        <Header onShowRules={() => setShowRules(true)} />
        {showRules && <Rules onClose={() => setShowRules(false)} />}
        <div className="lobby">
          <div className="lobby__card">
            <h2 className="lobby__subtitle">Waiting for players</h2>
            <div className="share-url">
              <span className="share-url__label">Send this link to friends:</span>
              <div className="share-url__row">
                <input className="share-url__input" readOnly value={shareUrl} onClick={(e) => e.target.select()} />
                <button className="btn btn--secondary share-url__copy" onClick={() => { navigator.clipboard.writeText(shareUrl); }}>
                  Copy
                </button>
              </div>
            </div>
            <div className="lobby__players">
              {getPlayers(getGameState()).map((p, i) => {
                const playerNum = (i + 1).toString();
                const isSelf = playerNum === getAssignedPlayer();
                const isBot = !!bots[playerNum];
                const dotStyle = {
                  backgroundColor: playerNumberToColor(i + 1),
                };
                return (
                  <div key={i} className="lobby__player">
                    <span className="lobby__player-dot" style={dotStyle} />
                    {isSelf ? (
                      <input
                        className="lobby__player-input"
                        type="text"
                        defaultValue={p.name}
                        autoFocus
                        onChange={(e) => {
                          const val = e.target.value;
                          localStorage.setItem("playerName", val);
                          changeName(i + 1, val);
                        }}
                      />
                    ) : (
                      <span className={`lobby__player-name${isBot ? " lobby__player-name--bot" : ""}`}>
                        {isBot ? "🤖 " : ""}{p.name}
                      </span>
                    )}
                    {!isSelf && isLeader() && (
                      <button
                        className="btn btn--danger"
                        onClick={() => isBot ? removeBot(playerNum) : removePlayer(i + 1)}
                      >
                        remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {isLeader() && (
              <>
                <BotControls onAddBot={addBot} />
                <button
                  className="btn btn--primary btn--large"
                  onClick={startGame}
                >
                  Start game
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ---- IN PROGRESS ----
  if (getStatus() === "inprogress") {
    const hasHistory = getGameState().currentLegNum > 0;
    const columnsClass = hasHistory
      ? "game-columns game-columns--with-history"
      : "game-columns";

    return (
      <>
        <Header onShowRules={() => setShowRules(true)} />
        {showRules && <Rules onClose={() => setShowRules(false)} />}
        <QuickStart />
        {legToast && (
          <LegToast
            key={legToast.leg}
            legNumber={legToast.leg}
            winner={legToast.winner}
            runnerUp={legToast.runnerUp}
            onDismiss={() => setLegToast(null)}
          />
        )}
        <div className="game-layout">
          {isMyTurn ? (
            <div className="game-turn-banner">
              <span className="game-turn-banner__text">It's your turn — pick one action</span>
              <div className="game-turn-banner__actions">
                <span className="action-hint">🎲 Roll</span>
                <span className="action-hint">🐪 Leg bet</span>
                <span className="action-hint">🏅 Race bet</span>
                <span className="action-hint">🌴 Desert tile</span>
              </div>
            </div>
          ) : (
            <div className="game-turn-banner game-turn-banner--waiting">
              <span className="game-turn-banner__text game-turn-banner__text--waiting">
                Waiting for {getCurrentPlayerName(getGameState()) || "opponent"}…
              </span>
            </div>
          )}

          <Track
            positions={getPositions(getGameState())}
            crowds={getCrowds(getGameState())}
            placeCrowd={placeCrowd}
          />

          <div className={columnsClass}>
            <div className="game-main">
              <div className="card">
                <h3 className="card__title">Leg bets</h3>
                <Bets
                  available={getAvailableBets(getGameState())}
                  onPlace={placeBet}
                />
              </div>

              <div className="card">
                <h3 className="card__title">Race bets</h3>
                <LongBets
                  toLose={getLongBets(getGameState()).toLose}
                  toWin={getLongBets(getGameState()).toWin}
                  available={getAvailableLongBets(
                    getGameState(),
                    getAssignedPlayer()
                  )}
                  onPlace={placeLongBet}
                />
              </div>

              <div className="card">
                <h3 className="card__title">Dice</h3>
                <Dice
                  rolled={getRolls(getGameState())}
                  unrolled={getUnrolledDice(getGameState())}
                  diceRemaining={getDiceRemaining(getGameState())}
                  onRoll={roll}
                />
              </div>

              <div className="card">
                <h3 className="card__title">Action log</h3>
                <ActionLog gameState={getGameState()} />
              </div>
            </div>

            <div className="card players-sidebar">
              <h3 className="card__title">Players</h3>
              {getPlayers(getGameState())
                .map((p, i) => ({ player: p, idx: i }))
                .sort((a, b) => b.player.money - a.player.money)
                .map(({ player: p, idx: i }) => (
                <Player
                  key={(i + 1).toString()}
                  number={i + 1}
                  player={p}
                  active={isActive(i)}
                  isBot={!!bots[(i + 1).toString()]}
                />
              ))}
            </div>

            {hasHistory && (
              <div className="card">
                <h3 className="card__title">Leg results</h3>
                <LegResults results={getLegResults(getGameState())} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ---- GAME OVER ----
  if (getStatus() === "ended") {
    const players = getPlayers(getGameState())
      .map((p, i) => ({ ...p, i }))
      .sort((p, q) => q.money - p.money);

    return (
      <>
        <Header onShowRules={() => setShowRules(true)} />
        {showRules && <Rules onClose={() => setShowRules(false)} />}
        <div className="game-over">
          <h1 className="game-over__title">Race complete!</h1>
          <p className="game-over__subtitle">
            {players[0]?.name} wins with {players[0]?.money} coins
          </p>
          <p className="game-over__explainer">
            Final scores = starting coins + leg bet payouts + race bet payouts + roll bonuses + desert tile bonuses.
          </p>

          <div className="game-over__players">
            {players.map((p, rank) => (
              <div key={p.i} className="game-over__player">
                <span className="game-over__rank">{rank + 1}</span>
                <span
                  className="game-over__player-dot"
                  style={{ backgroundColor: playerNumberToColor(p.i + 1) }}
                />
                <span className="game-over__player-name">{p.name}</span>
                <span className="game-over__player-money">💰 {p.money}</span>
              </div>
            ))}
          </div>

          <div className="game-over__track">
            <Track
              positions={getPositions(getGameState())}
              finishers={getFinishers(getGameState())}
              crowds={getCrowds(getGameState())}
              placeCrowd={placeCrowd}
            />
          </div>

          <FinalLongBets
            toLose={getLongBets(getGameState()).toLose}
            toWin={getLongBets(getGameState()).toWin}
          />
        </div>
      </>
    );
  }

  return <div className="connecting-screen">Connecting...</div>;
}

function extractGameId(input) {
  const trimmed = input.trim();
  // If it looks like a URL, extract the game param
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("game");
    if (id) return id;
  } catch {
    // not a URL, treat as raw game ID
  }
  return trimmed;
}

function Home() {
  const [mode, setMode] = useState(null); // null | "join"
  const [joinInput, setJoinInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const createGame = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/create-game");
      if (!res.ok) throw new Error("Failed to create game");
      const { gameId } = await res.json();
      window.location.search = `?game=${gameId}`;
    } catch {
      setError("Could not create game. Is the server running?");
      setCreating(false);
    }
  };

  const joinGame = () => {
    const id = extractGameId(joinInput);
    if (!id) return;
    window.location.search = `?game=${id}`;
  };

  if (creating) {
    return <div className="connecting-screen">Creating game...</div>;
  }

  return (
    <>
      <Header onShowRules={() => {}} />
      <div className="lobby">
        <div className="lobby__card home-card">
          <span className="home-card__icon">🐪</span>
          <h2 className="home-card__title">Up for a Camel</h2>
          <p className="home-card__subtitle">A camel racing betting game</p>

          {error && <p className="home-card__error">{error}</p>}

          {mode === null && (
            <div className="home-card__actions">
              <button
                className="btn btn--primary btn--large"
                onClick={createGame}
              >
                Create game
              </button>
              <button
                className="btn btn--large"
                onClick={() => setMode("join")}
              >
                Join game
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="home-card__join">
              <label className="home-card__join-label">
                Paste a link or type the game words
              </label>
              <div className="home-card__join-row">
                <input
                  className="home-card__join-input"
                  type="text"
                  placeholder="e.g. swift-golden-penguin"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinGame()}
                  autoFocus
                />
              </div>
              <div className="home-card__join-actions">
                <button
                  className="btn btn--primary"
                  onClick={joinGame}
                  disabled={!joinInput.trim()}
                >
                  Join
                </button>
                <button
                  className="btn"
                  onClick={() => { setMode(null); setJoinInput(""); }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function App() {
  const currentGame = new URL(window.location.href).searchParams.get("game");
  if (!currentGame) {
    return <Home />;
  } else {
    return <Game id={currentGame} />;
  }
}

export default App;
