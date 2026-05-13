import React, { useState, useRef, useEffect } from "react";

export function HelpPopover({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span className="help-popover-wrap" ref={ref}>
      <button
        className="help-icon"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="help-popover" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </span>
  );
}
