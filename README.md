# 🎮 TETRIS NEON

A modern Tetris game with neon/cyberpunk visual effects, built with vanilla HTML5 Canvas + JavaScript.

![Tetris Neon](https://img.shields.io/badge/Game-Tetris-0ff?style=for-the-badge&labelColor=0a0a1a)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## ✨ Features

- 🌈 **Neon glow effects** — every block glows with its own color
- 💥 **Particle explosions** — line clears trigger particle bursts
- 📳 **Screen shake** — hard drops and multi-line clears shake the board
- 👻 **Ghost piece** — see where your piece will land
- 📦 **Hold piece** — swap the current piece (press C)
- 📋 **Next 3 preview** — see the next 3 pieces coming
- 🎯 **7-bag randomizer** — fair piece distribution (SRS standard)
- 🔄 **SRS rotation + wall kicks** — proper rotation system
- ⚡ **Combo system** — chain line clears for bonus points
- 🚀 **Level progression** — speed increases every 10 lines
- ⭐ **Animated background** — floating neon stars

## 🎮 Controls

| Key | Action |
|-----|--------|
| `←` `→` | Move left/right |
| `↑` | Rotate clockwise |
| `Z` | Rotate counter-clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` | Hold piece |
| `P` | Pause |
| `Enter` | Start / Restart |

## 🚀 How to Play

Just open `index.html` in your browser. No build step, no dependencies.

```bash
git clone https://github.com/0tavio4ugusto/tetris-neon.git
cd tetris-neon
open index.html    # or double-click index.html
```

## 🏆 Scoring

| Action | Points |
|--------|--------|
| Single | 100 × level |
| Double | 300 × level |
| Triple | 500 × level |
| Tetris | 800 × level |
| Soft drop | 1 per cell |
| Hard drop | 2 per cell |
| Combo bonus | 50 × combo × level |

## 📁 Project Structure

```
tetris-neon/
├── index.html    # Game layout
├── style.css     # Neon styling & effects
├── tetris.js     # Full game engine
└── README.md
```

## 📄 License

MIT — do whatever you want with it.
