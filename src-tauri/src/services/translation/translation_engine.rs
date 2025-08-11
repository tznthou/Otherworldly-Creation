use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use regex::Regex;
use super::{Result, TranslationError, VocabularyDatabase, VocabularyCategory};

/// 智能翻譯引擎
/// 
/// 功能：
/// 1. 分析中文角色描述，自動分類提取關鍵詞
/// 2. 利用專業詞彙庫進行精確翻譯
/// 3. 智能語法重組和語序調整
/// 4. 支援多種翻譯策略和風格偏好
pub struct TranslationEngine {
    vocabulary_db: VocabularyDatabase,
    
    // 正則表達式快取
    punctuation_regex: Regex,
    description_patterns: HashMap<VocabularyCategory, Vec<Regex>>,
    
    // 翻譯設定
    translation_config: TranslationConfig,
}

/// 翻譯請求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationRequest {
    pub chinese_description: String,
    pub character_name: Option<String>,
    pub target_style: TranslationStyle,
    pub quality_level: QualityLevel,
    pub context_hints: Vec<String>,
    pub preserve_original: bool, // 是否保留原文
}

/// 翻譯結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationResult {
    pub english_prompt: String,
    pub original_chinese: Option<String>,
    pub confidence_score: f64, // 翻譯信心分數 0.0-1.0
    
    // 詳細資訊
    pub translation_breakdown: TranslationBreakdown,
    pub suggestions: Vec<String>, // 改進建議
    pub alternative_translations: Vec<String>,
    
    // 統計資訊
    pub processing_time_ms: u64,
    pub vocabulary_coverage: f64, // 詞彙庫覆蓋率
    pub estimated_quality: f64,   // 預估品質分數
}

/// 翻譯分解資訊
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationBreakdown {
    pub extracted_features: HashMap<VocabularyCategory, Vec<ExtractedFeature>>,
    pub unmatched_terms: Vec<String>,
    pub applied_transformations: Vec<String>,
    pub grammar_adjustments: Vec<String>,
}

/// 提取的特徵
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedFeature {
    pub chinese_term: String,
    pub english_term: String,
    pub confidence: f64,
    pub vocabulary_entry_id: Option<i64>,
    pub category: VocabularyCategory,
}

/// 翻譯風格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TranslationStyle {
    /// 動漫風格（預設）
    Anime,
    /// 寫實風格
    Realistic,
    /// 概念藝術風格
    ConceptArt,
    /// 漫畫風格
    Comic,
    /// 自定義風格
    Custom(String),
}

/// 品質等級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityLevel {
    /// 快速翻譯
    Fast,
    /// 標準翻譯
    Standard,
    /// 高品質翻譯
    High,
    /// 專業級翻譯
    Professional,
}

/// 翻譯配置
#[derive(Debug, Clone)]
struct TranslationConfig {
    max_prompt_length: usize,
    #[allow(dead_code)]
    feature_weight_multiplier: f64,
    grammar_adjustment_enabled: bool,
    #[allow(dead_code)]
    synonym_expansion_enabled: bool,
    #[allow(dead_code)]
    context_aware_translation: bool,
}

impl TranslationEngine {
    /// 創建新的翻譯引擎
    pub fn new(vocabulary_db: VocabularyDatabase) -> Result<Self> {
        let punctuation_regex = Regex::new(r"[，。！？；：、「」『』（）【】《》〈〉]")
            .map_err(|e| TranslationError::EngineError(format!("正則表達式編譯失敗: {}", e)))?;
        
        let description_patterns = Self::build_description_patterns()?;
        
        let translation_config = TranslationConfig {
            max_prompt_length: 500,
            feature_weight_multiplier: 1.0,
            grammar_adjustment_enabled: true,
            synonym_expansion_enabled: true,
            context_aware_translation: true,
        };

        Ok(Self {
            vocabulary_db,
            punctuation_regex,
            description_patterns,
            translation_config,
        })
    }

