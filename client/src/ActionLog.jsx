import React, { useEffect, useRef } from "react";
import { camelToNumber, camelToName, camelToDisplayColor } from "./helpers";

/**
 * Build a human-readable action log from gameState.
 * Walks gameState.events[] and enriches roll entries with dice results
 * from the rolledDice arrays across all legs.
 */
export function getActionLog(gameState) {
  if (!gameState || !gameState.events) return [];

  const playerName = (id) =>
    gameState.players?.[id]?.displayName || `Player ${id}`;

  const entries = [];

  // First, collect all rolls across all legs (in order)
  const allRolls = [];
  for (let legNum = 0; legNum <= gameState.currentLegNum; legNum++) {
    const leg = gameState.legs[legNum];
    if (!leg?.rolledDice) continue;
    for (const rd of leg.rolledDice) {
      allRolls.push(rd);
    }
  }

  // Walk events and pair roll events with roll data
  let rollIdx = 0;
  for (const ev of gameState.events) {
    const name = playerName(ev.player);
    switch (ev.type) {
      case "rollDice": {
        const rollData = allRolls[rollIdx++];
        if (rollData) {
          const camel = camelToNumber(rollData.color);
          const isCrazy = camel === -1 || camel === -2;
          entries.push({
            type: "roll",
            player: name,
            camel,
            number: rollData.number,
            isCrazy,
          });
        }
        break;
      }
      case "makeLegBet": {
        const camel = camelToNumber(ev.data?.color);
        entries.push({ type: "legBet", player: name, camel });
        break;
      }
      case "makeRaceBet": {
        const kind = ev.data?.kind === "long" ? "win" : "lose";
        entries.push({ type: "raceBet", player: name, kind });
        break;
      }
      case "placeDesertTile": {
        const side = ev.data?.desertTileSide === "oasis" ? "oasis" : "mirage";
        const pos = ev.data?.desertTileIndex + 1;
        entries.push({ type: "desert", player: name, side, pos });
        break;
      }
      default:
        break;
    }
  }

  return entries;
}

function CamelDot({ camel }) {
  return (
    <span
      className="action-log__dot"
      style={{ backgroundColor: camelToDisplayColor(camel) }}
      title={camelToName(camel)}
    />
  );
}

function LogEntry({ entry, isNew }) {
  const cls = `action-log__entry action-log__entry--${entry.type}${isNew ? " action-log__entry--new" : ""}`;
  switch (entry.type) {
    case "roll":
      return (
        <div className={cls}>
          <span className="action-log__icon">🎲</span>
          <span className="action-log__player">{entry.player}</span>
          <span className="action-log__detail">
            <CamelDot camel={entry.camel} />
            <span className="action-log__roll-num">{entry.number}</span>
            {entry.isCrazy && <span className="action-log__crazy">←</span>}
          </span>
        </div>
      );
    case "legBet":
      return (
        <div className={cls}>
          <span className="action-log__icon">🎫</span>
          <span className="action-log__player">{entry.player}</span>
          <span className="action-log__detail">
            bet <CamelDot camel={entry.camel} />
          </span>
        </div>
      );
    case "raceBet":
      return (
        <div className={cls}>
          <span className="action-log__icon">🏅</span>
          <span className="action-log__player">{entry.player}</span>
          <span className="action-log__detail">
            race {entry.kind}
          </span>
        </div>
      );
    case "desert":
      return (
        <div className={cls}>
          <span className="action-log__icon">{entry.side === "oasis" ? "🌴" : "💀"}</span>
          <span className="action-log__player">{entry.player}</span>
          <span className="action-log__detail">
            space {entry.pos}
          </span>
        </div>
      );
    default:
      return null;
  }
}

export function ActionLog({ gameState }) {
  const entries = getActionLog(gameState);
  const scrollRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current && entries.length > prevLenRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLenRef.current = entries.length;
  }, [entries.length]);

  if (!entries.length) return null;

  const newStart = Math.max(0, entries.length - 1);

  return (
    <div className="action-log" ref={scrollRef}>
      {entries.map((e, i) => (
        <LogEntry key={i} entry={e} isNew={i >= newStart} />
      ))}
    </div>
  );
}
