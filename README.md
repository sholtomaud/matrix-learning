# Conceptual Matrix Mapper v3

## Overview
Conceptual Matrix Mapper is a tool designed to analyze and optimize the logical structure of conceptual frameworks. It allows users to map out propositions and their relations (associations, discriminations, dependencies, and gaps), and uses an optimization algorithm to improve the coherence and "tightness" of the resulting matrix.

## Purpose and Design
The app is built to solve the problem of logical "leaps" or non-sequiturs in complex texts. By decomposing a text into a set of discrete propositions and mapping their inter-dependencies, users can visualize the cognitive load and structural integrity of an argument.

### Key Features:
- **Matrix Visualization**: Interactive grid showing relations between propositions.
- **Automated Optimization**: A bandwidth-minimization algorithm that reorders propositions to maximize local coherence (tightness) and cluster density.
- **LLM Integration**: Supports Anthropic, Gemini, and Local (llama.cpp) models for:
    - Gap identification and "enthymeme" synthesis (bridging unstated premises).
    - Prose regeneration based on optimized matrix structures.
- **Genre-Specific Targets**: Optimization targets vary based on the text genre (e.g., scientific, expository, narrative).
- **Persistent Storage**: Uses IndexedDB for local data persistence.
- **Dependency-Free Frontend**: Built using Vanilla Web Components and Shadow DOM.

## Tech Stack
- **Language**: TypeScript
- **Bundler**: Vite
- **Components**: Custom Elements V1 (Web Components)
- **State Management**: Reactive State Manager
- **Storage**: IndexedDB
- **Testing**: Playwright (E2E)
- **Containerization**: Docker & Makefile

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Local Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173` (or the port indicated by Vite).

### Containerized Development
The project includes a `Makefile` for easier container management:
- **Build the image**: `make build`
- **Start dev server**: `make dev` (runs on port 3000)
- **Stop containers**: `make stop`

## Usage
1. **Input JSON**: Paste a JSON representation of your matrix in the sidebar. You can use the "Example" button to load a sample.
2. **Render**: Click "Render →" to visualize the current matrix.
3. **Run Loop**:
   - **Phase 1**: The optimizer reorders propositions to minimize "bandwidth" (the distance between related concepts).
   - **Phase 2**: (Requires API Key) The LLM identifies logical breaks and suggests "bridge" propositions.
   - **Phase 3**: (Requires Source Text & API Key) The LLM regenerates the prose based on the new structure.
4. **Export**: Export the optimized matrix as a JSON file.

## Project Structure
```
├── src/
│   ├── components/    # Web Components (app-shell, matrix-grid, etc.)
│   ├── services/      # Logic for LLM, Optimization, and Storage
│   ├── main.ts        # Entry point
│   ├── router.ts      # Client-side routing
│   ├── state.ts       # Global state management
├── tests/             # Playwright E2E tests
├── index.html         # Application entry page
├── Makefile           # Container management
├── package.json       # Dependencies and scripts
└── style.css          # Global styles and CSS variables
```

## Testing
The project uses Playwright for end-to-end testing.
- **Run all tests**: `npm test`
- **Validation suite** (Type-check + Build + Test): `npm run validate`
