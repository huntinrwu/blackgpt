import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
