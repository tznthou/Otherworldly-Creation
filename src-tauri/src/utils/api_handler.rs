use std::time::Instant;
use crate::services::illustration::pollinations_api::{
    PollinationsApiService, PollinationsRequest, PollinationsModel
};

/// 統一的 Pollinations API 處理器
/// 
/// 這個模組統一處理所有 Pollinations API 相關的邏輯，消除重複程式碼
/// 
/// 功能包括：
/// - API 服務初始化（認證與匿名）
/// - 模型解析與備用機制
/// - 請求參數建構
/// - 智能重試機制

#[derive(Debug, Clone)]
pub struct ApiGenerationRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub seed: Option<u32>,
    pub enhance: Option<bool>,
    pub style: Option<String>,
    pub project_id: Option<String>,
    pub character_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ApiGenerationResult {
    pub success: bool,
    pub id: String,
    pub prompt: String,
    pub image_data: Vec<u8>,
    pub image_url: Option<String>,
    pub parameters: ApiGenerationParameters,
    pub generation_time_ms: i32,
    pub error_message: Option<String>,
    pub fallback_used: bool,
    pub model_used: String,
}

#[derive(Debug, Clone)]
pub struct ApiGenerationParameters {
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub seed: Option<u32>,
    pub enhance: bool,
    pub style: Option<String>,
}

impl ApiGenerationResult {
    pub fn success(
        id: String,
        prompt: String,
        image_data: Vec<u8>,
        image_url: Option<String>,
        parameters: ApiGenerationParameters,
        generation_time_ms: i32,
        fallback_used: bool,
    ) -> Self {
        let model_used = parameters.model.clone();
        Self {
            success: true,
            id,
            prompt,
            image_data,
            image_url,
            parameters,
            generation_time_ms,
            error_message: None,
            fallback_used,
            model_used,
        }
    }

    pub fn error(error_message: String) -> Self {
        Self {
            success: false,
            id: String::new(),
            prompt: String::new(),
            image_data: Vec::new(),
            image_url: None,
            parameters: ApiGenerationParameters {
                model: "unknown".to_string(),
                width: 1024,
                height: 1024,
                seed: None,
                enhance: false,
                style: None,
            },
            generation_time_ms: 0,
            error_message: Some(error_message),
            fallback_used: false,
            model_used: "unknown".to_string(),
        }
    }
}

/// Pollinations API 處理器
pub struct PollinationsApiHandler;

impl PollinationsApiHandler {
    /// 初始化 API 服務（自動檢測認證狀態）
    pub async fn initialize_service() -> Result<PollinationsApiService, String> {
        // 嘗試獲取 API token 以支援高級模型
        let api_token = crate::commands::pollinations_auth::get_active_pollinations_token()
            .await
            .ok()
            .flatten();
        
        if let Some(token) = api_token {
            log::info!("[ApiHandler] 🔐 使用認證token，可存取Seed/Flower/Nectar層級模型");
            PollinationsApiService::with_token(token)
                .map_err(|e| format!("認證API服務初始化失敗: {:?}", e))
        } else {
            log::info!("[ApiHandler] 🌐 使用匿名存取，僅限基礎模型");
            PollinationsApiService::new()
                .map_err(|e| format!("基礎API服務初始化失敗: {:?}", e))
        }
    }

    /// 解析模型字串為 PollinationsModel
    pub fn parse_model(model_str: Option<&str>) -> PollinationsModel {
        match model_str.unwrap_or("gptimage") {
            "flux" => PollinationsModel::Flux,
            "gptimage" => PollinationsModel::GptImage,
            "kontext" => PollinationsModel::Kontext,
            "sdxl" => PollinationsModel::Sdxl,
            _ => PollinationsModel::GptImage, // 安全的預設選擇
        }
    }

    /// 建構 API 請求參數
    pub fn build_request(request: &ApiGenerationRequest, model: PollinationsModel) -> PollinationsRequest {
        // 🎲 智能Seed處理：接受前端傳入的智能seed，確保不同環境產生不同插畫
        // 修復日期：2025-09-18 - 解決相同模板產生相同插畫的問題
        let smart_seed = match request.seed {
            Some(seed_value) => {
                // 前端傳入智能seed：使用它來確保不同環境的唯一性
                log::info!("[ApiHandler] 🎯 使用前端智能Seed: {}", seed_value);
                Some(seed_value)
            },
            None => {
                // 前端未傳入seed：讓API自動選擇（保持隨機性）
                log::info!("[ApiHandler] 🎲 未指定seed，由API自動選擇隨機seed");
                None
            }
        };

        PollinationsRequest {
            prompt: request.prompt.clone(),
            width: None, // 移除尺寸參數以避免 500 錯誤
            height: None, // 移除尺寸參數以避免 500 錯誤
            model: Some(model),
            seed: smart_seed, // 🎯 使用智能seed或讓API自動選擇
            enhance: request.enhance.or(Some(false)),
            nologo: Some(true),
            transparent: Some(false),
            negative_prompt: None,
            reference_image: None,
        }
    }

