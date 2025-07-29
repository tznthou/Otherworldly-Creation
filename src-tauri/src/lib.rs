mod commands;
mod database;

use commands::system::{get_app_version, quit_app, reload_app};
use commands::project::{get_all_projects, get_project_by_id, create_project, update_project, delete_project};
use commands::chapter::{get_chapters_by_project_id, get_chapter_by_id, create_chapter, update_chapter, delete_chapter};
use commands::character::{
    get_characters_by_project_id, get_character_by_id, create_character, update_character, delete_character,
    create_character_relationship, delete_character_relationship, clear_character_relationships,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
      clear_character_relationships,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
