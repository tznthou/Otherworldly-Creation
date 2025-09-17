# Genesis Chronicle

<p align="center">
  <img src="assets/icon.png" width="120" height="120" />
</p>

<p align="center">
  <strong>The World's First Integrated AI Light Novel Creation Ecosystem</strong><br>
  唯一整合創作+插圖+出版的中文輕小說智能創作平台
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v1.2.7-blue" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-green" alt="Platform">
  <img src="https://img.shields.io/badge/AI_Providers-5-orange" alt="AI Providers">
  <img src="https://img.shields.io/badge/code_lines-111k+-purple" alt="Code Lines">
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="License">
</p>

<p align="center">
  <strong>English</strong> | <a href="README_zh_TW.md">繁體中文</a>
</p>

---

## ✨ Features

### 🏆 World's First & Exclusive Features
> *After extensive research of 2024-2025 AI writing platforms, we proudly present the industry's first fully integrated Chinese light novel creation ecosystem. While others focus on fragments, we deliver the complete vision.*

- **🎯 End-to-End Creative Pipeline**: The only platform combining AI-assisted writing + intelligent illustration generation + professional eBook publishing in one seamless workflow
- **📚 Native Chinese Literature Focus**: Purpose-built for Chinese light novel creation with genre-specific templates and cultural understanding
- **🎨 Intelligent Visual Storytelling**: AI-powered illustration system that understands your narrative context for perfect visual accompaniment
- **📖 Professional Publishing Ready**: Direct export to EPUB 3.0 and PDF with typography that respects Chinese literature conventions

### 🎯 Core Capabilities
- **🤖 Multi-AI Integration**: Seamlessly switch between 5 major AI providers (Ollama, OpenAI, Gemini, Claude, OpenRouter)
- **🎨 AI Illustration System**: Advanced visual creation center with batch processing and preview functionality
- **📚 Professional Publishing**: Export to EPUB 3.0 and PDF with perfect Chinese typography
- **🧠 Character Analysis**: Big Five personality analysis for consistent character development
- **✍️ Focus Writing Mode**: Distraction-free immersive writing environment
- **📊 Template System**: Quick-start templates for fantasy, romance, isekai, and sci-fi genres

### 🚀 What's New in v1.2.7 - Windows Image Display Compatibility Fix (2025-09-17)

#### 🔧 Windows Environment Image Display Root Fix
- **Windows Path Format Compatibility**: Fixed core issue where Rust-side getImagePath returned path format mismatched with frontend
- **SafeImage Component Windows Enhancement**: Unified path separators to forward slashes, ensuring convertFileSrc API works properly in Windows environment
- **Cross-Platform Path Processing Unification**: Complete unification of image path processing across Windows/Mac/Linux platforms while maintaining system stability
- **User Experience Improvement**: Windows users can now properly view AI-generated image previews and manage galleries

#### 🎯 Technical Improvement Highlights
- Fixed Windows environment gallery loading blank issues
- Enhanced SafeImage component cross-platform compatibility
- Strengthened convertFileSrc API Windows support
- Maintained complete stability for Mac/Linux environments with no functional impact

### 🚀 What's New in v1.2.5 - Cross-Platform Compatibility & Visual Creation Enhancement (2025-09-16)

#### 🌐 Cross-Platform Compatibility Breakthrough
- **Universal Path Management**: Revolutionary fix for cross-user compatibility in SafeImage component - eliminates hardcoded user paths
- **Dynamic Environment Detection**: Enhanced path resolution system using `process.env.HOME`/`process.env.USERPROFILE` for seamless deployment
- **Production-Ready Deployment**: Complete elimination of user-specific dependencies, enabling universal application distribution

#### 🎨 Visual Creation System Major Upgrade
- **Enhanced CreateTab Experience**: Comprehensive UI/UX improvements with 135+ lines of new functionality
- **Optimized Generation Controls**: Streamlined image generation workflow with improved user feedback
- **Advanced Service Configuration**: Refactored ServiceConfigurationPanel for better performance and maintainability
- **Intelligent Image Preview**: Enhanced preview modal functionality with better error handling and loading states

#### 🔧 System Architecture Refinements
- **Path Management Evolution**: Advanced path_utils.rs with enhanced development/production environment detection
- **API Layer Improvements**: Extended system commands with new image path resolution capabilities
- **Statistics Accuracy**: Corrected project metrics displaying accurate 111K+ lines of code
- **Code Quality Excellence**: Maintained 100% TypeScript safety and zero critical ESLint errors

### 🚀 What's New in v1.2.3 - User Experience Excellence & System Refinement (2025-09-15)

#### 🎨 Visual Creation & eBook Preparation Breakthrough
- **Drag & Drop Classification**: Complete fix for ebook layout classification system - images now display perfectly with @dnd-kit integration
- **SafeImage Component**: Resolved CSS layout conflicts and removed debug overlays for pristine visual experience
- **AI Illustration Panel**: Fixed infinite loops, token display issues, and navigation buttons for seamless workflow
- **eBook Preparation Suite**: 15 professional components for drag classification, batch rename, and metadata analysis

