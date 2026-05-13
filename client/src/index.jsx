import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

if (import.meta.env.DEV) {
  import("react-grab");
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
