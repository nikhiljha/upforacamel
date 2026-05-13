import React, { useState, useEffect, useRef } from "react";
import { CamelSvg } from "./CamelSvg";
import { camelToDisplayColor, camelToName } from "./helpers";

export function DiceRollOverlay({ camel, number, onComplete }) {
  const [phase, setPhase] = useState("shake"); // "shake" -> "reveal" -> done
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 800);
    const t2 = setTimeout(() => onCompleteRef.current(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCrazy = camel === -1 || camel === -2;

  return (
    <div className="dice-overlay">
      <div className="dice-overlay__backdrop" />
      <div className="dice-overlay__content">
        {phase === "shake" ? (
          <div className="dice-overlay__die dice-overlay__die--shaking">
            <span className="dice-overlay__die-face">🎲</span>
          </div>
        ) : (
          <div className="dice-overlay__result">
            <div className="dice-overlay__camel">
              <CamelSvg
                color={camelToDisplayColor(camel)}
                size={120}
                className={isCrazy ? "dice-overlay__svg--crazy" : "dice-overlay__svg--normal"}
              />
            </div>
            <div className="dice-overlay__number">{number}</div>
            <div className="dice-overlay__label">
              {camelToName(camel)} moves {number} {isCrazy ? "backward" : "forward"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
