// 國際化系統
import { translationLoader } from './translations';

export type Language = 'zh-TW' | 'zh-CN' | 'en' | 'ja';

class I18nService {
  private currentLanguage: Language = 'zh-TW';
  private listeners: Array<(language: Language) => void> = [];
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // 預載入所有翻譯檔案
      await translationLoader.preloadAllTranslations();
      this.isInitialized = true;
      console.log('I18n system initialized successfully');
    } catch (_error) {
      console.error('Failed to initialize i18n system:', _error);
      // 即使失敗也標記為已初始化，避免重複嘗試
      this.isInitialized = true;
    }
  }

  async setLanguage(language: Language) {
    this.currentLanguage = language;
    
    // 確保該語言的翻譯已載入
    try {
      await translationLoader.loadTranslation(language);
    } catch (_error) {
      console.warn(`Failed to load translation for ${language}, keeping current language`);
    }
    
    this.listeners.forEach(listener => listener(language));
  }

  getLanguage() {
    return this.currentLanguage;
  }

  async translate(key: string, params?: Record<string, string>): Promise<string> {
    try {
      // 確保 i18n 系統已初始化
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 載入當前語言的翻譯
      const currentTranslation = await translationLoader.loadTranslation(this.currentLanguage);
      const value = this.getValueByKey(currentTranslation, key);
      
      if (typeof value === 'string') {
        return this.interpolateParams(value, params);
      }

      // 如果當前語言找不到，回退到繁體中文
      if (this.currentLanguage !== 'zh-TW') {
        const fallbackTranslation = await translationLoader.loadTranslation('zh-TW');
        const fallbackValue = this.getValueByKey(fallbackTranslation, key);
        
        if (typeof fallbackValue === 'string') {
          console.warn(`Translation missing for ${key} in ${this.currentLanguage}, using zh-TW`);
          return this.interpolateParams(fallbackValue, params);
        }
      }

      // 都找不到時返回 key 本身
      console.warn(`找不到翻譯: ${key}`);
      return key;
    } catch (_error) {
      console.error(`Translation failed for key ${key}:`, _error);
      return key;
    }
  }

  // 同步版本的翻譯函數（使用已載入的翻譯）
  translateSync(key: string, params?: Record<string, string>): string {
    const currentTranslation = translationLoader.getLoadedTranslation(this.currentLanguage);
    if (!currentTranslation) {
      console.warn(`Translation not loaded for ${this.currentLanguage}, returning key`);
      return key;
    }

    const value = this.getValueByKey(currentTranslation, key);
    if (typeof value === 'string') {
      return this.interpolateParams(value, params);
    }

    // 回退到繁體中文
    if (this.currentLanguage !== 'zh-TW') {
      const fallbackTranslation = translationLoader.getLoadedTranslation('zh-TW');
      if (fallbackTranslation) {
        const fallbackValue = this.getValueByKey(fallbackTranslation, key);
        if (typeof fallbackValue === 'string') {
          return this.interpolateParams(fallbackValue, params);
        }
      }
    }

    console.warn(`找不到翻譯: ${key}`);
    return key;
  }

  private getValueByKey(translation: any, key: string): any {
    const keys = key.split('.');
    let value = translation;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private interpolateParams(text: string, params?: Record<string, string>): string {
    if (!params) return text;
    
    let result = text;
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
    });
    
    return result;
  }

  addLanguageChangeListener(listener: (language: Language) => void) {
    this.listeners.push(listener);
  }

  removeLanguageChangeListener(listener: (language: Language) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

export const i18n = new I18nService();

// 非同步翻譯函數
export const t = async (key: string, params?: Record<string, string>) => i18n.translate(key, params);

// 同步翻譯函數（使用已載入的翻譯）
export const tSync = (key: string, params?: Record<string, string>) => i18n.translateSync(key, params);