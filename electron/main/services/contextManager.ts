// 重新導出模組化的上下文管理器
export { 
  ContextManager,
  setContextManager, 
  getContextManager 
} from './contextManager/index';

export type { 
  ContextQualityReport, 
  ConsistencyIssue
} from './contextManager/index';