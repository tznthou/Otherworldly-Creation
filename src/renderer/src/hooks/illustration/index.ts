// AI 插畫系統 Custom Hooks
// 統一導出所有插畫相關的 hooks

export {
  useCharacterSelection,
  type UseCharacterSelectionOptions,
  type UseCharacterSelectionReturn,
} from './useCharacterSelection';

export {
  useIllustrationService,
  type UseIllustrationServiceOptions,
  type UseIllustrationServiceReturn,
  type IllustrationProvider,
  type PollinationsModel,
  type PollinationsStyle,
  type ColorMode,
  type ApiKeySource,
} from './useIllustrationService';

export {
  useBatchConfiguration,
  type UseBatchConfigurationOptions,
  type UseBatchConfigurationReturn,
  type BatchConfiguration,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationRule,
} from './useBatchConfiguration';

export {
  useStyleTemplates,
  type UseStyleTemplatesOptions,
  type UseStyleTemplatesReturn,
} from './useStyleTemplates';

export {
  useSmartPrompts,
  type UseSmartPromptsOptions,
  type UseSmartPromptsReturn,
  type PromptSuggestion,
  type PromptCategory,
  type SmartPromptAnalysis,
} from './useSmartPrompts';

// 版本管理系統 Hooks
export {
  useVersionManager,
  type UseVersionManagerReturn,
} from './useVersionManager';

export {
  useVersionComparison,
  type UseVersionComparisonReturn,
} from './useVersionComparison';

export {
  useVersionHistory,
  type UseVersionHistoryReturn,
} from './useVersionHistory';

export {
  useVersionBranching,
  type UseVersionBranchingReturn,
} from './useVersionBranching';

export {
  useAutoVersionCreation,
} from './useAutoVersionCreation';

// TODO: 待實作的其他 hooks
// export { useBatchRequests } from './useBatchRequests';
// export { useBatchProgress } from './useBatchProgress';