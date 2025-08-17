import { useCallback } from 'react';
import { useAppSelector } from './redux';
import { soundManager } from '../services/SoundManager';

export interface SoundHookReturn {
  playClick: () => Promise<void>;
  playSuccess: () => Promise<void>;
  playError: () => Promise<void>;
  playNotification: () => Promise<void>;
  playTyping: () => Promise<void>;
  playSave: () => Promise<void>;
  playTone: (frequency: number, duration: number, type?: OscillatorType) => Promise<void>;
  isEnabled: boolean;
}

export const useSound = (): SoundHookReturn => {
  const { soundEnabled } = useAppSelector(state => state.settings.settings.ui);

  // 更新音效管理器的啟用狀態
  soundManager.setEnabled(soundEnabled);

  const playClick = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playClickSound();
    }
  }, [soundEnabled]);

  const playSuccess = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playSuccessSound();
    }
  }, [soundEnabled]);

  const playError = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playErrorSound();
    }
  }, [soundEnabled]);

  const playNotification = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playNotificationSound();
    }
  }, [soundEnabled]);

  const playTyping = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playTypingSound();
    }
  }, [soundEnabled]);

  const playSave = useCallback(async () => {
    if (soundEnabled) {
      await soundManager.playSaveSound();
    }
  }, [soundEnabled]);

  const playTone = useCallback(async (frequency: number, duration: number, type?: OscillatorType) => {
    if (soundEnabled) {
      await soundManager.generateAndPlayTone(frequency, duration, type);
    }
  }, [soundEnabled]);

  return {
    playClick,
    playSuccess,
    playError,
    playNotification,
    playTyping,
    playSave,
    playTone,
    isEnabled: soundEnabled,
  };
};