# LogicCore Architect

The comprehensive **AI Agentic IDE** framework that redefines software development.  
LogicCore Architect combines a powerful VS Code extension, a native Python AI backend, and a modern Electron IDE shell into a unified development environment.

---

## 📂 Project Structure

This monorepo consolidates the three core pillars of the LogicCore system:

### 1. [logic-core-vscode](./logic-core-vscode)
**The Core Brain (VS Code Extension)**
- Implements the "Architect" agentic workflow.
- **Key Features**:
  - **Dynamic Clarification**: AI analyzes intent to ask relevant questions.
  - **Streaming Generation**: Code writes visibly in real-time (50ms/line).
  - **Gamified Optimization**: Edit code structure via a node-based RTS interface.
  - **Auxiliary Bar**: Located on the right sidebar for seamless assistance.

### 2. [logic-core-native](./logic-core-native)
**The Intelligence (Python Backend)**
- Handles heavy AI processing and local model interfacing.
- Provides specialized analysis services for the frontend.

### 3. [newide](./newide)
**The Shell (Electron Frontend)**
- A modern, lightweight IDE launcher.
- Provides the entry point and window management for the LogicCore experience.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Visual Studio Code (for extension development)

### Development
Each project can be developed independently:

**VS Code Extension**:
```bash
cd logic-core-vscode
npm install
npm run watch
# Press F5 in VS Code to launch the Extension Host
```

**NewIDE**:
```bash
cd newide
npm install
npm run dev
```

---

## ✨ Key Features (v3.0)
- **Monorepo Architecture**: Unified codebase for easier management.
- **Smart Tech Stack Recommendation**: Heuristic-based stack suggestions (e.g., recommends Unity for games).
- **Marketplace Access**: Full access to the Microsoft VS Code Extension Marketplace.
- **Real-time Persistence**: Generated code is immediately written to disk.

---

© 2026 LogicCore Team
