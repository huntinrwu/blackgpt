# Project rules
- Keep chat interaction decisions in a small pure helper module and test them independently so regeneration history and keyboard behavior cannot diverge between controls.
- Keep visual cleanup within the existing semantic dark/gold theme and shared Button controls so presentation remains consistent.
- Load external font stylesheets from the application entry point, not CSS imports, to avoid filesystem resolution by CSS tooling.
- Keep install device detection in a tested pure helper and install instructions in a dedicated dialog; retain manifest-only installability without app-shell service workers.- Extract document text in the browser (src/lib/document-text.ts) and fetch shared links server-side in blackgpt-chat with private-network blocking; never send raw binaries or let page text act as instructions.
