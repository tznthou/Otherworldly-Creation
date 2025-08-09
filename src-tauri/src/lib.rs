mod commands;
mod database;
mod services;
mod utils;

use commands::system::{
    get_app_version, quit_app, reload_app, show_save_dialog, show_open_dialog, open_external,
    check_for_updates, download_update, install_update, set_auto_update
};
use commands::project::{get_all_projects, get_project_by_id, create_project, update_project, delete_project};
use commands::chapter::{get_chapters_by_project_id, get_chapter_by_id, create_chapter, update_chapter, delete_chapter};
use commands::character::{
    get_characters_by_project_id, get_character_by_id, create_character, update_character, delete_character,
    create_character_relationship, delete_character_relationship, get_character_relationships, clear_character_relationships,
};
use commands::ai::{
    check_ollama_service, get_service_status, list_models, get_models_info, check_model_availability,
    generate_text, generate_with_context, generate_with_separated_context, update_ollama_config,
};
use commands::ai_providers::{
    get_ai_providers, create_ai_provider, update_ai_provider, delete_ai_provider,
    test_ai_provider, generate_ai_text, get_supported_ai_provider_types
};
use commands::context::{build_context, compress_context, get_context_stats, build_separated_context, estimate_separated_context_tokens, analyze_text_purity, enhance_generation_parameters};
use commands::settings::{get_setting, set_setting, get_all_settings, reset_settings};
use commands::database::{backup_database, restore_database, run_database_maintenance, get_database_stats, health_check};
use commands::ai_history::{create_ai_history, query_ai_history, mark_ai_history_selected, delete_ai_history, cleanup_ai_history};
use commands::epub::{generate_epub, get_epub_exports, delete_epub_export};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // 初始化資料庫
      if let Err(e) = database::init_database() {
        log::error!("資料庫初始化失敗: {}", e);
        return Err(e.into());
      }
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // System commands
      get_app_version,
      quit_app,
      reload_app,
      show_save_dialog,
      show_open_dialog,
      open_external,
      check_for_updates,
      download_update,
      install_update,
      set_auto_update,
      // Project commands
      get_all_projects,
      get_project_by_id,
      create_project,
      update_project,
      delete_project,
      // Chapter commands
      get_chapters_by_project_id,
      get_chapter_by_id,
      create_chapter,
      update_chapter,
      delete_chapter,
      // Character commands
      get_characters_by_project_id,
      get_character_by_id,
      create_character,
      update_character,
      delete_character,
      create_character_relationship,
      delete_character_relationship,
      get_character_relationships,
      clear_character_relationships,
      // AI commands (legacy Ollama)
      check_ollama_service,
      get_service_status,
      list_models,
      get_models_info,
      check_model_availability,
      generate_text,
      generate_with_context,
      generate_with_separated_context,
      update_ollama_config,
      // AI Providers commands (new multi-provider system)
      get_ai_providers,
      create_ai_provider,
      update_ai_provider,
      delete_ai_provider,
      test_ai_provider,
      generate_ai_text,
      get_supported_ai_provider_types,
      // Context commands
      build_context,
      compress_context,
      get_context_stats,
      build_separated_context,
      estimate_separated_context_tokens,
      analyze_text_purity,
      enhance_generation_parameters,
      // Settings commands
      get_setting,
      set_setting,
      get_all_settings,
      reset_settings,
      // Database commands
      backup_database,
      restore_database,
      run_database_maintenance,
      get_database_stats,
      health_check,
      // AI History commands
      create_ai_history,
      query_ai_history,
      mark_ai_history_selected,
      delete_ai_history,
      cleanup_ai_history,
      // EPUB commands
      generate_epub,
      get_epub_exports,
      delete_epub_export,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
