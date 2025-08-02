use regex::Regex;
use std::collections::HashSet;

/// 語言純度檢測和增強工具
pub struct LanguagePurityEnforcer {
    english_pattern: Regex,
    simplified_chars: HashSet<char>,
    forbidden_patterns: Vec<Regex>,
}

impl LanguagePurityEnforcer {
    pub fn new() -> Self {
        // 英文字母檢測
        let english_pattern = Regex::new(r"[a-zA-Z]+").unwrap();
        
        // 常見簡體字集合
        let simplified_chars: HashSet<char> = [
            '国', '际', '时', '会', '这', '说', '对', '进', '发', '现', '经', '过',
            '与', '从', '来', '到', '学', '问', '题', '样', '关', '系', '间',
            '实', '理', '定', '期', '内', '开', '始', '结', '束', '处', '理',
            '应', '该', '就', '还', '能', '够', '完', '成', '办', '法', '业',
            '务', '号', '码', '电', '话', '联', '系', '络', '网', '站', '页',
            '面', '版', '权', '声', '明', '条', '款', '协', '议', '规', '则',
            '员', '户', '级', '别', '类', '型', '产', '品', '服', '务', '价',
            '格', '费', '用', '支', '付', '账', '单', '记', '录', '历', '史',
            '变', '更', '修', '改', '删', '除', '添', '加', '创', '建', '编',
            '辑', '查', '看', '显', '示', '隐', '藏', '打', '开', '关', '闭'
        ].iter().cloned().collect();
        
        // 禁止的模式
        let forbidden_patterns = vec![
            Regex::new(r"(?i)\b(magic|dragon|sword|hero|castle|kingdom|princess|prince|knight|wizard|spell|potion)\b").unwrap(),
            Regex::new(r"(?i)\b(okay|ok|yes|no|hello|hi|bye|sorry|please|thank|you)\b").unwrap(),
            Regex::new(r"[A-Z]{2,}").unwrap(), // 全大寫英文縮寫
            Regex::new(r"\b[a-z]+[A-Z][a-z]*\b").unwrap(), // 駝峰命名
        ];
        
        Self {
            english_pattern,
            simplified_chars,
            forbidden_patterns,
        }
    }
    
    /// 檢測文本中的語言純度問題
    pub fn analyze_purity(&self, text: &str) -> PurityAnalysis {
        let mut issues = Vec::new();
        
        // 檢測英文字母
        if let Some(matches) = self.detect_english_words(text) {
            issues.extend(matches.into_iter().map(|word| PurityIssue {
                issue_type: IssueType::EnglishWords,
                content: word,
                severity: Severity::High,
            }));
        }
        
        // 檢測簡體字
        if let Some(chars) = self.detect_simplified_chinese(text) {
            issues.extend(chars.into_iter().map(|ch| PurityIssue {
                issue_type: IssueType::SimplifiedChinese,
                content: ch.to_string(),
                severity: Severity::Medium,
            }));
        }
        
        // 檢測禁止模式
        for pattern in &self.forbidden_patterns {
            for mat in pattern.find_iter(text) {
                issues.push(PurityIssue {
                    issue_type: IssueType::ForbiddenPattern,
                    content: mat.as_str().to_string(),
                    severity: Severity::High,
                });
            }
        }
        
        let purity_score = self.calculate_purity_score(text, &issues);
        
        PurityAnalysis {
            issues,
            purity_score,
            is_pure: purity_score >= 0.95,
        }
    }
    
    /// 檢測英文單詞
    fn detect_english_words(&self, text: &str) -> Option<Vec<String>> {
        let matches: Vec<String> = self.english_pattern
            .find_iter(text)
            .map(|m| m.as_str().to_string())
            .collect();
        
        if matches.is_empty() {
            None
        } else {
            Some(matches)
        }
    }
    
    /// 檢測簡體字
    fn detect_simplified_chinese(&self, text: &str) -> Option<Vec<char>> {
        let simplified: Vec<char> = text.chars()
            .filter(|&c| self.simplified_chars.contains(&c))
            .collect();
        
        if simplified.is_empty() {
            None
        } else {
            Some(simplified)
        }
    }
    
