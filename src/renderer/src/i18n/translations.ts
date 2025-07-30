import { Language } from './index';

// 動態載入翻譯檔案的類別
class TranslationLoader {
  private loadedTranslations: Record<Language, any> = {};
  private loadingPromises: Record<Language, Promise<any>> = {};

  async loadTranslation(language: Language): Promise<any> {
    // 如果已經載入過，直接返回
    if (this.loadedTranslations[language]) {
      return this.loadedTranslations[language];
    }

    // 如果正在載入中，返回載入中的 Promise
    if (this.loadingPromises[language]) {
      return this.loadingPromises[language];
    }

    // 開始載入翻譯檔案
    this.loadingPromises[language] = this.doLoadTranslation(language);
    
    try {
      const translation = await this.loadingPromises[language];
      this.loadedTranslations[language] = translation;
      return translation;
    } catch (error) {
      console.error(`Failed to load translation for ${language}:`, error);
      // 載入失敗時清除 Promise，下次可以重新嘗試
      delete this.loadingPromises[language];
      throw error;
    }
  }

  private async doLoadTranslation(language: Language): Promise<any> {
    try {
      // 動態匯入對應的 JSON 檔案
      const module = await import(`./locales/${language}.json`);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to import translation file for ${language}:`, error);
      
      // 回退到預設的繁體中文
      if (language !== 'zh-TW') {
        console.warn(`Falling back to zh-TW for ${language}`);
        return this.loadTranslation('zh-TW');
      }
      
      // 如果連繁體中文都載入失敗，返回基本的翻譯
      return {
        common: {
          loading: '載入中...',
          error: '錯誤',
          success: '成功'
        },
        app: {
          title: '創世紀元',
          subtitle: '異世界創作神器'
        }
      };
    }
  }

  // 預載入所有語言的翻譯檔案
  async preloadAllTranslations(): Promise<void> {
    const languages: Language[] = ['zh-TW', 'zh-CN', 'en', 'ja'];
    
    try {
      await Promise.all(
        languages.map(lang => this.loadTranslation(lang))
      );
      console.log('All translations preloaded successfully');
    } catch (error) {
      console.warn('Some translations failed to preload:', error);
    }
  }

  // 取得已載入的翻譯
  getLoadedTranslation(language: Language): any | null {
    return this.loadedTranslations[language] || null;
  }

  // 清除快取
  clearCache(): void {
    this.loadedTranslations = {};
    this.loadingPromises = {};
  }
}

// 建立全域的翻譯載入器實例
export const translationLoader = new TranslationLoader();

// 為了向後相容，匯出一個函數來取得翻譯
export const getTranslations = async (): Promise<Record<Language, any>> => {
  const languages: Language[] = ['zh-TW', 'zh-CN', 'en', 'ja'];
  const result: Record<Language, any> = {} as Record<Language, any>;
  
  for (const lang of languages) {
    result[lang] = await translationLoader.loadTranslation(lang);
  }
  
  return result;
};

// 舊的靜態匯出（為了向後相容，但建議使用動態載入）
export const translations: Record<Language, any> = {} as Record<Language, any>;