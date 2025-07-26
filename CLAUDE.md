# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is an Electron-based AI-powered novel writing application that integrates with Ollama for local AI assistance. It's designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

## Development Commands

### Essential Commands
- `npm run dev` - Start development environment (runs both main and renderer processes)
- `npm run build` - Build the entire application
- `npm run lint` - Run ESLint code linting
- `npm test` - Run Jest test suite
- `npm run package` - Package the application using Electron Forge
- `npm run clean` - Clean build artifacts

### Testing Commands
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only  
- `npm run test:performance` - Run performance tests only
- `node run-unit-tests.js` - Alternative unit test runner
- `node run-integration-tests.js` - Alternative integration test runner
- `node run-performance-tests.js` - Alternative performance test runner

### Build & Package Commands
- `npm run build:main` - Build main process only
- `npm run build:renderer` - Build renderer process only
- `npm run make` - Build and create distribution packages
- `npm run make:mac` - Build for macOS
- `npm run make:win` - Build for Windows
- `npm run make:linux` - Build for Linux

## Architecture Overview

### Core Structure
This is an Electron application with a React frontend using TypeScript throughout:

- **Main Process** (`src/main/`): Handles system integration, database operations, and IPC
- **Renderer Process** (`src/renderer/`): React application with Redux state management
- **Database**: SQLite with better-sqlite3, includes migration system and foreign key constraints
- **AI Integration**: Ollama service integration for local AI text generation
- **Testing**: Comprehensive test suite with unit, integration, and performance tests

### Key Services & Components

#### Main Process Services
- **Database Service** (`src/main/database/database.ts`): SQLite operations with migration support
- **Ollama Service** (`src/main/services/ollamaService.ts`): AI integration and service detection
- **Context Manager** (`src/main/services/contextManager.ts`): Intelligent context management for AI requests
- **Update Service** (`src/main/services/updateService.ts`): Application update handling
- **IPC Handlers** (`src/main/ipc/`): Communication between main and renderer processes

#### Frontend Architecture
- **State Management**: Redux Toolkit with structured slices
- **Routing**: React Router for page navigation
- **UI Components**: Custom component library with cosmic/magical theme
- **Editor**: Slate.js rich text editor for chapter writing
- **Character Management**: Full character creation and relationship system
- **Template System**: Pre-built story templates for different genres

### Database Schema
The application uses SQLite with the following main entities:
- Projects (novels/stories)
- Chapters (individual story chapters)
- Characters (character profiles and relationships)
- Templates (story templates and character archetypes)
- Settings (user preferences and configurations)

### External Dependencies
- **Ollama**: Required for AI functionality - must be installed and running locally
- **Models**: Supports various Ollama models, defaulting to llama3.2 for Chinese text

## Development Workflow

### Adding New Features
1. Add IPC handlers in `src/main/ipc/ipcHandlers.ts`
2. Expose APIs in `src/main/preload.ts`  
3. Create Redux slice in `src/renderer/src/store/slices/`
4. Build React components in `src/renderer/src/components/`
5. Add corresponding tests in `src/main/__tests__/` or `src/__tests__/`

### Database Changes
- Database operations are centralized in `src/main/database/database.ts`
- Uses migration system with version tracking
- Supports foreign key constraints and cascading deletes
- Transaction support for complex operations

### Testing Strategy
- **Unit Tests**: Core services and database operations
- **Integration Tests**: Component interactions and workflows
- **Performance Tests**: Large data handling and AI request performance
- **E2E Tests**: Complete user workflows from project creation to export

## Configuration Files

- `jest.config.js` - Jest testing configuration with jsdom environment
- `tsconfig.json` - TypeScript configuration for renderer process
- `tsconfig.main.json` - TypeScript configuration for main process
- `vite.config.ts` - Vite build configuration for frontend
- `.eslintrc.js` - ESLint configuration
- `forge.config.js` - Electron Forge packaging configuration
- `tailwind.config.js` - Tailwind CSS configuration

## Special Considerations

### AI Service Integration
- Ollama must be running locally for AI features to work
- Service health checking is implemented with automatic retry mechanisms
- Context management optimizes AI requests by intelligently building context from project data

### Internationalization
- Primary language is Traditional Chinese (繁體中文)
- All UI text and comments are in Chinese
- English is used only for technical identifiers and code

### Theme & UI
- Custom "cosmic" theme with dark blue backgrounds and golden accents
- Animated magical elements and particle effects
- Responsive design optimized for desktop writing workflows

### Data Management
- Automatic backup and restore functionality
- Database maintenance tools for health checking and optimization
- Auto-save functionality for editor content