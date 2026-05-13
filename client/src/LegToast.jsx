import React, { useState, useEffect } from "react";
import { camelToName, camelToDisplayColor } from "./helpers";

export function LegToast({ legNumber, winner, runnerUp, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss && onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const winnerName = camelToName(winner);
  const runnerUpName = camelToName(runnerUp);

  return (
    <div className="leg-toast" onClick={() => { setVisible(false); onDismiss && onDismiss(); }}>
      <div className="leg-toast__content">
        <span className="leg-toast__title">Leg {legNumber} ended!</span>
        <span className="leg-toast__detail">
          <span className="leg-toast__camel" style={{ backgroundColor: camelToDisplayColor(winner) }} />
          {winnerName} won
          {runnerUp && (
            <>
              , <span className="leg-toast__camel" style={{ backgroundColor: camelToDisplayColor(runnerUp) }} />
              {runnerUpName} 2nd
            </>
          )}
          . Bets scored.
        </span>
      </div>
    </div>
  );
}
