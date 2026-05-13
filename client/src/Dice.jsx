import React from "react";

import { camelToDisplayColor, camelToTextColor, camelToName } from "./helpers";
import { CamelSvg } from "./CamelSvg";
import { HelpPopover } from "./HelpPopover";

function Die(props) {
  const { camel, roll, blank, unrolled } = props;

  if (blank) {
    return (
      <div className="die die--roll-btn" onClick={props.onClick} title="Roll the pyramid — reveals 1 die, moves that camel 1–3 spaces. +1 coin.">
        🎲 Roll
      </div>
    );
  }

  if (unrolled) {
    return (
      <div className="die die--unrolled" title={`${camelToName(camel)} — not yet rolled`}>
        <CamelSvg color={camelToDisplayColor(camel)} size={24} />
      </div>
    );
  }

  const style = {
    color: camelToTextColor(parseInt(camel)),
    backgroundColor: camelToDisplayColor(parseInt(camel)),
  };

  return (
    <div className="die" style={style} title={`${camelToName(parseInt(camel))} rolled ${roll}`}>
      {roll}
    </div>
  );
}

export function Dice(props) {
  const { rolled, unrolled = [], diceRemaining = 6, onRoll } = props;
  const totalDice = 6;
  const diceRolled = totalDice - diceRemaining;
  const isLastRoll = diceRemaining === 2;

  const renderedRolled = rolled.map(({ camel, number }) => (
    <Die key={camel} camel={camel} roll={number} />
  ));

  const renderedUnrolled = unrolled.map((camel) => (
    <Die key={`u${camel}`} camel={camel} unrolled />
  ));

  return (
    <div className="dice-section">
      <div className="dice-row">
        {renderedRolled}
        <Die blank={true} onClick={onRoll} />
      </div>
      {unrolled.length > 0 && (
        <div className="dice-remaining">
          <span className="dice-remaining__label">Remaining:</span>
          <div className="dice-remaining__tokens">
            {renderedUnrolled}
          </div>
        </div>
      )}
      <div className="dice-progress">
        <span className="dice-progress__text">
          {diceRolled}/{totalDice} dice rolled
          {isLastRoll && <span className="dice-progress__warning"> — leg ends on next roll!</span>}
        </span>
        <HelpPopover>
          <p>Reveal a die from the pyramid — that camel moves 1–3 spaces forward. You earn <strong>+1 coin</strong> per roll at leg end.</p>
          <p>The leg ends when 5 of 6 dice are rolled (5 colored + 1 black/white crazy die). Then leg bets are scored and dice reset.</p>
        </HelpPopover>
      </div>
    </div>
  );
}
