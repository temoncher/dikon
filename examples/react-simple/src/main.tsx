import { createRoot } from "react-dom/client";

import { App, createDi } from "./App";

import "./style.css";

function main() {
  const root = document.getElementById("root");

  if (root === null) {
    throw new Error("Root element #root not found");
  }

  const di = createDi().build({
    appConfig: {
      title: "Simple Dikon Notes",
    },
  });

  createRoot(root).render(<App di={di} />);
}

main();
