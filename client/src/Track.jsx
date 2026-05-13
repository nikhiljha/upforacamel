import React, { useState, useRef, useLayoutEffect } from "react";
import { playerNumberToColor, camelToDisplayColor, camelToName } from "./helpers";
import { CamelSvg } from "./CamelSvg";
import { useModal } from "./Modal";
import { HelpPopover } from "./HelpPopover";

// X offsets (px) for stacking transitions at size=60, keyed by top+bottom orientation.
// Normal camels are CSS-flipped (scaleX(-1)) so their offsets are negated from tuned values;
// crazy camels render unflipped (SVG natural direction).
const STACK_X = { nn: 6, nc: 43, cn: -42, cc: -6 };

function stackTransitionX(topCamel, bottomCamel) {
  const isCrazy = (c) => c === -1 || c === -2;
  const t = isCrazy(topCamel) ? "c" : "n";
  const b = isCrazy(bottomCamel) ? "c" : "n";
  return STACK_X[t + b];
}

function CamelStack({ camels }) {
  const [hovered, setHovered] = useState(false);
  const isCrazy = (c) => c === -1 || c === -2;

  let cumulativeX = 0;
  const tokens = camels.map((c, i) => {
    if (i > 0) cumulativeX += stackTransitionX(camels[i - 1], c);
    const x = cumulativeX;
    return (
      <div
        key={c}
        data-camel={c}
        className={`camel-token${isCrazy(c) ? " camel-token--crazy" : ""}`}
        title={`${camelToName(c)}${isCrazy(c) ? " (moves backward)" : ""}`}
        style={x ? { marginLeft: x } : undefined}
      >
        <CamelSvg
          color={camelToDisplayColor(c)}
          size={60}
          className="camel-token__svg"
        />
      </div>
    );
  });

  if (camels.length <= 1) return <>{tokens}</>;

  const stackLabel = [...camels].reverse().map((c) => camelToName(c)).join(" → ");

  return (
    <div
      className="camel-stack"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tokens}
      {hovered && (
        <div className="camel-stack__tooltip">
          <span className="camel-stack__tooltip-title">Stack (top → bottom)</span>
          <span>{stackLabel}</span>
          <span className="camel-stack__tooltip-hint">Bottom carries top when moving</span>
        </div>
      )}
    </div>
  );
}

function TrackTile(props) {
  const { camels, finish, spaceNumber } = props;

  const cls = `track-space${finish ? " track-space--finish" : ""}`;
  return (
    <td className={cls}>
      <div className="track-space__cell">
        <CamelStack camels={camels} />
        {!finish && spaceNumber != null && (
          <span className="track-space__number">{spaceNumber}</span>
        )}
      </div>
    </td>
  );
}

function Crowd(props) {
  const { crowd, onPlace, spaceNumber } = props;
  const [renderModal, showModal] = useModal();
  const { player, direction } = crowd || {};
  const glyph = direction > 0 ? "🌴" : "💀";

  const innerBg = crowd ? playerNumberToColor(player) : "transparent";
  const placedClass = crowd ? " desert-tile__inner--placed" : "";

  const hintText = crowd
    ? `${direction > 0 ? "Oasis" : "Mirage"} (${direction > 0 ? "+1 forward" : "−1 backward"}) — placed by Player ${player}`
    : `Place a desert tile on space ${spaceNumber}`;

  return (
    <td className="desert-tile" onClick={showModal} title={hintText}>
      {renderModal(
        <div className="desert-tile__chooser">
          <div
            className="desert-tile__option"
            onClick={() => onPlace(-1)}
          >
            <span className="desert-tile__option-icon">💀</span>
            <span className="desert-tile__option-label">Mirage</span>
            <span className="desert-tile__option-desc">−1, lands under</span>
          </div>
          <div
            className="desert-tile__option"
            onClick={() => onPlace(1)}
          >
            <span className="desert-tile__option-icon">🌴</span>
            <span className="desert-tile__option-label">Oasis</span>
            <span className="desert-tile__option-desc">+1, lands on top</span>
          </div>
        </div>
      )}
      <div
        className={`desert-tile__inner${placedClass}`}
        style={{ backgroundColor: crowd ? innerBg : undefined }}
      >
        {crowd ? glyph : ""}
      </div>
    </td>
  );
}

/** Snapshot bounding rects of all [data-camel] elements within a container. */
function snapshotCamels(container) {
  const rects = {};
  if (!container) return rects;
  container.querySelectorAll("[data-camel]").forEach((el) => {
    const id = el.getAttribute("data-camel");
    const r = el.getBoundingClientRect();
    rects[id] = { x: r.left, y: r.top };
  });
  return rects;
}

const FLIP_DURATION = 400; // ms

export function Track(props) {
  const { positions, crowds, placeCrowd, finishers } = props;
  const wrapperRef = useRef(null);
  const prevRectsRef = useRef({});

  // FLIP animation: useLayoutEffect cleanup captures positions BEFORE the next
  // DOM update; the effect body runs AFTER, compares, and applies the animation.
  useLayoutEffect(() => {
    // This runs AFTER the DOM has been updated.
    // Compare new positions to previous snapshot and apply FLIP transforms.
    const container = wrapperRef.current;
    if (!container) return;
    const prevRects = prevRectsRef.current;
    const newRects = snapshotCamels(container);

    container.querySelectorAll("[data-camel]").forEach((el) => {
      const id = el.getAttribute("data-camel");
      const prev = prevRects[id];
      const next = newRects[id];
      if (!prev || !next) return;
      const dx = prev.x - next.x;
      const dy = prev.y - next.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      // Invert: move element to its old position
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      // Play: animate to new position on next frame
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        el.style.transform = "";
      });
    });

    // Capture snapshot for the NEXT update (runs as cleanup before next effect)
    const currentContainer = container;
    return () => {
      prevRectsRef.current = snapshotCamels(currentContainer);
    };
  });

  const renderedTiles = positions.map((p, i) => (
    <TrackTile key={i} camels={p} spaceNumber={i + 1} />
  ));
  if (finishers && finishers.length) {
    renderedTiles.push(
      <TrackTile key={positions.length} camels={finishers} finish={true} />
    );
  }
  const renderedCrowds = crowds.map((c, i) => (
    <Crowd
      key={i}
      crowd={c}
      spaceNumber={i + 1}
      onPlace={(direction) => placeCrowd(i, direction)}
    />
  ));
  return (
    <div className="track-section">
      <div className="track-wrapper" ref={wrapperRef}>
        <table className="track">
          <tbody>
            <tr>{renderedTiles}</tr>
            <tr>{renderedCrowds}</tr>
          </tbody>
        </table>
        <div className="track-hints">
          <span className="track-hint" title="Stacked camels: bottom carries top when it moves">📚 Bottom carries top</span>
          <span className="track-hint" title="Black and white camels move backward (counter-clockwise)">⬅ Crazy camels run backward</span>
          <HelpPopover>
            <p><strong>Stacking:</strong> When a camel lands on an occupied space, it goes on top. When a camel moves, it carries every camel above it.</p>
            <p><strong>Crazy camels</strong> (black & white) move backward and can carry racing camels with them.</p>
            <p><strong>Desert tiles:</strong> 🌴 Oasis pushes a camel +1 forward (on top). 💀 Mirage pushes −1 backward (under the stack). You earn +1 coin each time a camel lands on your tile.</p>
          </HelpPopover>
        </div>
      </div>
    </div>
  );
}