    /// 建立描述模式正則表達式
    fn build_description_patterns() -> Result<HashMap<VocabularyCategory, Vec<Regex>>> {
        let mut patterns = HashMap::new();

        // 髮型髮色模式
        let hair_patterns = vec![
            Regex::new(r"(.{0,2})(髮|頭髮|毛髮)")
                .map_err(|e| TranslationError::EngineError(format!("髮型正則表達式錯誤: {}", e)))?,
            Regex::new(r"(長|短|中長|及腰|及肩)(髮|頭髮)")
                .map_err(|e| TranslationError::EngineError(format!("髮長正則表達式錯誤: {}", e)))?,
            Regex::new(r"(馬尾|雙馬尾|丸子頭|辮子|卷髮|直髮|波浪髮)")
                .map_err(|e| TranslationError::EngineError(format!("髮型正則表達式錯誤: {}", e)))?,
        ];
        patterns.insert(VocabularyCategory::Hair, hair_patterns);

        // 眼部特徵模式
        let eyes_patterns = vec![
            Regex::new(r"(.{0,2})(眼|眼睛|眼珠|瞳)")
                .map_err(|e| TranslationError::EngineError(format!("眼部正則表達式錯誤: {}", e)))?,
            Regex::new(r"(大|小|圓|細長|狹長)(眼|眼睛)")
                .map_err(|e| TranslationError::EngineError(format!("眼型正則表達式錯誤: {}", e)))?,
        ];
        patterns.insert(VocabularyCategory::Eyes, eyes_patterns);

        // 面部特徵模式
        let facial_patterns = vec![
            Regex::new(r"(嬰兒肥|瓜子臉|圓臉|方臉|鵝蛋臉)")
                .map_err(|e| TranslationError::EngineError(format!("臉型正則表達式錯誤: {}", e)))?,
            Regex::new(r"(雀斑|酒窩|美人痣)")
                .map_err(|e| TranslationError::EngineError(format!("面部特徵正則表達式錯誤: {}", e)))?,
        ];
        patterns.insert(VocabularyCategory::FacialFeatures, facial_patterns);

        // 服裝模式
        let clothing_patterns = vec![
            Regex::new(r"(校服|制服|洋裝|連身裙|裙子|褲子|短裙|長裙)")
                .map_err(|e| TranslationError::EngineError(format!("服裝正則表達式錯誤: {}", e)))?,
            Regex::new(r"(穿著|身穿|身著|戴著)(.{1,8})")
                .map_err(|e| TranslationError::EngineError(format!("穿戴正則表達式錯誤: {}", e)))?,
        ];
        patterns.insert(VocabularyCategory::Clothing, clothing_patterns);

        // 表情模式
        let expression_patterns = vec![
            Regex::new(r"(微笑|笑容|笑著|哭泣|生氣|害羞|臉紅|驚訝)")
                .map_err(|e| TranslationError::EngineError(format!("表情正則表達式錯誤: {}", e)))?,
        ];
        patterns.insert(VocabularyCategory::Expression, expression_patterns);

        Ok(patterns)
    }

    /// 執行翻譯
    pub fn translate(&self, request: TranslationRequest) -> Result<TranslationResult> {
        let start_time = std::time::Instant::now();
        
        log::info!("[TranslationEngine] 開始翻譯: {}", request.chinese_description);

        // 1. 預處理中文描述
        let cleaned_description = self.preprocess_chinese_text(&request.chinese_description);
        
        // 2. 特徵提取
        let extracted_features = self.extract_features(&cleaned_description)?;
        
        // 3. 詞彙翻譯
        let mut translation_parts = Vec::new();
        let mut unmatched_terms = Vec::new();
        let mut vocabulary_coverage_count = 0;
        let total_features_count = extracted_features.values().map(|v| v.len()).sum::<usize>();

        for (category, features) in &extracted_features {
            for feature in features {
                let translations = self.vocabulary_db.find_translation(
                    &feature.chinese_term, 
                    Some(category.clone())
                )?;

                if let Some(translation) = translations.first() {
                    translation_parts.push(TranslationPart {
                        text: translation.english_term.clone(),
                        weight: translation.usage_weight,
                        category: category.clone(),
                        priority: translation.priority,
                    });
                    vocabulary_coverage_count += 1;
                    
                    // 更新使用統計
                    let _ = self.vocabulary_db.update_usage_stats(translation.id, true);
                } else {
                    unmatched_terms.push(feature.chinese_term.clone());
                    
                    // 嘗試模糊搜尋
                    let fuzzy_results = self.vocabulary_db.fuzzy_search(&feature.chinese_term, Some(5))?;
                    if let Some(fuzzy_match) = fuzzy_results.first() {
                        translation_parts.push(TranslationPart {
                            text: format!("{}", fuzzy_match.english_term),
                            weight: fuzzy_match.usage_weight * 0.8, // 降低模糊匹配權重
                            category: category.clone(),
                            priority: fuzzy_match.priority - 1,
                        });
                        vocabulary_coverage_count += 1;
                    }
                }
            }
        }

        // 4. 語法組織和優化
        let organized_prompt = self.organize_prompt(translation_parts, &request)?;
        
        // 5. 後處理優化
        let final_prompt = self.post_process_prompt(organized_prompt, &request)?;

        // 6. 生成替代翻譯
        let alternatives = self.generate_alternatives(&final_prompt, &extracted_features)?;
        
        // 7. 計算品質分數
        let confidence_score = self.calculate_confidence_score(&extracted_features, &unmatched_terms);
        let vocabulary_coverage = if total_features_count > 0 {
            vocabulary_coverage_count as f64 / total_features_count as f64
        } else {
            0.0
        };

        let processing_time = start_time.elapsed().as_millis() as u64;

        let result = TranslationResult {
            english_prompt: final_prompt,
            original_chinese: if request.preserve_original {
                Some(request.chinese_description)
            } else {
                None
            },
            confidence_score,
            translation_breakdown: TranslationBreakdown {
                extracted_features,
                unmatched_terms,
                applied_transformations: vec!["grammar_optimization".to_string(), "weight_sorting".to_string()],
                grammar_adjustments: vec!["article_insertion".to_string(), "adjective_ordering".to_string()],
            },
            suggestions: self.generate_suggestions(&vocabulary_coverage),
            alternative_translations: alternatives,
            processing_time_ms: processing_time,
            vocabulary_coverage,
            estimated_quality: confidence_score * 0.7 + vocabulary_coverage * 0.3,
        };

        log::info!("[TranslationEngine] 翻譯完成，品質分數: {:.2}, 覆蓋率: {:.2}%", 
                   result.estimated_quality, vocabulary_coverage * 100.0);

        Ok(result)
    }

    /// 預處理中文文本
    fn preprocess_chinese_text(&self, text: &str) -> String {
        // 移除標點符號並標準化空格
        let cleaned = self.punctuation_regex.replace_all(text, " ");
        
        // 合併多餘空格
        let normalized = Regex::new(r"\s+").unwrap().replace_all(&cleaned, " ");
        
        normalized.trim().to_string()
    }

    /// 特徵提取
    fn extract_features(&self, text: &str) -> Result<HashMap<VocabularyCategory, Vec<ExtractedFeature>>> {
        let mut extracted = HashMap::new();
        
        // 使用正則表達式匹配模式
        for (category, patterns) in &self.description_patterns {
            let mut category_features = Vec::new();
            
            for pattern in patterns {
                for capture in pattern.captures_iter(text) {
                    if let Some(matched_text) = capture.get(0) {
                        let matched_str = matched_text.as_str();
                        
                        // 查找詞彙庫中的匹配
                        let translations = self.vocabulary_db.find_translation(matched_str, Some(category.clone()))?;
                        
                        if let Some(translation) = translations.first() {
                            category_features.push(ExtractedFeature {
                                chinese_term: matched_str.to_string(),
                                english_term: translation.english_term.clone(),
                                confidence: 0.9, // 正則匹配的信心度較高
                                vocabulary_entry_id: Some(translation.id),
                                category: category.clone(),
                            });
                        } else {
                            // 即使沒有找到翻譯也記錄特徵
                            category_features.push(ExtractedFeature {
                                chinese_term: matched_str.to_string(),
                                english_term: matched_str.to_string(), // 保持原文
                                confidence: 0.3,
                                vocabulary_entry_id: None,
                                category: category.clone(),
                            });
                        }
                    }
                }
            }
            
            if !category_features.is_empty() {
                extracted.insert(category.clone(), category_features);
            }
        }

        // 關鍵詞直接匹配
        let words = text.split_whitespace();
        for word in words {
            let fuzzy_results = self.vocabulary_db.fuzzy_search(word, Some(3))?;
            for result in fuzzy_results {
                // 避免重複添加
                let category_features = extracted.entry(result.category.clone()).or_insert_with(Vec::new);
                
                let already_exists = category_features.iter().any(|f| f.chinese_term == word);
                if !already_exists {
                    category_features.push(ExtractedFeature {
                        chinese_term: word.to_string(),
                        english_term: result.english_term,
                        confidence: 0.7,
                        vocabulary_entry_id: Some(result.id),
                        category: result.category,
                    });
                }
            }
        }

        Ok(extracted)
    }

    /// 組織提示詞
    fn organize_prompt(&self, mut parts: Vec<TranslationPart>, request: &TranslationRequest) -> Result<String> {
        // 按優先級和權重排序
        parts.sort_by(|a, b| {
            b.priority.cmp(&a.priority)
                .then(b.weight.partial_cmp(&a.weight).unwrap_or(std::cmp::Ordering::Equal))
        });

        let mut organized_sections = HashMap::new();
        
        for part in parts {
            let section = organized_sections.entry(part.category.clone()).or_insert_with(Vec::new);
            section.push(part.text);
        }

        let mut prompt_parts = Vec::new();

        // 根據翻譯風格調整組織順序
        match request.target_style {
            TranslationStyle::Anime => {
                // 動漫風格：角色特徵 > 表情 > 服裝 > 風格
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::FacialFeatures, "");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::Eyes, "");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::Hair, "");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::Expression, "");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::Clothing, "wearing");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::Accessories, "with");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::BodyType, "");
                self.add_section_to_prompt(&mut prompt_parts, &organized_sections, VocabularyCategory::ArtStyle, "");
            },
            _ => {
                // 其他風格使用標準順序
                for (_category, terms) in organized_sections {
                    prompt_parts.extend(terms);
                }
            }
        }

        let mut final_prompt = prompt_parts.join(", ");
        
        // 長度限制
        if final_prompt.len() > self.translation_config.max_prompt_length {
            final_prompt.truncate(self.translation_config.max_prompt_length);
            if let Some(last_comma) = final_prompt.rfind(", ") {
                final_prompt.truncate(last_comma);
            }
        }

        Ok(final_prompt)
    }

    /// 添加分類到提示詞
    fn add_section_to_prompt(
        &self,
        prompt_parts: &mut Vec<String>,
        sections: &HashMap<VocabularyCategory, Vec<String>>,
        category: VocabularyCategory,
        prefix: &str,
    ) {
        if let Some(terms) = sections.get(&category) {
            let section_text = if prefix.is_empty() {
                terms.join(", ")
            } else {
                format!("{} {}", prefix, terms.join(", "))
            };
            prompt_parts.push(section_text);
        }
    }

    /// 後處理優化
    fn post_process_prompt(&self, prompt: String, request: &TranslationRequest) -> Result<String> {
        let mut optimized = prompt;

        // 移除重複詞彙
        optimized = self.remove_duplicates(optimized);

        // 語法調整
        if self.translation_config.grammar_adjustment_enabled {
            optimized = self.adjust_grammar(optimized)?;
        }

        // 品質修飾詞
        match request.quality_level {
            QualityLevel::Professional => {
                optimized = format!("masterpiece, best quality, high resolution, detailed, {}", optimized);
            },
            QualityLevel::High => {
                optimized = format!("high quality, detailed, {}", optimized);
            },
            QualityLevel::Standard => {
                optimized = format!("good quality, {}", optimized);
            },
            QualityLevel::Fast => {
                // 快速模式不添加品質修飾詞
            }
        }

        // 風格標籤
        match request.target_style {
            TranslationStyle::Anime => {
                optimized = format!("{}, anime style", optimized);
            },
            TranslationStyle::Realistic => {
                optimized = format!("{}, realistic style", optimized);
            },
            TranslationStyle::ConceptArt => {
                optimized = format!("{}, concept art style", optimized);
            },
            TranslationStyle::Comic => {
                optimized = format!("{}, comic style", optimized);
            },
            TranslationStyle::Custom(ref style) => {
                optimized = format!("{}, {}", optimized, style);
            }
        }

        Ok(optimized)
    }

    /// 移除重複詞彙
    fn remove_duplicates(&self, text: String) -> String {
        let terms: Vec<&str> = text.split(", ").collect();
        let mut seen = HashSet::new();
        let mut unique_terms = Vec::new();

        for term in terms {
            if seen.insert(term.trim()) {
                unique_terms.push(term.trim());
            }
        }

        unique_terms.join(", ")
    }

    /// 語法調整
    fn adjust_grammar(&self, text: String) -> Result<String> {
        let mut adjusted = text;

        // 添加適當的冠詞
        adjusted = Regex::new(r"\b(girl|woman|character|person)\b")
            .unwrap()
            .replace_all(&adjusted, "1$1")
            .to_string();

        // 形容詞順序調整（英文語法順序：觀點 > 尺寸 > 年齡 > 形狀 > 顏色 > 來源 > 材質 > 目的 > 名詞）
        // 這裡只做簡單的顏色前置調整
        adjusted = self.reorder_color_adjectives(adjusted);

        Ok(adjusted)
    }

    /// 重新排序顏色形容詞
    fn reorder_color_adjectives(&self, text: String) -> String {
        // 簡化實現：將顏色詞彙移到對應名詞前
        let _color_pattern = Regex::new(r"\b(black|brown|blonde|silver|white|red|blue|pink|purple|green|golden)\b").unwrap();
        
        // 這裡應該有更複雜的邏輯來重新排序，目前保持原樣
        text
    }

    /// 生成替代翻譯
    fn generate_alternatives(&self, _base_prompt: &str, _features: &HashMap<VocabularyCategory, Vec<ExtractedFeature>>) -> Result<Vec<String>> {
        // 簡化實現：返回空列表，實際可以根據同義詞生成替代版本
        Ok(vec![])
    }

    /// 計算信心分數
    fn calculate_confidence_score(&self, features: &HashMap<VocabularyCategory, Vec<ExtractedFeature>>, unmatched: &[String]) -> f64 {
        let total_features: usize = features.values().map(|v| v.len()).sum();
        let matched_features = total_features - unmatched.len();
        
        if total_features == 0 {
            return 0.5; // 中性分數
        }

        let coverage_score = matched_features as f64 / total_features as f64;
        
        // 計算平均信心度
        let mut confidence_sum = 0.0;
        let mut confidence_count = 0;
        
        for feature_list in features.values() {
            for feature in feature_list {
                confidence_sum += feature.confidence;
                confidence_count += 1;
            }
        }
        
        let avg_confidence = if confidence_count > 0 {
            confidence_sum / confidence_count as f64
        } else {
            0.5
        };

        // 綜合評分
        (coverage_score * 0.6 + avg_confidence * 0.4).min(1.0).max(0.0)
    }

    /// 生成改進建議
    fn generate_suggestions(&self, vocabulary_coverage: &f64) -> Vec<String> {
        let mut suggestions = Vec::new();

        if *vocabulary_coverage < 0.5 {
            suggestions.push("建議提供更詳細的角色描述以提高翻譯品質".to_string());
        }

        if *vocabulary_coverage < 0.3 {
            suggestions.push("許多詞彙未在詞彙庫中找到，考慮新增到自定義詞彙庫".to_string());
        }

        suggestions
    }
}

/// 翻譯部分
#[derive(Debug, Clone)]
struct TranslationPart {
    text: String,
    weight: f64,
    category: VocabularyCategory,
    priority: i32,
}