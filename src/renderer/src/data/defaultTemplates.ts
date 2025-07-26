// 從分離的模板檔案匯入所有模板
import { isekaiTemplate } from './templates/isekaiTemplate';
import { schoolTemplate } from './templates/schoolTemplate';
import { scifiTemplate } from './templates/scifiTemplate';
import { fantasyTemplate } from './templates/fantasyTemplate';
import { NovelTemplate } from '../types/template';

// 重新匯出個別模板（向後相容）
export { isekaiTemplate } from './templates/isekaiTemplate';
export { schoolTemplate } from './templates/schoolTemplate';
export { scifiTemplate } from './templates/scifiTemplate';
export { fantasyTemplate } from './templates/fantasyTemplate';

// 導出所有預設模板
export const defaultTemplates: NovelTemplate[] = [
  isekaiTemplate,
  schoolTemplate,
  scifiTemplate,
  fantasyTemplate
];