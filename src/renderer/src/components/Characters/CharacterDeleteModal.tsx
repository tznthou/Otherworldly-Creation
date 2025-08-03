import React, { useState, useEffect, useCallback } from 'react';
import { Character } from '../../types/character';

interface CharacterReference {
  type: 'chapter' | 'relationship';
  id: string;
  title?: string;
  projectName?: string;
  occurrences?: number;
  preview?: string;
  relationshipType?: string;
  relatedCharacter?: string;
  description?: string;
  direction?: 'incoming' | 'outgoing';
}

interface ReferenceCheckResult {
  references: CharacterReference[];
  characterName: string;
  totalReferences: number;
}

interface CharacterDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (forceDelete: boolean) => Promise<void>;
  character: Character | null;
}

export const CharacterDeleteModal: React.FC<CharacterDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  character,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingReferences, setCheckingReferences] = useState(false);
  const [referenceCheck, setReferenceCheck] = useState<ReferenceCheckResult | null>(null);
  const [showReferences, setShowReferences] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  useEffect(() => {
    if (isOpen && character) {
      checkReferences();
    } else {
      setReferenceCheck(null);
      setShowReferences(false);
      setForceDelete(false);
    }
  }, [isOpen, character, checkReferences]);

  const checkReferences = useCallback(async () => {
    if (!character) return;
    
    try {
      setCheckingReferences(true);
      // TODO: 實現角色引用檢查功能
      // 暫時返回空的引用結果
      const result = {
        references: [],
        characterName: character.name,
        totalReferences: 0,
        canDeleteSafely: true
      };
      setReferenceCheck(result);
      setShowReferences(result.references.length > 0);
    } catch (error) {
      console.error('檢查角色引用失敗:', error);
    } finally {
      setCheckingReferences(false);
    }
  }, [character]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(forceDelete);
      onClose();
    } catch (error) {
      console.error('刪除角色失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !character) return null;

  const hasReferences = referenceCheck && referenceCheck.references.length > 0;
  const chapterReferences = referenceCheck?.references.filter(ref => ref.type === 'chapter') || [];
  const relationshipReferences = referenceCheck?.references.filter(ref => ref.type === 'relationship') || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              刪除角色確認
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          {checkingReferences ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">正在檢查角色引用...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 基本確認訊息 */}
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  您確定要刪除角色「{character.name}」嗎？
                </h3>
                <p className="text-gray-600">
                  此操作無法復原，角色的所有資料將被永久刪除。
                </p>
              </div>

              {/* 引用檢查結果 */}
              {referenceCheck && (
                <>
                  {hasReferences ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-red-800">
                            發現 {referenceCheck.totalReferences} 個引用
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            此角色在故事中被引用，刪除可能會影響故事的連貫性。
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-green-800">
                            未發現引用
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            此角色在故事中沒有被引用，可以安全刪除。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 引用詳情 */}
                  {showReferences && hasReferences && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900">引用詳情：</h4>
                      
                      {/* 章節引用 */}
                      {chapterReferences.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            章節引用 ({chapterReferences.length})
                          </h5>
                          <div className="space-y-2">
                            {chapterReferences.map((ref, index) => (
                              <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-900">{ref.title}</span>
                                  <span className="text-xs text-gray-500">
                                    出現 {ref.occurrences} 次
                                  </span>
                                </div>
                                {ref.preview && (
                                  <p className="text-sm text-gray-600 italic">
                                    "{ref.preview}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 關係引用 */}
                      {relationshipReferences.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            角色關係 ({relationshipReferences.length})
                          </h5>
                          <div className="space-y-2">
                            {relationshipReferences.map((ref, index) => (
                              <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {ref.relatedCharacter}
                                  </span>
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {ref.relationshipType}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({ref.direction === 'outgoing' ? '對方' : '來自'})
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {ref.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 強制刪除選項 */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id="forceDelete"
                            checked={forceDelete}
                            onChange={(e) => setForceDelete(e.target.checked)}
                            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <label htmlFor="forceDelete" className="text-sm font-medium text-yellow-800">
                              我了解風險，仍要強制刪除
                            </label>
                            <p className="text-sm text-yellow-700 mt-1">
                              勾選此選項將忽略所有引用警告並強制刪除角色。請確保您已經手動處理了相關的引用。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 按鈕列 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || checkingReferences || (!!hasReferences && !forceDelete)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              !!hasReferences && !forceDelete
                ? 'bg-gray-400'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>刪除中...</span>
              </div>
            ) : (
              !!hasReferences && !forceDelete ? '無法刪除' : '確認刪除'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};