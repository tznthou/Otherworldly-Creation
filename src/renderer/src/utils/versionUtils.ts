import { TempImageData } from '../store/slices/visualCreationSlice';
import { ImageVersion, VersionMetadata, VersionTag } from '../types/versionManagement';

/**
 * 將 TempImageData 轉換為 ImageVersion 格式
 * 用於在圖片生成成功後自動創建版本記錄
 */
export function tempImageToVersion(
  tempImage: TempImageData, 
  options: {
    status?: 'draft' | 'active';
    type?: 'original' | 'revision' | 'branch';
    parentVersionId?: string;
    versionNumber?: number;
    branchName?: string;
  } = {}
): Partial<ImageVersion> {
  const {
    status = 'draft', // 默認為草稿狀態
    type = 'original',
    parentVersionId,
    versionNumber = 1,
    branchName
  } = options;

  // 構建版本標籤
  const tags: VersionTag[] = [
    {
      id: 'provider',
      name: tempImage.provider,
      color: tempImage.provider === 'pollinations' ? '#10b981' : '#3b82f6',
      description: `AI 提供商: ${tempImage.provider}`
    },
    {
      id: 'model',
      name: tempImage.parameters.model,
      color: '#8b5cf6',
      description: `AI 模型: ${tempImage.parameters.model}`
    },
    {
      id: 'style',
      name: tempImage.parameters.style || 'default',
      color: '#f59e0b',
      description: `風格: ${tempImage.parameters.style || '默認'}`
    },
    {
      id: 'pricing',
      name: tempImage.is_free ? 'free' : 'premium',
      color: tempImage.is_free ? '#10b981' : '#ef4444',
      description: tempImage.is_free ? '免費生成' : '付費生成'
    }
  ];

  // 構建版本元資料
  const metadata: VersionMetadata = {
    // 基本資訊
    title: `AI 插畫 - ${tempImage.prompt.slice(0, 30)}...`,
    description: `使用 ${tempImage.provider} 生成的插畫`,
    tags,

    // 技術資訊
    generationTime: tempImage.generation_time_ms,
    fileSize: tempImage.file_size_bytes,
    dimensions: {
      width: tempImage.parameters.width,
      height: tempImage.parameters.height
    },

    // AI 參數
    aiParameters: {
      provider: tempImage.provider,
      model: tempImage.parameters.model,
      seed: tempImage.parameters.seed,
      steps: 20, // 默認值
      guidance: 7.5, // 默認值
      sampler: 'euler_a', // 默認值
      enhance: tempImage.parameters.enhance,
      style: tempImage.parameters.style
    },

    // 使用統計
    viewCount: 0,
    likeCount: 0,
    exportCount: 0,

    // 時間戳記
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 構建 ImageVersion 物件
  const imageVersion: Partial<ImageVersion> = {
    id: `version_${tempImage.id}_${Date.now()}`,
    versionNumber,
    status,
    type,
    
    // 關係資訊
    parentVersionId,
    childVersionIds: [],
    rootVersionId: parentVersionId || `version_${tempImage.id}_${Date.now()}`, // 如果沒有父版本，自己就是根版本
    branchName,
    
    // 內容資訊
    prompt: tempImage.prompt,
    originalPrompt: tempImage.original_prompt,
    imageUrl: tempImage.image_url || tempImage.temp_path,
    tempPath: tempImage.temp_path,
    
    // 專案關聯
    projectId: tempImage.project_id,
    characterId: tempImage.character_id,
    
    // 完整元資料
    metadata,
    
    // 保留原始 TempImageData 以便後續使用
    tempImageData: tempImage
  };

  return imageVersion;
}

/**
 * 生成下一個版本號
 * 基於現有版本列表計算新版本的版本號
 */
export function generateNextVersionNumber(
  existingVersions: ImageVersion[],
  parentVersionId?: string
): number {
  if (!parentVersionId) {
    // 如果沒有父版本，查找所有根版本的最大版本號
    const rootVersions = existingVersions.filter(v => !v.parentVersionId);
    const maxVersion = Math.max(...rootVersions.map(v => v.versionNumber), 0);
    return maxVersion + 1;
  } else {
    // 如果有父版本，查找該父版本的所有子版本的最大版本號
    const siblingVersions = existingVersions.filter(v => v.parentVersionId === parentVersionId);
    const maxVersion = Math.max(...siblingVersions.map(v => v.versionNumber), 0);
    return maxVersion + 1;
  }
}

/**
 * 批量轉換多個 TempImageData 為 ImageVersion
 */
export function batchTempImagesToVersions(
  tempImages: TempImageData[],
  options: {
    batchName?: string;
    batchDescription?: string;
    parentVersionId?: string;
    startVersionNumber?: number;
  } = {}
): Partial<ImageVersion>[] {
  const {
    batchName = 'Batch Generation',
    _batchDescription = '批量生成的插畫',
    parentVersionId,
    startVersionNumber = 1
  } = options;

  return tempImages.map((tempImage, index) => {
    const versionNumber = startVersionNumber + index;
    const branchName = tempImages.length > 1 ? `${batchName}_${index + 1}` : undefined;
    
    return tempImageToVersion(tempImage, {
      status: 'draft',
      type: index === 0 ? 'original' : 'branch',
      parentVersionId: index === 0 ? parentVersionId : undefined,
      versionNumber,
      branchName
    });
  });
}

/**
 * 驗證版本數據完整性
 */
export function validateVersionData(versionData: Partial<ImageVersion>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!versionData.id) {
    errors.push('版本 ID 不能為空');
  }

  if (!versionData.prompt?.trim()) {
    errors.push('提示詞不能為空');
  }

  if (!versionData.imageUrl && !versionData.tempPath) {
    errors.push('必須提供圖片 URL 或臨時路徑');
  }

  if (versionData.versionNumber && versionData.versionNumber < 1) {
    errors.push('版本號必須大於 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}