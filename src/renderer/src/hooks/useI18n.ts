import { useEffect, useState } from 'react';
import { useAppSelector } from './redux';
import { i18n, Language, tSync } from '../i18n';

/**
 * 國際化 Hook
 * 自動根據設定中的語言變更 i18n 系統的語言
 */
export const useI18n = () => {
  const { settings } = useAppSelector(state => state.settings);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(i18n.getLanguage());
  const [isReady, setIsReady] = useState(false);

  // 初始化 i18n 系統
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        await i18n.initialize();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsReady(true); // 即使失敗也標記為準備就緒
      }
    };

    initializeI18n();
  }, []);

  // 當設定中的語言變更時，更新 i18n 系統
  useEffect(() => {
    const updateLanguage = async () => {
      if (settings.language && settings.language !== currentLanguage && isReady) {
        try {
          await i18n.setLanguage(settings.language);
          setCurrentLanguage(settings.language);
          
          // 更新 HTML 標籤的 lang 屬性
          document.documentElement.setAttribute('lang', settings.language);
          
          console.log(`語言已切換至: ${settings.language}`);
        } catch (error) {
          console.error(`Failed to switch language to ${settings.language}:`, error);
        }
      }
    };

    updateLanguage();
  }, [settings.language, currentLanguage, isReady]);

  // 監聽語言變更
  useEffect(() => {
    const handleLanguageChange = (language: Language) => {
      setCurrentLanguage(language);
    };

    i18n.addLanguageChangeListener(handleLanguageChange);

    return () => {
      i18n.removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

  return {
    language: currentLanguage,
    isReady,
    t: tSync, // 使用同步版本，因為 React 組件需要同步渲染
    setLanguage: async (language: Language) => {
      try {
        await i18n.setLanguage(language);
      } catch (error) {
        console.error(`Failed to set language to ${language}:`, error);
      }
    }
  };
};