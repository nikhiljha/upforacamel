import React, { useState } from "react";

const STORAGE_KEY = "camelUpQuickStartSeen";

export function QuickStart() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="quickstart-overlay" onClick={dismiss}>
      <div className="quickstart" onClick={(e) => e.stopPropagation()}>
        <h3 className="quickstart__title">🐪 Welcome to Up for a Camel!</h3>
        <p className="quickstart__text">
          <strong>Goal:</strong> Earn the most coins by betting on camel races.
          Camels stack on each other — the bottom carries the top!
        </p>
        <p className="quickstart__text">
          <strong>Each turn,</strong> pick one action: roll a die (moves a camel 1–3 spaces),
          place a leg bet (predict who wins this leg), make a race bet (predict overall winner/loser),
          or place a desert tile (affect camel movement).
        </p>
        <p className="quickstart__text">
          <strong>Legs vs Race:</strong> A leg ends when 5 of 6 dice are rolled — leg bets are scored.
          The race ends when a camel crosses space 16 — race bets and final scores settle.
        </p>
        <button className="btn quickstart__btn" onClick={dismiss}>
          Got it — let's play!
        </button>
      </div>
    </div>
  );
}
