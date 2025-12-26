# Jentile

Lightweight web application for interactive 3D model viewing and exploration.

## Overview

Jentile is a simple, client-side 3D viewer built with Three.js, ideal for:

- Virtual museum exhibitions: allowing users to interactively explore historical artifacts, furniture, or architectural elements (like [Lo Studiolo Malatestiano](https://www.architettoitaliano.com/bresciamalatestiana/lostudiolomalatestiano/jentile.html)) from any device.
- Online product configurators: showcasing customizable items (e.g., furniture, accessories) with clickable parts that load variants seamlessly without page reloads.
- Educational tools: enabling students to examine 3D reconstructions of cultural heritage objects, with hover tooltips providing context and external links.
- Digital catalogs or portfolios: presenting 3D models with descriptions, prices, and direct links to external resources or e-commerce sites.

It delivers a smooth, immersive experience with hover highlights, informative tooltips, and fluid navigation between models.

## Features

- Support for local 3D models (GLB format)
- Interactive hover effects and clickable objects
- Seamless in-page model switching (no full page reload)
- Easy configuration via JSON files
- Responsive design with orbit controls

## Repository structure

- `site/jentile.html` — main application page
- `site/script.js` — client-side logic
- `site/style.css` — styling
- `site/config.json` — global text and settings
- `site/3Dobjects/menulist.json` — list of available 3D models

## Requirements

- A modern browser with WebGL support
- Files must be served via HTTP(S)

## Quick start

After configuring your config.json, run a local server from the project root (example with Python):

```bash
python -m http.server 8000
# then open http://localhost:8000/site/jentile.html
```

(Alternatively use Node, VS Code Live Server, etc.)

## Configuration and usage

- Edit `site/config.json` to change titles, footer, and global settings.
- Add or update entries in `site/3Dobjects/menulist.json` to include new 3D models in the dropdown menu.
- Per-model settings (camera position, hotspots, tooltips, links) are defined in `site/config.json`
- The main page `site/jentile.html` reads configuration and loads marker-associated content dynamically.

## Validating 3D models

Use the [Khronos glTF validator](https://github.khronos.org/glTF-Validator/) to verify your GLB files.

## Contributing

Feel free to open an issue for bugs or suggestions, or submit a pull request with improvements.

## License

See the LICENSE file for details.