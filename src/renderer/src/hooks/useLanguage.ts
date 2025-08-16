import { useAppSelector, useAppDispatch } from './redux';
import { updateSettings } from '../store/slices/settingsSlice';

export type SupportedLanguage = 'zh-TW' | 'zh-CN' | 'en' | 'ja';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  implemented: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'zh-TW',
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    flag: '🇹🇼',
    rtl: false,
    implemented: true, // 目前唯一完全實現的語言
  },
  {
    code: 'zh-CN',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    flag: '🇨🇳',
    rtl: false,
    implemented: false, // 待實現
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    implemented: false, // 待實現
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
    implemented: false, // 待實現
  },
];

/**
 * 語言管理 Hook
 * 
 * TODO: 未來語言切換功能規劃
 * 1. 實現 i18n 系統 (react-i18next)
 * 2. 翻譯所有 UI 文字
 * 3. 支援 AI 模型多語言提示詞
 * 4. 處理 RTL 語言支援
 * 5. 動態字體載入
 */
export const useLanguage = () => {
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector(state => state.settings.settings.language);
  
  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage);
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.implemented);
  
  const changeLanguage = (languageCode: SupportedLanguage) => {
    const targetLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
    
    if (!targetLanguage?.implemented) {
      console.warn(`語言 ${languageCode} 尚未實現`);
      return;
    }
    
    dispatch(updateSettings({ language: languageCode }));
    
    // TODO: 實際的語言切換邏輯
    // 1. 更新 i18n 語言
    // 2. 更新 document.documentElement.lang
    // 3. 觸發字體重新載入
    // 4. 更新 AI 提示詞語言
  };
  
  return {
    currentLanguage,
    currentLanguageInfo,
    availableLanguages,
    allLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    isLanguageSupported: (code: string): code is SupportedLanguage => 
      SUPPORTED_LANGUAGES.some(lang => lang.code === code && lang.implemented),
  };
};