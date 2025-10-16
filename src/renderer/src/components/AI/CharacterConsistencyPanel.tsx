/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: 需要完整重構此組件的類型定義，當前使用 any 類型作為臨時解決方案
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { api } from '../../api';
import { 
  ConsistencyReport, 
  CharacterConsistencyReport,
  VisualTraits 
} from '../../types/illustration';
import CosmicButton from '../UI/CosmicButton';
import CosmicInput from '../UI/CosmicInput';
import LoadingSpinner from '../UI/LoadingSpinner';
// 移除未使用的 ProgressIndicator 導入
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('CharacterConsistencyPanel');
// import { Badge } from '../UI/Badge';

interface CharacterConsistencyPanelProps {
  className?: string;
  characterId?: string;
  onReportGenerated?: (report: ConsistencyReport) => void;
}

interface SimilarityMatrixResult {
  character_ids: string[];
  similarity_matrix: number[][];
}

const ConsistencyPanel: React.FC<CharacterConsistencyPanelProps> = ({
  className = '',
  characterId: propCharacterId,
  onReportGenerated
}) => {
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);

  // 組件狀態
  const [selectedCharacterId, setSelectedCharacterId] = useState(propCharacterId || '');
  const [activeTab, setActiveTab] = useState<'setup' | 'report' | 'similarity' | 'batch'>('setup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // 設定狀態
  const [visualTraits, setVisualTraits] = useState<VisualTraits | null>(null);
  const [manualSeed, setManualSeed] = useState('');
  const [seedReason, setSeedReason] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageType, setReferenceImageType] = useState('full_body');
  const [referenceTags, setReferenceTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  
  // 報告狀態
  const [consistencyReport, setConsistencyReport] = useState<CharacterConsistencyReport | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  
  // 相似度矩陣狀態
  const [similarityMatrix, setSimilarityMatrix] = useState<SimilarityMatrixResult | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  
  // 批次檢查狀態
  const [batchReports, setBatchReports] = useState<{ characterId: string; score: number; issues: string[]; }[]>([]);
  const [batchMinScore, setBatchMinScore] = useState(0.7);

  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  // 載入角色視覺特徵
  const loadVisualTraits = useCallback(async () => {
    if (!selectedCharacterId) return;

    setIsProcessing(true);
    try {
      const result = await api.illustration.getCharacterVisualTraits(selectedCharacterId);
      if (result.success && result.traits) {
        setVisualTraits(result.traits);
      } else {
        setVisualTraits(null);
      }
    } catch (err) {
      log.error('載入視覺特徵失敗:', err);
      setVisualTraits(null);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCharacterId]);

  // 設定角色一致性
  const handleSetupConsistency = async () => {
    if (!selectedCharacter) {
      setError('請選擇角色');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.setupCharacterConsistency(
        selectedCharacter.id,
        selectedCharacter.name,
        selectedCharacter.background || ''
      );

      if (result.success) {
        // 設定成功後，載入視覺特徵
        try {
          const traitsResult = await api.illustration.getCharacterVisualTraits(selectedCharacter.id);
          if (traitsResult.success && traitsResult.traits) {
            setVisualTraits(traitsResult.traits);
          } else {
            // 如果沒有現有特徵，創建基本結構
            setVisualTraits({
              character_id: selectedCharacter.id,
              character_name: selectedCharacter.name,
              seed_value: undefined,
              traits_version: 1,
              standard_description: undefined,
              chinese_description: undefined,
              created_at: new Date().toISOString()
            });
          }
        } catch (traitsErr) {
          log.warn('載入視覺特徵失敗，使用默認值:', traitsErr);
          setVisualTraits({
            character_id: selectedCharacter.id,
            character_name: selectedCharacter.name,
            seed_value: undefined,
            traits_version: 1,
            standard_description: undefined,
            chinese_description: undefined,
            created_at: new Date().toISOString()
          });
        }
        
        log.debug('角色一致性設定完成');
      } else {
        setError(result.message || '一致性設定失敗');
      }
    } catch (err) {
      setError(`設定失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 設定手動種子值
  const handleSetManualSeed = async () => {
    if (!selectedCharacterId || !manualSeed.trim() || !seedReason.trim()) {
      setError('請填寫完整資訊');
      return;
    }

    const seedValue = parseInt(manualSeed);
    if (isNaN(seedValue) || seedValue < 1 || seedValue > 4294967295) {
      setError('種子值必須是 1 到 4294967295 之間的整數');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.setCharacterSeed(selectedCharacterId, seedValue, seedReason);
      
      if (result.success) {
        log.debug('種子值設定成功');
        setManualSeed('');
        setSeedReason('');
        loadVisualTraits(); // 重新載入特徵
      } else {
        setError('種子值設定失敗');
      }
    } catch (err) {
      setError(`設定失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 添加參考圖像
  const handleAddReferenceImage = async () => {
    if (!selectedCharacterId || !referenceImageUrl.trim()) {
      setError('請填寫圖像URL');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.addReferenceImage(
        selectedCharacterId,
        referenceImageUrl,
        referenceImageType,
        referenceTags
      );
      
      if (result.success) {
        log.debug('參考圖像添加成功');
        setReferenceImageUrl('');
        setReferenceTags([]);
      } else {
        setError('參考圖像添加失敗');
      }
    } catch (err) {
      setError(`添加失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 生成一致性報告
  const handleGenerateReport = async () => {
    if (!selectedCharacter) {
      setError('請選擇角色');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.generateConsistencyReport(
        selectedCharacter.id,
        selectedCharacter.name,
        strictMode
      );

      if (result.success && result.report) {
        setConsistencyReport(result.report);
        if (onReportGenerated) {
          // 暫時使用類型斷言，待後續重構
          onReportGenerated(result.report as any);
        }
      } else {
        setError('報告生成失敗');
      }
    } catch (err) {
      setError(`報告生成失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 計算相似度矩陣
  const handleCalculateSimilarity = async () => {
    if (!currentProject || selectedCharacters.length < 2) {
      setError('請選擇至少兩個角色');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.calculateSimilarityMatrix(
        currentProject.id,
        selectedCharacters
      );

      if (result.success) {
        setSimilarityMatrix({
          character_ids: result.character_ids || [],
          similarity_matrix: result.similarity_matrix || []
        });
      } else {
        setError(result.message || '相似度計算失敗');
      }
    } catch (err) {
      setError(`計算失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 批次檢查項目一致性
  const handleBatchCheck = async () => {
    if (!currentProject) {
      setError('請選擇專案');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const result = await api.illustration.batchCheckConsistency(
        currentProject.id,
        strictMode,
        batchMinScore
      );

      if (result.success && result.reports) {
        setBatchReports(result.reports);
      } else {
        setError('批次檢查失敗');
      }
    } catch (err) {
      setError(`批次檢查失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 添加標籤
  const handleAddTag = () => {
    if (currentTag.trim() && !referenceTags.includes(currentTag.trim())) {
      setReferenceTags([...referenceTags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  // 移除標籤
  const handleRemoveTag = (tag: string) => {
    setReferenceTags(referenceTags.filter(t => t !== tag));
  };

  // 切換角色選擇
  const toggleCharacterSelection = (characterId: string) => {
    if (selectedCharacters.includes(characterId)) {
      setSelectedCharacters(selectedCharacters.filter(id => id !== characterId));
    } else {
      setSelectedCharacters([...selectedCharacters, characterId]);
    }
  };

  // 獲取一致性分數顏色
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  // 獲取建議優先級顏色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 當角色或專案變更時重新載入
  useEffect(() => {
    if (selectedCharacterId) {
      loadVisualTraits();
    }
  }, [selectedCharacterId, currentProject, loadVisualTraits]);

  return (
    <div className={`character-consistency-panel ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">🎭</span>
            角色視覺一致性管理
          </h2>
        </div>

        {/* 角色選擇 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            選擇角色
          </label>
          <select
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-clay-orange focus:border-transparent"
          >
            <option value="">請選擇角色</option>
            {projectCharacters.map(character => (
              <option key={character.id} value={character.id}>
                {character.name}
                {character.background && ` - ${character.background.substring(0, 30)}...`}
              </option>
            ))}
          </select>
        </div>

        {/* 頁籤導航 */}
        <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'setup', label: '基本設定', icon: '⚙️' },
            { id: 'report', label: '一致性報告', icon: '📊' },
            { id: 'similarity', label: '相似度分析', icon: '🔄' },
            { id: 'batch', label: '批次檢查', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-clay-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {/* 基本設定 */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* 當前狀態 */}
            {selectedCharacter && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {selectedCharacter.name} 的視覺特徵
                </h3>
                
                {visualTraits ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400">種子值：</span>
                        <span className="text-white font-mono">{visualTraits.seed_value}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">版本：</span>
                        <span className="text-white">v{visualTraits.traits_version}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">標準描述：</span>
                      <p className="text-white text-sm mt-1 bg-gray-700 p-2 rounded">
                        {visualTraits.standard_description}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">中文描述：</span>
                      <p className="text-white text-sm mt-1 bg-gray-700 p-2 rounded">
                        {visualTraits.chinese_description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-4">該角色尚未設定視覺一致性</p>
                    <CosmicButton
                      onClick={handleSetupConsistency}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <LoadingSpinner size="small" /> : '設定一致性'}
                    </CosmicButton>
                  </div>
                )}
              </div>
            )}

            {/* 手動設定種子值 */}
            {selectedCharacter && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">手動設定種子值</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      種子值 (1-4294967295)
                    </label>
                    <CosmicInput
                      type="number"
                      value={manualSeed}
                      onChange={(value) => setManualSeed(value)}
                      placeholder="例如：123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      設定原因
                    </label>
                    <CosmicInput
                      value={seedReason}
                      onChange={(value) => setSeedReason(value)}
                      placeholder="例如：測試特定風格"
                    />
                  </div>
                </div>
                
                <CosmicButton
                  onClick={handleSetManualSeed}
                  disabled={isProcessing || !manualSeed || !seedReason}
                  variant="secondary"
                >
                  設定種子值
                </CosmicButton>
              </div>
            )}

            {/* 添加參考圖像 */}
            {selectedCharacter && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">添加參考圖像</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      圖像URL
                    </label>
                    <CosmicInput
                      value={referenceImageUrl}
                      onChange={(value) => setReferenceImageUrl(value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      圖像類型
                    </label>
                    <select
                      value={referenceImageType}
                      onChange={(e) => setReferenceImageType(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-clay-orange focus:border-transparent"
                    >
                      <option value="full_body">全身</option>
                      <option value="half_body">半身</option>
                      <option value="portrait">肖像</option>
                      <option value="face">臉部特寫</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      標籤
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <CosmicInput
                        value={currentTag}
                        onChange={(value) => setCurrentTag(value)}
                        placeholder="輸入標籤"
                        className="flex-1"
                      />
                      <CosmicButton onClick={handleAddTag} variant="secondary" size="small">
                        添加
                      </CosmicButton>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {referenceTags.map(tag => (
                        <button
                          key={tag}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded cursor-pointer text-gray-300"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <CosmicButton
                    onClick={handleAddReferenceImage}
                    disabled={isProcessing || !referenceImageUrl}
                    variant="secondary"
                  >
                    添加參考圖像
                  </CosmicButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 一致性報告 */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                    className="w-4 h-4 text-clay-orange bg-gray-700 border-gray-600 rounded focus:ring-clay-orange"
                  />
                  <span className="text-sm text-gray-300">嚴格模式</span>
                </label>
              </div>
              
              <CosmicButton
                onClick={handleGenerateReport}
                disabled={isProcessing || !selectedCharacter}
              >
                {isProcessing ? <LoadingSpinner size="small" /> : '生成報告'}
              </CosmicButton>
            </div>

            {consistencyReport && (
              <div className="space-y-6">
                {/* 總體分數 */}
                <div className="bg-gray-800 p-6 rounded-lg text-center">
                  <h3 className="text-lg font-semibold text-white mb-4">總體一致性分數</h3>
                  <div className={`text-6xl font-bold mb-2 ${getScoreColor(consistencyReport.consistency_score || 0)}`}>
                    {((consistencyReport.consistency_score || 0) * 100).toFixed(1)}
                  </div>
                  <div className="text-gray-400">滿分 100 分</div>
                </div>

                {/* 詳細分數 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">種子一致性</h4>
                    <div className={`text-2xl font-bold ${getScoreColor((consistencyReport as any).seed_consistency?.seed_stability || 0)}`}>
                      {((consistencyReport as any).seed_consistency?.seed_stability * 100 || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      使用次數: {(consistencyReport as any).seed_consistency?.usage_count || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">視覺一致性</h4>
                    <div className={`text-2xl font-bold ${getScoreColor(consistencyReport.visual_consistency.traits_completeness)}`}>
                      {(consistencyReport.visual_consistency.traits_completeness * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      描述清晰度: {(consistencyReport.visual_consistency.description_clarity * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">參考一致性</h4>
                    <div className={`text-2xl font-bold ${getScoreColor(consistencyReport.reference_consistency.quality_average)}`}>
                      {(consistencyReport.reference_consistency.quality_average * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      參考數量: {consistencyReport.reference_consistency.reference_count}
                    </div>
                  </div>
                </div>

                {/* 改善建議 */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-4">改善建議</h4>
                  <div className="space-y-3">
                    {consistencyReport.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                        <div className={`w-3 h-3 rounded-full mt-1 ${getPriorityColor(rec.priority)}`}></div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{rec.title}</div>
                          <div className="text-sm text-gray-300 mt-1">{rec.description}</div>
                          {rec.suggested_action && (
                            <div className="text-sm text-clay-orange mt-2">
                              建議操作: {rec.suggested_action}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 相似度分析 */}
        {activeTab === 'similarity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">角色相似度矩陣</h3>
              <CosmicButton
                onClick={handleCalculateSimilarity}
                disabled={isProcessing || selectedCharacters.length < 2}
              >
                {isProcessing ? <LoadingSpinner size="small" /> : '計算相似度'}
              </CosmicButton>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-3">選擇角色 (至少選擇2個)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {projectCharacters.map(character => (
                  <label key={character.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCharacters.includes(character.id)}
                      onChange={() => toggleCharacterSelection(character.id)}
                      className="w-4 h-4 text-clay-orange bg-gray-700 border-gray-600 rounded focus:ring-clay-orange"
                    />
                    <span className="text-white text-sm">{character.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {similarityMatrix && (
              <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <h4 className="font-medium text-white mb-3">相似度矩陣</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-400 p-2"></th>
                      {similarityMatrix.character_ids.map(id => {
                        const character = characters.find(c => c.id === id);
                        return (
                          <th key={id} className="text-center text-gray-400 p-2">
                            {character?.name.substring(0, 8)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {similarityMatrix.similarity_matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="text-gray-400 p-2 font-medium">
                          {characters.find(c => c.id === similarityMatrix.character_ids[i])?.name.substring(0, 8)}
                        </td>
                        {row.map((similarity, j) => (
                          <td key={j} className="text-center p-2">
                            <div className={`font-mono ${getScoreColor(similarity)}`}>
                              {(similarity * 100).toFixed(0)}%
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 批次檢查 */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={(e) => setStrictMode(e.target.checked)}
                    className="w-4 h-4 text-clay-orange bg-gray-700 border-gray-600 rounded focus:ring-clay-orange"
                  />
                  <span className="text-sm text-gray-300">嚴格模式</span>
                </label>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">最低分數:</span>
                  <input
                    type="number"
                    value={batchMinScore.toString()}
                    onChange={(e) => setBatchMinScore(parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
              </div>
              
              <CosmicButton
                onClick={handleBatchCheck}
                disabled={isProcessing || !currentProject}
              >
                {isProcessing ? <LoadingSpinner size="small" /> : '批次檢查'}
              </CosmicButton>
            </div>

            {batchReports.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-white">檢查結果 ({batchReports.length} 個角色)</h4>
                
                {batchReports.map(report => {
                  const character = characters.find(c => c.id === report.character_id);
                  return (
                    <div key={report.character_id} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-white">{character?.name || '未知角色'}</h5>
                        <div className={`text-xl font-bold ${getScoreColor(report.overall_score)}`}>
                          {(report.overall_score * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">種子:</span>
                          <span className={`ml-2 ${getScoreColor(report.seed_consistency.seed_stability)}`}>
                            {(report.seed_consistency.seed_stability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">視覺:</span>
                          <span className={`ml-2 ${getScoreColor(report.visual_consistency.traits_completeness)}`}>
                            {(report.visual_consistency.traits_completeness * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">參考:</span>
                          <span className={`ml-2 ${getScoreColor(report.reference_consistency.quality_average)}`}>
                            {(report.reference_consistency.quality_average * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      {report.recommendations.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="text-gray-400">主要建議:</span>
                          <span className="ml-2 text-clay-orange">
                            {report.recommendations[0].title}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ConsistencyPanel;