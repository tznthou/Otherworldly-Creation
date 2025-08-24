use crate::services::translation::TranslationStyle;

/// 風格解析器 - 負責將字串風格參數轉換為 TranslationStyle 枚舉
/// 
/// 這個模組的目的是：
/// 1. 統一風格參數解析邏輯
/// 2. 避免在多個地方重複風格轉換代碼
/// 3. 提供清晰的風格映射關係
pub struct StyleResolver;

impl StyleResolver {
    /// 將字串風格參數解析為 TranslationStyle 枚舉
    /// 
    /// # 參數
    /// * `style_str` - 可選的風格字串，通常來自前端用戶選擇
    /// 
    /// # 支援的風格
    /// * "realistic" -> 寫實風格
    /// * "anime" -> 動漫風格
    /// * "concept_art" -> 概念藝術風格
    /// * "comic" -> 漫畫風格
    /// * 其他字串 -> 自定義風格
    /// * None 或空值 -> 預設動漫風格
    /// 
    /// # 範例
    /// ```rust
    /// let style = StyleResolver::resolve_translation_style(Some("realistic"));
    /// assert_eq!(style, TranslationStyle::Realistic);
    /// 
    /// let default_style = StyleResolver::resolve_translation_style(None);
    /// assert_eq!(default_style, TranslationStyle::Anime);
    /// ```
    pub fn resolve_translation_style(style_str: Option<&str>) -> TranslationStyle {
        match style_str {
            Some("realistic") => TranslationStyle::Realistic,
            Some("anime") => TranslationStyle::Anime,
            Some("concept_art") => TranslationStyle::ConceptArt,
            Some("comic") => TranslationStyle::Comic,
            Some(custom) => TranslationStyle::Custom(custom.to_string()),
            None => TranslationStyle::Anime, // 預設值
        }
    }
    
    /// 獲取所有支援的標準風格列表
    /// 
    /// # 返回值
    /// 返回所有支援的標準風格字串列表，不包括自定義風格
    pub fn get_supported_styles() -> Vec<&'static str> {
        vec!["anime", "realistic", "concept_art", "comic"]
    }
    
    /// 檢查給定的風格字串是否為支援的標準風格
    /// 
    /// # 參數
    /// * `style_str` - 要檢查的風格字串
    /// 
    /// # 返回值
    /// 如果是支援的標準風格返回 true，否則返回 false
    pub fn is_standard_style(style_str: &str) -> bool {
        Self::get_supported_styles().contains(&style_str)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_realistic_style() {
        let style = StyleResolver::resolve_translation_style(Some("realistic"));
        assert!(matches!(style, TranslationStyle::Realistic));
    }

    #[test]
    fn test_resolve_anime_style() {
        let style = StyleResolver::resolve_translation_style(Some("anime"));
        assert!(matches!(style, TranslationStyle::Anime));
    }

    #[test]
    fn test_resolve_concept_art_style() {
        let style = StyleResolver::resolve_translation_style(Some("concept_art"));
        assert!(matches!(style, TranslationStyle::ConceptArt));
    }

    #[test]
    fn test_resolve_comic_style() {
        let style = StyleResolver::resolve_translation_style(Some("comic"));
        assert!(matches!(style, TranslationStyle::Comic));
    }

    #[test]
    fn test_resolve_custom_style() {
        let style = StyleResolver::resolve_translation_style(Some("custom_style"));
        if let TranslationStyle::Custom(custom) = style {
            assert_eq!(custom, "custom_style");
        } else {
            panic!("Expected Custom style");
        }
    }

    #[test]
    fn test_resolve_none_defaults_to_anime() {
        let style = StyleResolver::resolve_translation_style(None);
        assert!(matches!(style, TranslationStyle::Anime));
    }

    #[test]
    fn test_get_supported_styles() {
        let styles = StyleResolver::get_supported_styles();
        assert_eq!(styles.len(), 4);
        assert!(styles.contains(&"anime"));
        assert!(styles.contains(&"realistic"));
        assert!(styles.contains(&"concept_art"));
        assert!(styles.contains(&"comic"));
    }

    #[test]
    fn test_is_standard_style() {
        assert!(StyleResolver::is_standard_style("realistic"));
        assert!(StyleResolver::is_standard_style("anime"));
        assert!(!StyleResolver::is_standard_style("custom_unknown"));
    }
}