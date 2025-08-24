import { Editor } from 'slate';

/**
 * 驗證結果類型
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

/**
 * AI生成配置類型
 */
export interface GenerationConfig {
  model?: string | null;
  provider?: string | null;
  editor?: Editor | null;
  chapterId?: string;
  projectId?: string;
}

/**
 * 驗證服務 - 專門處理AI生成前的所有驗證邏輯
 * 
 * 職責：
 * - 驗證AI模型選擇
 * - 驗證編輯器狀態  
 * - 驗證提供商配置
 * - 統一的驗證錯誤處理
 */
export class ValidationService {
  
  /**
   * 驗證AI模型是否已選擇
   */
  validateModel(model: string | null): ValidationResult {
    if (!model) {
      return {
        isValid: false,
        error: '請先選擇一個 AI 模型',
        code: 'MODEL_NOT_SELECTED'
      };
    }

    return { isValid: true };
  }

  /**
   * 驗證編輯器是否準備就緒
   */
  validateEditor(editor: Editor | null): ValidationResult {
    if (!editor) {
      return {
        isValid: false,
        error: '編輯器未準備好，請稍後再試',
        code: 'EDITOR_NOT_READY'
      };
    }

    return { isValid: true };
  }

  /**
   * 驗證AI提供商是否已配置
   */
  validateProvider(providerId: string | null): ValidationResult {
    if (!providerId) {
      return {
        isValid: false,
        error: '請先在設定中選擇 AI 提供商和模型',
        code: 'PROVIDER_NOT_CONFIGURED'
      };
    }

    return { isValid: true };
  }

  /**
   * 驗證專案和章節ID
   */
  validateChapterContext(projectId?: string, chapterId?: string): ValidationResult {
    if (!projectId) {
      return {
        isValid: false,
        error: '專案ID不存在',
        code: 'PROJECT_ID_MISSING'
      };
    }

    if (!chapterId) {
      return {
        isValid: false,
        error: '章節ID不存在',
        code: 'CHAPTER_ID_MISSING'
      };
    }

    return { isValid: true };
  }

  /**
   * 執行所有驗證檢查
   */
  validateAll(config: GenerationConfig): ValidationResult {
    // 1. 驗證模型
    const modelResult = this.validateModel(config.model || null);
    if (!modelResult.isValid) return modelResult;

    // 2. 驗證編輯器
    const editorResult = this.validateEditor(config.editor || null);
    if (!editorResult.isValid) return editorResult;

    // 3. 驗證提供商
    const providerResult = this.validateProvider(config.provider || null);
    if (!providerResult.isValid) return providerResult;

    // 4. 驗證章節上下文
    const contextResult = this.validateChapterContext(config.projectId, config.chapterId);
    if (!contextResult.isValid) return contextResult;

    return { isValid: true };
  }
}

/**
 * 單例實例
 */
export const validationService = new ValidationService();