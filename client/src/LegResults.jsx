import React from "react";
import { Bet } from "./Bets";
import { camelToNumber } from "./helpers";

function PlayerLegResult({ player, children }) {
  return (
    <tr>
      {children}
      <th scope="row" style={{ fontWeight: 500, textAlign: "left", padding: "6px 10px" }}>
        {player.name}
      </th>
      <td>{player.totalScore}</td>
      <td>{player.rollPoints}</td>
      <td>{player.betPoints}</td>
      <td>{player.desertTilePoints}</td>
      <td>
        <div className="leg-results__bets">
          {player.bets?.map((bet, idx) => (
            <Bet key={idx} camel={camelToNumber(bet.color)} bet={bet.payout} small />
          ))}
        </div>
      </td>
    </tr>
  );
}

function LegResult({ result }) {
  const firstPlayer = result.players[0];
  const restPlayers = result.players.slice(1);
  return (
    <tbody>
      <PlayerLegResult player={firstPlayer}>
        <th className="leg-results__leg-num" scope="rowgroup">
          {result.legNumber}.
        </th>
      </PlayerLegResult>
      {restPlayers?.map((player) => (
        <PlayerLegResult key={player.playerId} player={player}>
          <th />
        </PlayerLegResult>
      ))}
    </tbody>
  );
}

export function LegResults({ results }) {
  return (
    <table className="leg-results">
      <thead>
        <tr>
          <th />
          <th />
          <th>💰</th>
          <th>🎲</th>
          <th>🐪</th>
          <th>🌴</th>
        </tr>
      </thead>
      {results?.map((leg) => (
        <LegResult key={leg.legNumber} result={leg} />
      ))}
    </table>
  );
}
