pub mod system;
pub mod project;
pub mod chapter;
pub mod character;
pub mod ai;
pub mod ai_providers;
pub mod context;
pub mod settings;
pub mod database;
pub mod ai_history;
pub mod epub;
// 所有舊PDF模組已刪除 - 現在只使用Chrome Headless實現
pub mod pdf_chrome; // Chrome Headless PDF模組 - 最新解決方案
pub mod illustration;
pub mod translation;
pub mod prompt_templates;
pub mod batch_illustration;