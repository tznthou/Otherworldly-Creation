/// Pollinations.AI 免費插畫生成服務
/// 
/// 提供完全免費的AI插畫生成功能，無需API Key或註冊
/// 基於高品質的Flux和Stable Diffusion模型
/// 
/// 功能特色：
/// - 完全免費，無需認證
/// - 支援多種模型（flux, stable-diffusion, gptimage）
/// - 靈活的參數控制（尺寸、種子、風格）
/// - 高品質圖像輸出

use serde::{Deserialize, Serialize};
use reqwest::Client;
use uuid::Uuid;

use super::{Result, IllustrationError};

/// Pollinations API 服務
pub struct PollinationsApiService {
    client: Client,
    base_url: String,
}

/// 支援的模型類型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PollinationsModel {
    /// Flux 模型 - 主推薦，高品質通用模型
    Flux,
    /// GPT Image 模型 - 支援透明背景
    GptImage,
    /// Kontext 模型 - 支援圖像到圖像轉換
    Kontext,
    /// Stable Diffusion XL
    Sdxl,
}

impl PollinationsModel {
    fn as_str(&self) -> &str {
        match self {
            PollinationsModel::Flux => "flux",
            PollinationsModel::GptImage => "gptimage",
            PollinationsModel::Kontext => "kontext",
            PollinationsModel::Sdxl => "sdxl",
        }
    }
}

/// 圖像生成請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollinationsRequest {
    /// 文字提示詞（支援中文）
    pub prompt: String,
    /// 圖像寬度
    pub width: Option<u32>,
    /// 圖像高度
    pub height: Option<u32>,
    /// 使用的模型
    pub model: Option<PollinationsModel>,
    /// 隨機種子（可重現結果）
    pub seed: Option<u32>,
    /// 是否增強提示詞
    pub enhance: Option<bool>,
    /// 是否生成透明背景（僅gptimage模型）
    pub transparent: Option<bool>,
    /// 負面提示詞
    pub negative_prompt: Option<String>,
    /// 是否顯示logo
    pub nologo: Option<bool>,
    /// 參考圖像URL（圖像到圖像生成）
    pub reference_image: Option<String>,
}

impl Default for PollinationsRequest {
    fn default() -> Self {
        Self {
            prompt: String::new(),
            width: Some(1024),
            height: Some(1024),
            model: Some(PollinationsModel::Flux),
            seed: None,
            enhance: Some(false),
            transparent: Some(false),
            negative_prompt: None,
            nologo: Some(true),
            reference_image: None,
        }
    }
}

/// 圖像生成響應
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollinationsResponse {
    /// 生成ID
    pub id: String,
    /// 圖像數據（bytes）
    pub image_data: Vec<u8>,
    /// 使用的提示詞
    pub prompt: String,
    /// 實際使用的參數
    pub parameters: PollinationsParameters,
    /// 生成時間（毫秒）
    pub generation_time_ms: u64,
    /// 圖像URL（如果需要）
    pub image_url: Option<String>,
}

/// 實際使用的生成參數
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollinationsParameters {
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub seed: Option<u32>,
    pub enhance: bool,
}

