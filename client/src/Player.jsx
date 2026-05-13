import React, { useState } from "react";

import { playerNumberToColor } from "./helpers";
import { Bet } from "./Bets";

export function PlayerName(props) {
  const { editable, active, player, number, changeName } = props;
  let [name, setName] = useState(player.name);
  let [timeoutId, setTimeoutId] = useState();
  let [pendingUpdate, setPendingUpdate] = useState(false);
  const handleNameChange = (e) => {
    setPendingUpdate(true);
    const name = e.target.value;
    setName(name);
    if (timeoutId) clearTimeout(timeoutId);
    setTimeoutId(
      setTimeout(() => {
        changeName(number, name);
        pendingUpdate = false;
      }, 300)
    );
  };

  const dotStyle = { backgroundColor: playerNumberToColor(number) };

  return editable ? (
    <div className="lobby__player">
      <span className="lobby__player-dot" style={dotStyle} />
      <input
        className="lobby__player-input"
        type="text"
        value={pendingUpdate ? name : player.name}
        onChange={handleNameChange}
        autoFocus
      />
    </div>
  ) : (
    <div className="lobby__player">
      <span className="lobby__player-dot" style={dotStyle} />
      <span className={`lobby__player-name${active ? " player-card__name--active" : ""}`}>
        {player.name}
      </span>
    </div>
  );
}

export function Player(props) {
  const { number, player, active, isBot } = props;
  const renderedBets = player.bets.map((b, i) => (
    <Bet key={i} camel={b.camel} bet={b.payout} small />
  ));

  const dotStyle = { backgroundColor: playerNumberToColor(number) };
  const cardClass = `player-card${active ? " player-card--active" : ""}`;

  return (
    <div className={cardClass}>
      <div className="player-card__header">
        <span className="player-card__dot" style={dotStyle} />
        <span className="player-card__name">
          {isBot ? "🤖 " : ""}{player.name}
        </span>
        {active && <span className="player-card__turn">TURN</span>}
        <span className="player-card__money">
          💰 {player.money}
        </span>
      </div>
      {renderedBets.length > 0 && (
        <div className="player-card__bets">{renderedBets}</div>
      )}
    </div>
  );
}