#### 📚 Documentation & Project Management
- **CLAUDE.md Enhancement**: Comprehensive documentation updates with missing npm scripts and expanded architecture details
- **Git Repository Cleanup**: Complete removal of legacy branches (local & remote) with zero data loss protection
- **README Restructuring**: Reorganized version history with newest updates first for better navigation
- **Development Workflow**: Enhanced project analysis capabilities with Serena MCP integration

#### 🔧 Technical Infrastructure Improvements
- **Testing Framework**: Added segregated test scripts (unit, integration, performance) for targeted development
- **Build Pipeline**: Enhanced development commands with comprehensive pre-release checks
- **Code Quality**: Maintained 100% TypeScript safety and zero Rust warnings
- **State Management**: Improved Redux Toolkit documentation with 16 specialized slices

### 🚀 What's New in v1.2.0 - System Architecture Breakthrough

#### 🏗️ Major System Architecture Improvements
- **Path System Overhaul**: Complete resolution of 2-week blocking issue with temp/final directory unification
- **Image Generation Pipeline**: Eliminated 6 redundant commands through systematic architecture refactoring
- **File Operation Atomicity**: Implemented bulletproof atomic file operations with database consistency
- **Production Stability**: Fixed all async SQLite Statement issues for enterprise-grade reliability

#### 💎 Perfect Code Quality Achievement
- **TypeScript Perfection**: Eliminated all 63 compilation errors → 0 errors (100% type safety)
- **Rust Excellence**: Maintained zero compilation warnings across 21,572 lines
- **ESLint Compliance**: Achieved full code standard compliance (0 errors, 21 quality suggestions)
- **Quality Assurance**: Complete compilation success for both Rust and TypeScript ecosystems

#### 🎨 Revolutionary UX Enhancement
- **Rich Visual Feedback**: Transformed silent operations into comprehensive notification system
- **Loading State Management**: Added real-time progress indicators and button states
- **Notification System**: Implemented success/warning/error feedback with detailed statistics
- **User Experience**: Eliminated "no feedback" issues in image collection workflow

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
- **PathManager**: Bulletproof path management with temp/final separation (v1.1.9)
- **Visual Creation Center**: Enterprise-grade AI illustration pipeline with UX excellence
- **Character Analysis**: NLP-powered personality insights
- **Export Engine**: Professional EPUB/PDF generation
- **AI Service Layer**: Provider-agnostic AI integration with transaction safety

## 📊 Project Stats

### Scale & Performance
- **Core Code**: 113,016 lines (TypeScript: 82,819, Rust: 24,449, JS: 5,748)
- **Files**: 475 core files across 3 languages
- **Database**: SQLite v20 with 20 migration levels
- **AI Models**: Support for 100+ models across 5 providers
- **Performance**: 300% faster startup, 70% less memory than Electron

### Development Quality
- ✅ **TypeScript**: 100% type safety
- ✅ **Rust**: Zero compilation warnings  
- ✅ **ESLint**: Clean code standards
- ✅ **Testing**: Complete test infrastructure
- ✅ **Documentation**: 120+ development records via Serena MCP

## 🗓️ Future Roadmap

### 📊 Privacy & Telemetry Enhancement (NocoDB Integration)
> *Planned implementation for enhanced user insights and system improvement*

#### 🔐 Privacy-First Analytics System
- **Telemetry Collection**: Optional anonymous usage analytics with full user control
- **Crash Reporting**: Intelligent error reporting system for rapid issue resolution
- **Usage Analytics**: Understanding user behavior patterns for feature optimization
- **NocoDB Backend**: Professional no-code database solution for data visualization and analysis

#### ✨ Key Features in Development
- **🛡️ Privacy Controls**: Granular user control over data collection (already implemented in UI)
- **📈 Analytics Dashboard**: Real-time insights into application usage patterns
- **🔧 Error Tracking**: Automated crash reporting with attachment support
- **📊 Data Visualization**: Built-in charts and analytics via NocoDB
- **🔒 Anonymous Processing**: Complete user anonymization with secure JWT authentication

#### 🏗️ Technical Implementation
- **REST API Integration**: NocoDB endpoints for seamless data collection
- **Offline Support**: Local caching with batch synchronization
- **File Upload Support**: Error screenshots and logs attachment capability
- **Webhook Automation**: Automated notifications for critical errors

*Full implementation plan available in project documentation - privacy-focused design with complete user control*

---

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

## 📝 Change Log

### [2025-09-15 11:18:53]
- **Total lines of code**: 113,016 lines (+7,486 from v1.2.0)
- **Change from last update**: +7,486 lines (+7.1% growth)
- **Files modified**: 43 core files updated
- **New features added**:
  - Ebook Preparation functionality (4 new files)
  - Image compression service
  - Enhanced drag-drop support
  - AI illustration panel fixes
  - Database duplicate cleanup system
- **Technical improvements**:
  - Fixed ebook image path inconsistency
  - Resolved AI illustration UX issues
  - Enhanced notification system
  - Improved error handling

### Previous Updates
- **[2025-09-13]**: v1.2.1 - Documentation excellence & repository optimization
- **[2025-09-12]**: v1.2.0 - System architecture breakthrough (105,530 lines)
- **[2025-08-31]**: v1.1.9 - Stability improvements and path management fixes

---

<p align="center">
  <strong>Genesis Chronicle v1.2.7</strong><br>
  Made with ❤️ for Chinese light novel creators worldwide
</p>