impl PollinationsApiService {
    /// 建立新的Pollinations API服務實例
    pub fn new() -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300)) // 5分鐘超時
            .build()
            .map_err(|e| IllustrationError::AIApi(format!("HTTP客戶端建立失敗: {}", e)))?;

        Ok(Self {
            client,
            base_url: "https://image.pollinations.ai".to_string(),
        })
    }

    /// 生成單張圖像
    pub async fn generate_image(&self, request: PollinationsRequest) -> Result<PollinationsResponse> {
        let start_time = std::time::Instant::now();
        let generation_id = Uuid::new_v4().to_string();

        // 構建請求URL
        let url = self.build_request_url(&request)?;
        
        log::info!("Pollinations生成請求: {}", url);

        // 發送請求
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("API請求失敗: {}", e)))?;

        // 檢查響應狀態
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(IllustrationError::AIApi(format!(
                "API響應錯誤 {}: {}", status, error_text
            )));
        }

        // 取得圖像數據
        let image_data = response
            .bytes()
            .await
            .map_err(|e| IllustrationError::AIApi(format!("圖像數據讀取失敗: {}", e)))?
            .to_vec();

        let generation_time_ms = start_time.elapsed().as_millis() as u64;

        // 構建響應
        let parameters = PollinationsParameters {
            model: request.model.as_ref().unwrap_or(&PollinationsModel::Flux).as_str().to_string(),
            width: request.width.unwrap_or(1024),
            height: request.height.unwrap_or(1024),
            seed: request.seed,
            enhance: request.enhance.unwrap_or(false),
        };

        Ok(PollinationsResponse {
            id: generation_id,
            image_data,
            prompt: request.prompt.clone(),
            parameters,
            generation_time_ms,
            image_url: Some(url),
        })
    }

    /// 批次生成圖像
    pub async fn generate_batch(&self, requests: Vec<PollinationsRequest>) -> Result<Vec<Result<PollinationsResponse>>> {
        let mut results = Vec::new();
        
        let total_requests = requests.len();
        
        for request in requests {
            let result = self.generate_image(request).await;
            results.push(result);
            
            // 避免過於頻繁的請求
            if results.len() < total_requests {
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
            }
        }
        
        Ok(results)
    }

    /// 測試API連接
    pub async fn test_connection(&self) -> Result<bool> {
        let test_request = PollinationsRequest {
            prompt: "test image".to_string(),
            width: Some(256),
            height: Some(256),
            model: Some(PollinationsModel::Flux),
            ..Default::default()
        };

        match self.generate_image(test_request).await {
            Ok(_) => Ok(true),
            Err(e) => {
                log::warn!("Pollinations連接測試失敗: {}", e);
                Ok(false)
            }
        }
    }

    /// 取得支援的模型列表
    pub fn get_supported_models(&self) -> Vec<(PollinationsModel, &str, &str)> {
        vec![
            (PollinationsModel::Flux, "Flux", "高品質通用模型，推薦使用"),
            (PollinationsModel::GptImage, "GPT Image", "支援透明背景，適合UI元素"),
            (PollinationsModel::Kontext, "Kontext", "支援圖像到圖像轉換"),
            (PollinationsModel::Sdxl, "Stable Diffusion XL", "經典穩定模型"),
        ]
    }

    /// 建立請求URL
    fn build_request_url(&self, request: &PollinationsRequest) -> Result<String> {
        if request.prompt.trim().is_empty() {
            return Err(IllustrationError::Config("提示詞不能為空".to_string()));
        }

        // URL編碼提示詞
        let encoded_prompt = urlencoding::encode(&request.prompt);
        
        // 基礎URL
        let mut url = format!("{}/prompt/{}", self.base_url, encoded_prompt);
        
        // 構建查詢參數
        let mut params = Vec::new();
        
        if let Some(width) = request.width {
            params.push(format!("width={}", width));
        }
        
        if let Some(height) = request.height {
            params.push(format!("height={}", height));
        }
        
        if let Some(model) = &request.model {
            params.push(format!("model={}", model.as_str()));
        }
        
        if let Some(seed) = request.seed {
            params.push(format!("seed={}", seed));
        }
        
        if let Some(enhance) = request.enhance {
            if enhance {
                params.push("enhance=true".to_string());
            }
        }
        
        if let Some(transparent) = request.transparent {
            if transparent {
                params.push("transparent=true".to_string());
            }
        }
        
        if let Some(nologo) = request.nologo {
            if nologo {
                params.push("nologo=true".to_string());
            }
        }
        
        if let Some(ref_image) = &request.reference_image {
            params.push(format!("image={}", urlencoding::encode(ref_image)));
        }
        
        // 添加查詢參數
        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }
        
        Ok(url)
    }

    /// 驗證請求參數
    fn validate_request(&self, request: &PollinationsRequest) -> Result<()> {
        // 檢查提示詞
        if request.prompt.trim().is_empty() {
            return Err(IllustrationError::Config("提示詞不能為空".to_string()));
        }

        // 檢查尺寸限制
        if let Some(width) = request.width {
            if width < 64 || width > 2048 {
                return Err(IllustrationError::Config("圖像寬度必須在64-2048之間".to_string()));
            }
        }

        if let Some(height) = request.height {
            if height < 64 || height > 2048 {
                return Err(IllustrationError::Config("圖像高度必須在64-2048之間".to_string()));
            }
        }

        // 檢查透明背景模型限制
        if request.transparent.unwrap_or(false) {
            if let Some(model) = &request.model {
                if !matches!(model, PollinationsModel::GptImage) {
                    return Err(IllustrationError::Config(
                        "透明背景僅支援GptImage模型".to_string()
                    ));
                }
            }
        }

        Ok(())
    }
}

impl Default for PollinationsApiService {
    fn default() -> Self {
        Self::new().expect("Pollinations API服務初始化失敗")
    }
}

/// 便利函數：快速生成圖像
pub async fn quick_generate(
    prompt: &str,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<PollinationsResponse> {
    let service = PollinationsApiService::new()?;
    
    let request = PollinationsRequest {
        prompt: prompt.to_string(),
        width: width.or(Some(1024)),
        height: height.or(Some(1024)),
        model: Some(PollinationsModel::Flux),
        ..Default::default()
    };
    
    service.generate_image(request).await
}

/// 便利函數：為角色生成插畫
pub async fn generate_character_illustration(
    character_name: &str,
    character_description: &str,
    style: &str,
) -> Result<PollinationsResponse> {
    let service = PollinationsApiService::new()?;
    
    let prompt = format!(
        "{} - {}，{}風格，高品質插畫，專業美術",
        character_name, character_description, style
    );
    
    let request = PollinationsRequest {
        prompt,
        width: Some(768),
        height: Some(1024),
        model: Some(PollinationsModel::Flux),
        enhance: Some(true),
        ..Default::default()
    };
    
    service.generate_image(request).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pollinations_service_creation() {
        let service = PollinationsApiService::new();
        assert!(service.is_ok());
    }

    #[test]
    fn test_url_building() {
        let service = PollinationsApiService::new().unwrap();
        let request = PollinationsRequest {
            prompt: "美麗的公主".to_string(),
            width: Some(512),
            height: Some(512),
            model: Some(PollinationsModel::Flux),
            seed: Some(42),
            ..Default::default()
        };
        
        let url = service.build_request_url(&request).unwrap();
        assert!(url.contains("美麗的公主"));
        assert!(url.contains("width=512"));
        assert!(url.contains("height=512"));
        assert!(url.contains("model=flux"));
        assert!(url.contains("seed=42"));
    }

    #[test]
    fn test_model_string_conversion() {
        assert_eq!(PollinationsModel::Flux.as_str(), "flux");
        assert_eq!(PollinationsModel::GptImage.as_str(), "gptimage");
        assert_eq!(PollinationsModel::Kontext.as_str(), "kontext");
        assert_eq!(PollinationsModel::Sdxl.as_str(), "sdxl");
    }
}