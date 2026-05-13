import React from "react";

import { camelToDisplayColor, camelToTextColor, camelToName } from "./helpers";
import { HelpPopover } from "./HelpPopover";

export function Bet(props) {
  const { camel, bet, onPlace, small } = props;

  const sizeClass = small ? " bet-card--small" : "";
  if (!bet) {
    return <div className={`bet-card bet-card--empty${sizeClass}`}>&nbsp;</div>;
  }

  const style = {
    color: camelToTextColor(camel),
    backgroundColor: camelToDisplayColor(camel),
  };
  const clickClass = onPlace ? " bet-card--clickable" : "";
  const name = camelToName(camel);

  return (
    <div
      className={`bet-card${clickClass}${sizeClass}`}
      style={style}
      onClick={onPlace}
      title={onPlace ? `Bet on ${name} to win this leg — pays ${bet} if ${name} wins, +1 if 2nd, −1 otherwise` : undefined}
    >
      {bet}
    </div>
  );
}

export function Bets(props) {
  const { available, onPlace } = props;
  const renderedBets = available.map((a, i) => (
    <Bet key={i} camel={i + 1} bet={a} onPlace={() => onPlace(i + 1)} />
  ));
  return (
    <div className="bets-section">
      <div className="bet-row">{renderedBets}</div>
      <div className="bets-payout-hint">
        First bet pays <strong>5</strong>, then <strong>3</strong>, then <strong>2</strong>
        <HelpPopover>
          <p>Bet on which camel will be <strong>leading</strong> when the current leg ends (all 5 dice rolled).</p>
          <p><strong>Payouts:</strong> First correct bet earns 5 coins, second earns 3, third earns 2. If your camel finishes 2nd, you get +1 coin. Any other result costs −1 coin.</p>
          <p><strong>Tip:</strong> Bet early on a camel you think will win — later bets pay less!</p>
        </HelpPopover>
      </div>
    </div>
  );
}
