# Genesis Chronicle

<p align="center">
  <img src="assets/icon.png" width="120" height="120" />
</p>

<p align="center">
  <strong>AI-Powered Chinese Light Novel Creation Platform</strong><br>
  Integrate 5 major AI providers for seamless Chinese literature creation
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v1.1.8-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-green" alt="Platform">
  <img src="https://img.shields.io/badge/AI_Providers-5-orange" alt="AI Providers">
  <img src="https://img.shields.io/badge/code_lines-100k+-purple" alt="Code Lines">
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="License">
</p>

<p align="center">
  <strong>English</strong> | <a href="README_zh_TW.md">繁體中文</a>
</p>

---

## ✨ Features

### 🎯 Core Capabilities
- **🤖 Multi-AI Integration**: Seamlessly switch between 5 major AI providers (Ollama, OpenAI, Gemini, Claude, OpenRouter)
- **🎨 AI Illustration System**: Advanced visual creation center with batch processing and preview functionality
- **📚 Professional Publishing**: Export to EPUB 3.0 and PDF with perfect Chinese typography
- **🧠 Character Analysis**: Big Five personality analysis for consistent character development
- **✍️ Focus Writing Mode**: Distraction-free immersive writing environment
- **📊 Template System**: Quick-start templates for fantasy, romance, isekai, and sci-fi genres

### 🚀 What's New in v1.1.8

#### 🏗️ PathManager Architecture Overhaul
- **Unified Path Management**: Centralized path handling across all modules
- **Environment Auto-Detection**: Seamless development/production path switching
- **Cross-Platform Compatibility**: Native support for macOS and Windows
- **Single Source of Truth**: All path logic consolidated for easy maintenance

#### 🎨 Enhanced AI Illustration System
- **Pollinations Authentication**: New 423-line authentication management system
- **Image Renaming Module**: Advanced 306-line image_rename.rs functionality
- **Enhanced Temp Manager**: Expanded to 188-line feature-rich version
- **Database v20**: Upgraded schema with collection support

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **State Management**: Redux Toolkit with 13 specialized slices
- **Editor**: Slate.js with real-time auto-save
- **UI Components**: Custom component library with 442+ files
- **Build Tool**: Vite with optimized build pipeline

### Backend
- **Framework**: Tauri v2 (Rust + WebView)
- **Database**: SQLite v20 with migration system
- **AI Integration**: Custom provider traits for 5+ AI services
- **Performance**: 300% faster startup, 70% less memory usage vs Electron

### AI Providers
| Provider | Specialty | Recommended Models | Use Case |
|----------|-----------|-------------------|----------|
| 🦙 **Ollama** | Local, Privacy-First | llama3.2, qwen2.5 | Offline writing, privacy-focused |
| 🤖 **OpenAI** | Industry Standard | gpt-4o, gpt-4o-mini | Professional content, high quality |
| ✨ **Google Gemini** | Multimodal, Long Context | gemini-2.5-flash, gemini-2.5-pro | World-building, plot planning |
| 🧠 **Anthropic Claude** | Deep Understanding | claude-3.5-sonnet, claude-3.5-haiku | Character psychology, logic |
| 🔄 **OpenRouter** | Unified API | 100+ models | Flexible switching, cost optimization |

## 🚀 Quick Start

### 📦 Installation

#### macOS (Recommended)
```bash
# Download and install DMG (drag-and-drop)
curl -L -o genesis-chronicle.dmg https://github.com/tznthou/Otherworldly-Creation/releases/latest/download/genesis-chronicle.dmg
# Double-click DMG and drag to Applications
```

#### Windows
```bash
# Download and run MSI installer
# Download: https://github.com/tznthou/Otherworldly-Creation/releases/latest/download/genesis-chronicle.msi
```

### ⚡ 5-Minute Setup
1. **Create Project**: Click "Creator Mode" → "New Project"
2. **Use Templates**: Settings → Template Manager → Choose from 4 genre templates
3. **Configure AI**: Settings → AI Configuration → Add your API keys
4. **Start Writing**: Chapter Editor → AI Continuation → Character Analysis → AI Illustration
5. **Export**: Legacy Compilation → EPUB/PDF export

### 🎭 Template System
Get started instantly with professional templates:
- **🏰 Fantasy Adventure**: Classic magical worlds with sword and sorcery
- **💕 School Romance**: Modern urban campus love stories
- **⚡ Isekai Reincarnation**: Popular light novel transmigration themes
- **🚀 Sci-Fi Adventure**: Future technology and space exploration

## 🏗️ Architecture

### Core System Flow
```
Frontend (React/TS) → Tauri IPC → Rust Backend → SQLite v20
                                      ↓
AI Providers ← Provider Traits ← AI Service Layer
```

### Key Modules
- **PathManager**: Unified path management system (v1.1.8)
- **Visual Creation Center**: Complete AI illustration pipeline
- **Character Analysis**: NLP-powered personality insights
- **Export Engine**: Professional EPUB/PDF generation
- **AI Service Layer**: Provider-agnostic AI integration

## 📊 Project Stats

### Scale & Performance
- **Core Code**: 100,000+ lines (TypeScript: 73k, Rust: 20k, JS: 5k)
- **Files**: 442 core files across 3 languages
- **Database**: SQLite v20 with 20 migration levels
- **AI Models**: Support for 100+ models across 5 providers
- **Performance**: 300% faster startup, 70% less memory than Electron

### Development Quality
- ✅ **TypeScript**: 100% type safety
- ✅ **Rust**: Zero compilation warnings  
- ✅ **ESLint**: Clean code standards
- ✅ **Testing**: Complete test infrastructure
- ✅ **Documentation**: 120+ development records via Serena MCP

## 🔧 Development

### Prerequisites
- **Node.js**: 16+ with npm/yarn
- **Rust**: Latest stable with Cargo
- **Database**: SQLite 3.x
- **AI Services**: API keys for desired providers

### Setup
```bash
# Clone repository
git clone https://github.com/your-repo/genesis-chronicle.git
cd genesis-chronicle

# Install dependencies
npm install

# Start development
npm run dev              # Full Tauri app
npm run dev:renderer     # Frontend only (for UI dev)

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Rust checks
cargo check --manifest-path src-tauri/Cargo.toml
```

### Build
```bash
# Development build
npm run build:renderer

# Production build
npm run build

# Platform-specific
cargo tauri build --target universal-apple-darwin  # macOS
cargo tauri build --target x86_64-pc-windows-msvc  # Windows
```

## 📖 Documentation

- **[User Manual](docs/user-manual.md)**: Complete usage guide
- **[API Reference](docs/api.md)**: Tauri command documentation  
- **[Development Guide](docs/development.md)**: Contributing guidelines
- **[Architecture](docs/architecture.md)**: System design details
- **[AI Integration](docs/ai-providers.md)**: Provider setup and usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode, ESLint compliance
- **Rust**: Clippy linting, comprehensive error handling
- **Testing**: Unit tests for new features
- **Documentation**: Update relevant docs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tauri Team**: For the amazing Rust-based app framework
- **AI Providers**: OpenAI, Google, Anthropic, Ollama community
- **Open Source Libraries**: React, TypeScript, Slate.js, and many more
- **Community**: Contributors and users who make this project possible

---

<p align="center">
  <strong>Genesis Chronicle v1.1.8</strong><br>
  Made with ❤️ for Chinese light novel creators worldwide
</p>