    /// 獲取備用模型列表（基於認證狀態）
    pub async fn get_fallback_models(primary_model: PollinationsModel) -> Vec<PollinationsModel> {
        // 檢查是否有認證 token
        let has_token = crate::commands::pollinations_auth::get_active_pollinations_token()
            .await
            .ok()
            .flatten()
            .is_some();

        if has_token {
            // 有token：可以使用所有模型，包括需要認證的Kontext
            vec![
                primary_model, // 原始選擇的模型
                PollinationsModel::GptImage, // 最穩定，支援透明背景
                PollinationsModel::Sdxl,     // 經典 Stable Diffusion XL
                PollinationsModel::Kontext,  // 認證用戶可用：圖像到圖像轉換
            ]
        } else {
            // 無token：只使用不需認證的基礎模型
            vec![
                primary_model, // 原始選擇的模型
                PollinationsModel::GptImage, // 最穩定，支援透明背景
                PollinationsModel::Sdxl,     // 經典 Stable Diffusion XL
                // 不包含Kontext：需要認證
            ]
        }
    }

    /// 生成圖片（帶備用機制）
    pub async fn generate_with_fallback(request: ApiGenerationRequest) -> ApiGenerationResult {
        log::info!("[ApiHandler] 🎨 開始生成圖片: {}", request.prompt);
        
        // 基本驗證
        if request.prompt.trim().is_empty() {
            return ApiGenerationResult::error("提示詞不能為空".to_string());
        }

        // 初始化服務
        let service = match Self::initialize_service().await {
            Ok(service) => service,
            Err(e) => return ApiGenerationResult::error(e),
        };

        // 解析主要模型
        let primary_model = Self::parse_model(request.model.as_deref());
        
        // 獲取備用模型列表
        let fallback_models = Self::get_fallback_models(primary_model).await;
        
        let mut errors = Vec::new();
        let start_time = Instant::now();

        // 嘗試每個模型
        for (i, &model) in fallback_models.iter().enumerate() {
            // 避免重複嘗試相同模型
            if i > 0 && std::mem::discriminant(&model) == std::mem::discriminant(&primary_model) {
                continue;
            }

            log::debug!("[ApiHandler] 🔄 嘗試模型: {:?} (第{}次嘗試)", model, i + 1);

            let api_request = Self::build_request(&request, model);
            
            match service.generate_image(api_request.clone()).await {
                Ok(response) => {
                    let generation_time = start_time.elapsed().as_millis() as i32;
                    
                    if i > 0 {
                        log::info!("[ApiHandler] ✅ 使用備用模型 {:?} 生成成功，耗時: {}ms", model, generation_time);
                    } else {
                        log::info!("[ApiHandler] ✅ 圖片生成成功，耗時: {}ms", generation_time);
                    }

                    let parameters = ApiGenerationParameters {
                        model: format!("{:?}", model).to_lowercase(),
                        width: response.parameters.width,
                        height: response.parameters.height,
                        seed: response.parameters.seed,
                        enhance: response.parameters.enhance,
                        style: request.style.clone(),
                    };

                    return ApiGenerationResult::success(
                        response.id,
                        response.prompt,
                        response.image_data,
                        response.image_url,
                        parameters,
                        generation_time,
                        i > 0, // fallback_used
                    );
                },
                Err(e) => {
                    let error_msg = format!("{:?} 模型失敗: {:?}", model, e);
                    errors.push(error_msg.clone());
                    log::warn!("[ApiHandler] ⚠️ {}", error_msg);
                    continue;
                }
            }
        }

        // 如果所有具體模型都失敗，最後嘗試不指定模型（讓 Pollinations 自動選擇）
        log::info!("[ApiHandler] 🎯 所有指定模型失敗，嘗試使用 API 預設模型");
        
        let default_request = PollinationsRequest {
            prompt: request.prompt.clone(),
            width: None,
            height: None,
            model: None, // 不指定模型，讓 API 自動選擇最佳可用模型
            seed: None,
            enhance: request.enhance.or(Some(false)),
            nologo: Some(true),
            transparent: Some(false),
            negative_prompt: None,
            reference_image: None,
        };

        match service.generate_image(default_request).await {
            Ok(response) => {
                let generation_time = start_time.elapsed().as_millis() as i32;
                log::info!("[ApiHandler] ✅ API預設模型生成成功，耗時: {}ms", generation_time);

                let parameters = ApiGenerationParameters {
                    model: "api_default".to_string(),
                    width: response.parameters.width,
                    height: response.parameters.height,
                    seed: response.parameters.seed,
                    enhance: response.parameters.enhance,
                    style: request.style.clone(),
                };

                return ApiGenerationResult::success(
                    response.id,
                    response.prompt,
                    response.image_data,
                    response.image_url,
                    parameters,
                    generation_time,
                    true, // fallback_used = true (使用了預設模型)
                );
            },
            Err(e) => {
                let error_msg = format!("API預設模型也失敗: {:?}", e);
                errors.push(error_msg);
                log::error!("[ApiHandler] ❌ API預設模型也失敗: {:?}", e);
            }
        }

        // 所有模型都失敗了
        let all_errors = errors.join("; ");
        let error_message = format!(
            "Pollinations.AI 服務暫時不可用，請稍後再試。如果問題持續，可嘗試使用其他 AI 插畫功能。錯誤詳情: {}",
            all_errors
        );
        
        log::error!("[ApiHandler] ❌ 所有模型（包括預設）都失敗了: {}", all_errors);
        
        ApiGenerationResult::error(error_message)
    }

