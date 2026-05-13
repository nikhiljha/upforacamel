import React from "react";

export function Rules({ onClose }) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-modal__header">
          <h2 className="rules-modal__title">How to Play</h2>
          <button className="rules-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">🏜️ Overview</h3>
          <p className="rules-section__text">
            <strong>Up for a Camel</strong> is a game of luck and cunning bets. Five
            colored camels race around a 16-space track, and you wager on which
            will win each leg and the overall race. The player with the most
            coins at the end wins!
          </p>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">🔄 Game structure</h3>
          <p className="rules-section__text">
            The game is divided into <strong>legs</strong>. A leg ends once all
            five colored dice have been rolled. The overall race ends when any
            camel crosses or reaches space 16.
          </p>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">🎯 On your turn</h3>
          <p className="rules-section__text">
            Choose <strong>exactly one</strong> of these actions:
          </p>
          <ul className="rules-section__list">
            <li data-icon="🎲">
              <strong>Roll the dice</strong> — A random die is drawn and rolled
              (1–3). The matching camel moves forward that many spaces. You earn{" "}
              <strong>1 coin</strong> for rolling.
            </li>
            <li data-icon="🐪">
              <strong>Place a leg bet</strong> — Bet on which camel will be
              leading when the current leg ends. The earlier you bet on the
              winner, the more you earn: <strong>5, 3,</strong> then{" "}
              <strong>2</strong> coins. Betting on the 2nd-place camel pays{" "}
              <strong>1</strong> coin. A wrong bet costs you{" "}
              <strong>1 coin</strong>.
            </li>
            <li data-icon="🏅">
              <strong>Place a race bet</strong> — Bet on the overall race winner
              or loser. Correct predictions pay <strong>8, 5, 3, 2,</strong>{" "}
              then <strong>1</strong> coin (in order placed). Wrong bets cost{" "}
              <strong>1 coin</strong>. You may only bet each camel color once.
            </li>
            <li data-icon="🌴">
              <strong>Place a desert tile</strong> — Put an <em>oasis</em> (🌴,
              +1 space) or <em>mirage</em> (💀, −1 space) on the track. Every
              time a camel lands on your tile, you earn <strong>1 coin</strong>.
              Tiles cannot be placed on space 1, on occupied spaces, or adjacent
              to another player's tile.
            </li>
          </ul>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">📚 Camel stacking</h3>
          <p className="rules-section__text">
            When a camel lands on a space with other camels, it goes{" "}
            <strong>on top</strong> of the stack. When a camel moves, it carries
            every camel stacked above it. The camel on top of a stack is
            considered to be <strong>in the lead</strong> for that space.
          </p>
          <div className="rules-tip">
            <strong>Tip:</strong> Stacking is the key strategic twist! A
            trailing camel that lands on a leading stack will leapfrog to the
            top, instantly taking the lead.
          </div>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">🌑 Crazy camels</h3>
          <p className="rules-section__text">
            The <strong>black</strong> and <strong>white</strong> camels are wild
            — they move <em>backwards</em>. They start near the end of the
            track and race in the opposite direction. They can still carry other
            camels and create chaos! Crazy camels cannot be bet on for leg bets,
            but they shake up the race in unpredictable ways.
          </p>
        </div>

        <div className="rules-section">
          <h3 className="rules-section__title">🏁 Scoring</h3>
          <ul className="rules-section__list">
            <li data-icon="📍">
              <strong>End of each leg:</strong> Leg bets are scored. Dice roll
              earnings and desert tile earnings are tallied. All desert tiles are
              removed and dice are returned.
            </li>
            <li data-icon="🏆">
              <strong>End of the race:</strong> When a camel finishes, the final
              leg is scored, then overall race winner/loser bets are scored. The
              player with the most coins wins!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