    /// 計算純度分數
    fn calculate_purity_score(&self, text: &str, issues: &[PurityIssue]) -> f64 {
        if text.is_empty() {
            return 1.0;
        }
        
        let total_chars = text.chars().count() as f64;
        let mut penalty = 0.0;
        
        for issue in issues {
            let weight = match issue.severity {
                Severity::High => 0.1,
                Severity::Medium => 0.05,
                Severity::Low => 0.02,
            };
            penalty += weight * issue.content.chars().count() as f64;
        }
        
        (1.0 - (penalty / total_chars)).max(0.0)
    }
    
    /// 生成增強的系統提示
    pub fn generate_enhanced_system_prompt(&self, base_prompt: &str) -> String {
        let purity_enforcement = "

【語言純度強制要求】
CRITICAL - 語言純度控制:
1. 絕對禁止使用任何英文字母 (a-z, A-Z)
2. 嚴格禁止簡體字，必須使用正統繁體中文
3. 禁用詞彙清單：
   - 英文單詞：magic, dragon, sword, hero, castle, kingdom 等
   - 簡體字：国际时会这说对进发现经过等
   - 拼音或英文縮寫
4. 違反語言純度要求將被視為嚴重錯誤
5. 所有專有名詞、動作描述、情感表達都必須使用繁體中文
6. 使用傳統中文表達方式，避免現代網路用語或外來語

【檢查清單】
生成前自我檢查：
□ 是否包含英文字母？
□ 是否包含簡體字？
□ 是否使用了禁用詞彙？
□ 表達是否符合繁體中文習慣？

只有通過所有檢查項目才能輸出內容。";

        format!("{}{}", base_prompt, purity_enforcement)
    }
    
    /// 為生成參數添加純度約束
    pub fn enhance_generation_options(&self, mut options: serde_json::Map<String, serde_json::Value>) -> serde_json::Map<String, serde_json::Value> {
        // 降低溫度以減少創造性錯誤
        options.insert("temperature".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(0.6).unwrap()));
        
        // 增加重複懲罰
        options.insert("frequency_penalty".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(0.2).unwrap()));
        
        // 添加停止詞
        let stop_words = vec![
            serde_json::Value::String("Note:".to_string()),
            serde_json::Value::String("English:".to_string()),
            serde_json::Value::String("Translation:".to_string()),
        ];
        options.insert("stop".to_string(), serde_json::Value::Array(stop_words));
        
        options
    }
}

/// 語言純度分析結果
#[derive(Debug)]
pub struct PurityAnalysis {
    pub issues: Vec<PurityIssue>,
    pub purity_score: f64,
    pub is_pure: bool,
}

/// 語言純度問題
#[derive(Debug)]
pub struct PurityIssue {
    pub issue_type: IssueType,
    pub content: String,
    pub severity: Severity,
}

#[derive(Debug)]
pub enum IssueType {
    EnglishWords,
    SimplifiedChinese,
    ForbiddenPattern,
}

#[derive(Debug)]
pub enum Severity {
    High,
    Medium,
    #[allow(dead_code)]
    Low,
}

impl Default for LanguagePurityEnforcer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_english_detection() {
        let enforcer = LanguagePurityEnforcer::new();
        let analysis = enforcer.analyze_purity("這是一個 magic 的世界");
        
        assert!(!analysis.is_pure);
        assert!(!analysis.issues.is_empty());
        assert!(analysis.issues.iter().any(|issue| matches!(issue.issue_type, IssueType::EnglishWords)));
    }
    
    #[test]
    fn test_simplified_chinese_detection() {
        let enforcer = LanguagePurityEnforcer::new();
        let analysis = enforcer.analyze_purity("这是一个国际化的应用");
        
        assert!(!analysis.is_pure);
        assert!(!analysis.issues.is_empty());
        assert!(analysis.issues.iter().any(|issue| matches!(issue.issue_type, IssueType::SimplifiedChinese)));
    }
    
    #[test]
    fn test_pure_traditional_chinese() {
        let enforcer = LanguagePurityEnforcer::new();
        let analysis = enforcer.analyze_purity("這是一個純正的繁體中文文本，沒有任何問題。");
        
        assert!(analysis.is_pure);
        assert!(analysis.issues.is_empty());
        assert!(analysis.purity_score > 0.95);
    }
}