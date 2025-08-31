// 插畫系統模組 - 模組化重構
//
// 模組架構：
// - character_consistency: 角色一致性管理 (約260行)
// - free_generation: 免費插畫生成 (約400行) 
// - temp_image_manager: 臨時圖像管理 (約300行)
// - image_deletion: 圖像刪除管理 (約400行)
// - enhanced_generation: 增強插畫生成 (約200行)
// - utils: 共用輔助函數

// 子模組聲明
pub mod character_consistency;
pub mod free_generation;
pub mod temp_image_manager;
pub mod image_deletion;
pub mod enhanced_generation;
pub mod image_rename;
pub mod utils;

// 重新匯出所有公開功能，保持原有API兼容性

// ========================= 角色一致性管理 =========================
pub use character_consistency::{
    setup_character_consistency,
    generate_consistency_report,
    set_character_seed,
    add_reference_image,
    get_character_visual_traits,
    calculate_character_similarity_matrix,
    batch_check_project_consistency,
    generate_batch_seeds,
};

// ========================= 免費插畫生成 =========================
pub use free_generation::{
    generate_free_illustration,
    test_pollinations_connection,
    get_illustration_history,
    get_free_illustration_models,
};

// ========================= 臨時圖像管理 =========================
pub use temp_image_manager::{
    generate_free_illustration_to_temp,
    confirm_temp_image_save,
    delete_temp_image,
    cleanup_expired_temp_images,
    // 優化的圖像管理
    generate_illustration_optimized,
    confirm_illustrations,
    // 收藏功能
    add_to_collection,
    add_to_collection_with_data,
};

// ========================= 圖像刪除管理 =========================
pub use image_deletion::{
    delete_illustrations,
    restore_illustrations,
    get_deleted_illustrations,
    permanent_delete_illustrations,
};

// ========================= 增強插畫生成 =========================
pub use enhanced_generation::{
    generate_enhanced_illustration,
    generate_illustration,
    get_illustration_generation_status,
    cancel_illustration_generation,
    validate_imagen_api_connection,
};

// ========================= 圖像重命名管理 =========================
pub use image_rename::{
    rename_illustration,
    batch_rename_illustrations,
};

// ========================= 共用輔助函數 =========================
// Note: save_generated_image 函數僅供內部模組使用，不需要對外匯出