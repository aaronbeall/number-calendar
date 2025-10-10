# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

# Number Calendar

A modern, elegant calendar app for tracking daily numbers with beautiful visualizations and statistics.

## Features

* **Calendar Grid View** - Clean monthly calendar with previous, next, and today navigation
* **Day Number Entry** - Click any day to add numbers like "1+2-5" which get parsed into series data `[1, 2, -5]`
* **Smart Statistics** - Display weekly and monthly totals, median, mean, min, max
* **Color-Coded Numbers** - Positive numbers in green, negative numbers in red throughout the UI
* **Interactive Charts** - Bar graph below calendar with Serial or Cumulative view toggle
* **Local Storage** - Data persisted locally using IndexedDB
* **Modern UI** - Built with Tailwind CSS and ShadCN UI components for a polished experience

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **ShadCN UI** for high-quality, accessible components
- **Lucide React** for beautiful icons
- **IndexedDB** via `idb` for local data persistence
- **Feature-based architecture** for clean code organization

## Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Usage

1. **Navigate** between months using the arrow buttons or click "Today" to return to current month
2. **Add Numbers** by clicking on any day and entering expressions like `10+5-2`
3. **View Stats** in the weekly and monthly statistics sections below the calendar
4. **Toggle Chart** between Serial (daily totals) and Cumulative (running totals) views
5. **Data Persistence** - All your data is automatically saved locally

## Architecture

The app follows a clean, feature-based folder structure:

```
src/
├── components/ui/          # Reusable UI components (Button, Input, Badge)
├── features/
│   ├── calendar/          # Calendar grid component
│   ├── day/               # Day cell with number input
│   ├── stats/             # Statistics display
│   ├── chart/             # Chart visualization
│   └── db/                # IndexedDB utilities
├── lib/                   # Utility functions
└── App.tsx               # Main application
```

## License

MIT License

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
