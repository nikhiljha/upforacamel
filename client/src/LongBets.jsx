import React from "react";

import { playerNumberToColor, camelToDisplayColor, camelToName } from "./helpers";
import { useModal } from "./Modal";
import { HelpPopover } from "./HelpPopover";

function LongBet(props) {
  const { camel, player, onClick } = props;

  let bg;
  if (camel && player) {
    bg = `linear-gradient(0deg, ${camelToDisplayColor(camel)} 0% 66%, ${playerNumberToColor(player)} 66%)`;
  } else if (camel) {
    bg = camelToDisplayColor(camel);
  } else if (player) {
    bg = playerNumberToColor(player);
  }

  return (
    <div
      className="long-bet"
      style={{ background: bg }}
      onClick={onClick}
    >
      &nbsp;
    </div>
  );
}

function LongBetButton(props) {
  const { available, onPlace, label } = props;
  const [renderModal, showLongBetModal] = useModal();
  const renderedAvailableLongBets = available.map((c) => (
    <div
      key={c}
      className="long-bet-chooser__item"
      style={{ backgroundColor: camelToDisplayColor(c) }}
      onClick={() => onPlace(c)}
      title={`Bet on ${camelToName(c)}`}
    >
      &nbsp;
    </div>
  ));
  return (
    <div className="long-bet long-bet--add" onClick={showLongBetModal} title={label}>
      {renderModal(
        <div className="long-bet-chooser">{renderedAvailableLongBets}</div>
      )}
      {props.children}
    </div>
  );
}

export function FinalLongBets(props) {
  const { toWin, toLose } = props;
  const renderedToWin = toWin.map(({ player, camel }, i) => (
    <LongBet key={i} player={player} camel={camel} />
  ));
  const renderedToLose = toLose.map(({ player, camel }, i) => (
    <LongBet key={i} player={player} camel={camel} />
  ));
  return (
    <div className="final-long-bets">
      <div className="final-long-bets__section">
        <div className="final-long-bets__label">Winner bets</div>
        <div className="final-long-bets__row">{renderedToWin}</div>
      </div>
      <div className="final-long-bets__section">
        <div className="final-long-bets__label">Loser bets</div>
        <div className="final-long-bets__row">{renderedToLose}</div>
      </div>
    </div>
  );
}

export function LongBets(props) {
  const { toWin, toLose, available, onPlace } = props;
  return (
    <div className="long-bet-section">
      <div className="long-bet-row">
        <span className="long-bet-row__label" title="Predict the overall race winner">🏅 Winner</span>
        {toWin.map(({ player: p }, i) => (
          <LongBet key={i} player={p} />
        ))}
        <LongBetButton
          available={available}
          onPlace={(camel) => onPlace("toWin", camel)}
          label="Bet on overall winner"
        >
          +
        </LongBetButton>
      </div>
      <div className="long-bet-row">
        <span className="long-bet-row__label" title="Predict the overall race loser">🐌 Loser</span>
        {toLose.map(({ player: p }, i) => (
          <LongBet key={i} player={p} />
        ))}
        <LongBetButton
          available={available}
          onPlace={(camel) => onPlace("toLose", camel)}
          label="Bet on overall loser"
        >
          +
        </LongBetButton>
      </div>
      <div className="long-bet-payout-hint">
        Pays 8 / 5 / 3 / 2 / 1 in order placed. Wrong = −1.
        <HelpPopover>
          <p>Predict the <strong>overall race winner or loser</strong> (the first camel to cross space 16, or the last-place camel).</p>
          <p><strong>Payouts:</strong> Correct guesses pay 8, 5, 3, 2, then 1 coin — earliest correct bet gets the most. Wrong = −1 coin.</p>
          <p>You may only bet each camel color once per side (winner/loser). Bets are secret until the race ends.</p>
        </HelpPopover>
      </div>
    </div>
  );
}
