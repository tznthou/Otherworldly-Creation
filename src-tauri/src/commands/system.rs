use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn reload_app(window: tauri::Window) -> Result<(), String> {
    // 在 Tauri v2 中使用 emit 來觸發前端的重載
    window.emit("reload-app", ()).map_err(|e| e.to_string())
}