if (!("getOrInsertComputed" in Map.prototype)) {
  (Map.prototype as any).getOrInsertComputed = function <K, V>(
    key: K,
    computeFn: (key: K) => V
  ): V {
    if (!this.has(key)) {
      this.set(key, computeFn(key));
    }
    return this.get(key);
  };
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
