mod commands;
mod database;
mod services;
mod utils;

use commands::system::{
    get_app_version, quit_app, reload_app, show_save_dialog, show_open_dialog, open_external,
    check_for_updates, download_update, install_update, set_auto_update, read_image_as_base64,
    save_export_file, get_image_path, get_environment_info,
    get_secure_key, set_secure_key, delete_secure_key,
    // 日誌管理 commands (v1.3.3)
    get_log_directory, open_log_directory, get_recent_logs, delete_old_logs
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
    test_ai_provider, generate_ai_text, get_supported_ai_provider_types, get_available_models
};
use commands::context::{build_context, compress_context, get_context_stats};
use commands::settings::{get_setting, set_setting, get_all_settings, reset_settings};
use commands::database::{backup_database, restore_database, create_auto_backup, get_default_backup_dir, run_database_maintenance, get_database_stats, health_check, reindex_database, incremental_vacuum, get_wal_mode_status, set_wal_mode};
use commands::ai_history::{create_ai_history, query_ai_history, mark_ai_history_selected, delete_ai_history, cleanup_ai_history};
use commands::epub::{generate_epub, get_epub_exports, delete_epub_export};
// 所有舊PDF命令已刪除 - 現在只使用Chrome Headless實現
use commands::pdf_chrome::{generate_pdf_chrome}; // Chrome Headless PDF 命令 - 最新解決方案
use commands::illustration::{
    setup_character_consistency, generate_consistency_report, set_character_seed,
    add_reference_image, get_character_visual_traits, calculate_character_similarity_matrix,
    batch_check_project_consistency, generate_batch_seeds, generate_illustration,
    generate_enhanced_illustration, get_illustration_generation_status,
    cancel_illustration_generation, validate_imagen_api_connection,
    generate_free_illustration, test_pollinations_connection, get_free_illustration_models,
    get_illustration_history, repair_database_sync,
    // 臨時圖像管理 API
    generate_free_illustration_to_temp, confirm_temp_image_save, delete_temp_image, cleanup_expired_temp_images,
    // 優化的圖像管理 API
    generate_illustration_optimized, confirm_illustrations, add_to_collection, add_to_collection_with_data,
    // 圖片刪除管理 API
    delete_illustrations, delete_illustrations_safe, restore_illustrations, get_deleted_illustrations, permanent_delete_illustrations,
    // 圖片重命名管理 API
    rename_illustration, batch_rename_illustrations,
    // Gemini 插畫生成 API
    generate_gemini_illustration, test_gemini_connection
};
use commands::batch_illustration::{
    initialize_batch_manager, submit_batch_illustration_request, get_batch_status,
    cancel_batch, get_batch_queue_statistics, update_batch_manager_config,
    cleanup_completed_tasks, get_all_batches_summary, retry_failed_tasks,
    pause_batch, resume_batch
};
use commands::pollinations_auth::{
    save_pollinations_token, get_pollinations_token, get_pollinations_token_info,
    remove_pollinations_token, test_pollinations_token
};
use services::context::optimize_ultra_long_context_command;
use tauri_plugin_log::{Target, TargetKind, RotationStrategy, TimezoneStrategy};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      // 🔧 日誌系統配置 - 所有環境都啟用（v1.3.3 修復）
      // 根據編譯模式設置不同的日誌級別
      let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug  // 開發環境：詳細日誌
      } else {
        log::LevelFilter::Info   // 生產環境：重要資訊
      };

      // 配置日誌插件：輸出到終端 + 日誌檔案
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log_level)
          .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
          ])
          .max_file_size(5_000_000)  // 5MB 單檔上限
          .rotation_strategy(RotationStrategy::KeepAll)
          .timezone_strategy(TimezoneStrategy::UseLocal)
          .build(),
      )?;

      // 記錄應用啟動資訊（方便診斷）
      log::info!("========================================");
      log::info!("Genesis Chronicle v{} 啟動", env!("CARGO_PKG_VERSION"));
      log::info!("環境: {}", if cfg!(debug_assertions) { "開發" } else { "生產" });
      log::info!("平台: {} {}", std::env::consts::OS, std::env::consts::ARCH);
      log::info!("日誌級別: {:?}", log_level);
      log::info!("========================================");

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
      read_image_as_base64,
      save_export_file,
      get_image_path,
      get_environment_info,
      get_secure_key,
      set_secure_key,
      delete_secure_key,
      // Log Management commands (v1.3.3)
      get_log_directory,
      open_log_directory,
      get_recent_logs,
      delete_old_logs,
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
      get_available_models,
      // Context commands
      build_context,
      compress_context,
      get_context_stats,
      // Settings commands
      get_setting,
      set_setting,
      get_all_settings,
      reset_settings,
      // Database commands
      backup_database,
      restore_database,
      create_auto_backup,
      get_default_backup_dir,
      run_database_maintenance,
      get_database_stats,
      health_check,
      reindex_database,
      incremental_vacuum,
      get_wal_mode_status,
      set_wal_mode,
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
      // 所有舊PDF命令已刪除 - 僅保留Chrome Headless實現
      generate_pdf_chrome,
      // Illustration commands
      setup_character_consistency,
      generate_consistency_report,
      set_character_seed,
      add_reference_image,
      get_character_visual_traits,
      calculate_character_similarity_matrix,
      batch_check_project_consistency,
      generate_batch_seeds,
      generate_illustration,
      generate_enhanced_illustration,
      get_illustration_generation_status,
      cancel_illustration_generation,
      validate_imagen_api_connection,
      // Free Illustration commands (Pollinations.AI)
      generate_free_illustration,
      test_pollinations_connection,
      get_free_illustration_models,
      get_illustration_history,
      repair_database_sync,
      // 臨時圖像預覽管理
      generate_free_illustration_to_temp,
      confirm_temp_image_save,
      delete_temp_image,
      cleanup_expired_temp_images,
      // 優化的圖像管理
      generate_illustration_optimized,
      confirm_illustrations,
      add_to_collection,
      add_to_collection_with_data,
      // 圖片刪除管理 commands
      delete_illustrations,
      delete_illustrations_safe,
      restore_illustrations,
      get_deleted_illustrations,
      permanent_delete_illustrations,
      // 圖片重命名管理 commands
      rename_illustration,
      batch_rename_illustrations,
      // Gemini 插畫生成 commands
      generate_gemini_illustration,
      test_gemini_connection,
      // Batch Illustration commands
      initialize_batch_manager,
      submit_batch_illustration_request,
      get_batch_status,
      cancel_batch,
      get_batch_queue_statistics,
      update_batch_manager_config,
      cleanup_completed_tasks,
      get_all_batches_summary,
      retry_failed_tasks,
      pause_batch,
      resume_batch,
      // Pollinations Authentication commands
      save_pollinations_token,
      get_pollinations_token,
      get_pollinations_token_info,
      remove_pollinations_token,
      test_pollinations_token,
      // Context Optimization commands
      optimize_ultra_long_context_command,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