    /// 簡化的生成方法（不使用備用機制）
    pub async fn generate_simple(request: ApiGenerationRequest) -> ApiGenerationResult {
        log::info!("[ApiHandler] 🎨 簡單生成圖片: {}", request.prompt);
        
        // 基本驗證
        if request.prompt.trim().is_empty() {
            return ApiGenerationResult::error("提示詞不能為空".to_string());
        }

        // 初始化服務
        let service = match Self::initialize_service().await {
            Ok(service) => service,
            Err(e) => return ApiGenerationResult::error(e),
        };

        // 解析模型並建構請求
        let model = Self::parse_model(request.model.as_deref());
        let api_request = Self::build_request(&request, model);
        
        let start_time = Instant::now();

        match service.generate_image(api_request).await {
            Ok(response) => {
                let generation_time = start_time.elapsed().as_millis() as i32;
                log::info!("[ApiHandler] ✅ 簡單生成成功，耗時: {}ms", generation_time);

                let parameters = ApiGenerationParameters {
                    model: format!("{:?}", model).to_lowercase(),
                    width: response.parameters.width,
                    height: response.parameters.height,
                    seed: response.parameters.seed,
                    enhance: response.parameters.enhance,
                    style: request.style.clone(),
                };

                ApiGenerationResult::success(
                    response.id,
                    response.prompt,
                    response.image_data,
                    response.image_url,
                    parameters,
                    generation_time,
                    false, // fallback_used = false
                )
            },
            Err(e) => {
                let error_message = format!("圖片生成失敗: {:?}", e);
                log::error!("[ApiHandler] ❌ {}", error_message);
                ApiGenerationResult::error(error_message)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_parsing() {
        assert!(matches!(PollinationsApiHandler::parse_model(Some("flux")), PollinationsModel::Flux));
        assert!(matches!(PollinationsApiHandler::parse_model(Some("gptimage")), PollinationsModel::GptImage));
        assert!(matches!(PollinationsApiHandler::parse_model(Some("kontext")), PollinationsModel::Kontext));
        assert!(matches!(PollinationsApiHandler::parse_model(Some("sdxl")), PollinationsModel::Sdxl));
        assert!(matches!(PollinationsApiHandler::parse_model(None), PollinationsModel::GptImage));
        assert!(matches!(PollinationsApiHandler::parse_model(Some("unknown")), PollinationsModel::GptImage));
    }

    #[test]
    fn test_api_generation_result() {
        let error_result = ApiGenerationResult::error("測試錯誤".to_string());
        assert!(!error_result.success);
        assert_eq!(error_result.error_message, Some("測試錯誤".to_string()));

        let success_params = ApiGenerationParameters {
            model: "flux".to_string(),
            width: 1024,
            height: 1024,
            seed: None,
            enhance: false,
            style: None,
        };

        let success_result = ApiGenerationResult::success(
            "test123".to_string(),
            "test prompt".to_string(),
            vec![1, 2, 3],
            Some("http://test.com".to_string()),
            success_params,
            1000,
            false,
        );

        assert!(success_result.success);
        assert_eq!(success_result.id, "test123");
        assert_eq!(success_result.prompt, "test prompt");
        assert!(!success_result.fallback_used);
    }

    #[test]
    fn test_request_building() {
        let request = ApiGenerationRequest {
            prompt: "test prompt".to_string(),
            model: Some("flux".to_string()),
            width: Some(512),
            height: Some(512),
            seed: Some(12345),
            enhance: Some(true),
            style: Some("anime".to_string()),
            project_id: None,
            character_id: None,
        };

        let model = PollinationsModel::Flux;
        let api_request = PollinationsApiHandler::build_request(&request, model);

        assert_eq!(api_request.prompt, "test prompt");
        assert!(matches!(api_request.model, Some(PollinationsModel::Flux)));
        assert_eq!(api_request.width, None); // 應該被設為 None（避免 API 錯誤）
        assert_eq!(api_request.height, None); // 應該被設為 None（避免 API 錯誤）
        assert_eq!(api_request.seed, Some(12345)); // 🎯 智能seed應該被保留
        assert_eq!(api_request.enhance, Some(true));
        assert_eq!(api_request.nologo, Some(true));
        assert_eq!(api_request.transparent, Some(false));
    }
}