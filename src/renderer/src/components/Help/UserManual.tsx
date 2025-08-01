import React, { useState } from 'react';
import { Book, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';

interface UserManualProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  content: React.ReactNode;
  subsections?: ManualSection[];
}

const UserManual: React.FC<UserManualProps> = ({ isOpen, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [activeSection, setActiveSection] = useState<string>('getting-started');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const manualSections: ManualSection[] = [
    {
      id: 'getting-started',
      title: '快速入門',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">歡迎使用創世紀元</h3>
            <p className="text-gray-300 mb-4">
              創世紀元是一個專為輕小說創作者設計的 AI 輔助寫作工具。本手冊將幫助您快速掌握所有功能，開始您的創作之旅。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">系統需求</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• 作業系統：Windows 10+、macOS 10.14+、Linux Ubuntu 18.04+</li>
              <li>• 記憶體：建議 4GB RAM 以上</li>
              <li>• 硬碟空間：至少 2GB 可用空間</li>
              <li>• 網路連線：AI 功能需要穩定的網路連線</li>
              <li>• Ollama 服務：使用 AI 功能需要安裝並執行 Ollama</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">第一次使用</h4>
            <ol className="text-gray-300 space-y-2">
              <li>1. 啟動應用程式後，系統會自動檢查 AI 服務狀態</li>
              <li>2. 如果是第一次使用，建議先完成新手教學</li>
              <li>3. 創建您的第一個專案，選擇合適的小說類型</li>
              <li>4. 設定基本的專案資訊和世界觀</li>
              <li>5. 開始您的創作之旅！</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'project-management',
      title: '專案管理',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">專案管理</h3>
            <p className="text-gray-300 mb-4">
              專案是您創作的核心單位。每個專案包含章節、角色、世界觀設定等完整的創作元素。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">創建新專案</h4>
            <ol className="text-gray-300 space-y-2">
              <li>1. 在儀表板點擊「創建新專案」按鈕</li>
              <li>2. 選擇小說類型（異世界、校園、科幻、奇幻）</li>
              <li>3. 填寫專案基本資訊：標題、作者、簡介</li>
              <li>4. 選擇是否使用預設模板</li>
              <li>5. 確認創建，系統會自動生成專案結構</li>
            </ol>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">專案類型說明</h4>
            <div className="space-y-3">
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">異世界轉生</h5>
                <p className="text-gray-300 text-sm">包含轉生設定、魔法系統、異世界地理等元素</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">校園戀愛</h5>
                <p className="text-gray-300 text-sm">現代校園背景，著重角色關係發展</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">科幻冒險</h5>
                <p className="text-gray-300 text-sm">未來科技設定，包含科技體系和宇宙觀</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">奇幻冒險</h5>
                <p className="text-gray-300 text-sm">魔法世界設定，包含種族和魔法體系</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'writing-editor',
      title: '寫作編輯器',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">寫作編輯器</h3>
            <p className="text-gray-300 mb-4">
              編輯器是您進行創作的主要工作區域，提供了豐富的寫作功能和 AI 輔助工具。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">編輯器界面</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>章節列表</strong>：左側面板顯示所有章節，支援拖拽排序</li>
              <li>• <strong>工具列</strong>：提供儲存、格式設定、AI 輔助等功能</li>
              <li>• <strong>寫作區域</strong>：主要的文字編輯區域，支援富文本格式</li>
              <li>• <strong>右側面板</strong>：章節筆記、字數統計、AI 續寫面板</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">章節管理</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>創建章節</strong>：點擊章節列表底部的「新增章節」按鈕</li>
              <li>• <strong>編輯章節</strong>：點擊章節標題可以重新命名</li>
              <li>• <strong>調整順序</strong>：拖拽章節可以調整順序</li>
              <li>• <strong>章節筆記</strong>：每個章節都可以添加創作筆記</li>
              <li>• <strong>刪除章節</strong>：右鍵點擊章節可以刪除（需要確認）</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">寫作功能</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>自動儲存</strong>：每 3 秒自動儲存，無需手動操作</li>
              <li>• <strong>字數統計</strong>：即時顯示章節和專案字數</li>
              <li>• <strong>格式工具</strong>：支援粗體、斜體、引用等格式</li>
              <li>• <strong>搜尋替換</strong>：Ctrl+F 搜尋，Ctrl+H 替換</li>
              <li>• <strong>撤銷重做</strong>：支援多層次的撤銷和重做</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'character-management',
      title: '角色管理',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">角色管理系統</h3>
            <p className="text-gray-300 mb-4">
              角色是故事的靈魂。完善的角色設定能讓您的故事更加生動有趣，也能幫助 AI 更好地理解您的創作意圖。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">角色資訊設定</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>基本資訊</strong>：姓名、年齡、性別、職業等</li>
              <li>• <strong>外貌描述</strong>：身高、體重、髮色、眼色、特徵等</li>
              <li>• <strong>性格特點</strong>：個性、愛好、價值觀、行為習慣</li>
              <li>• <strong>背景故事</strong>：成長經歷、重要事件、動機目標</li>
              <li>• <strong>角色標籤</strong>：快速標記角色類型和特點</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">角色原型模板</h4>
            <p className="text-gray-300 mb-3">系統提供多種角色原型模板，幫助您快速創建角色：</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold text-sm">主角類型</h5>
                <p className="text-gray-300 text-xs">熱血主角、冷靜主角、天才主角等</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold text-sm">女主角類型</h5>
                <p className="text-gray-300 text-xs">溫柔型、傲嬌型、天然型等</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold text-sm">配角類型</h5>
                <p className="text-gray-300 text-xs">導師、對手、朋友、敵人等</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold text-sm">特殊角色</h5>
                <p className="text-gray-300 text-xs">神秘人物、反派、路人等</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">角色關係管理</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>關係類型</strong>：家人、朋友、戀人、敵人、師徒等</li>
              <li>• <strong>關係描述</strong>：詳細說明角色間的關係背景</li>
              <li>• <strong>單向關係設計</strong>：支援不對等關係的靈活設定</li>
              <li>• <strong>關係圖視覺化</strong>：圖形化顯示角色關係網絡</li>
            </ul>
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
              <h5 className="text-blue-400 font-semibold mb-2">💡 關係設計理念</h5>
              <p className="text-gray-300 text-sm mb-2">
                系統採用<strong>單向關係</strong>設計，這表示當您為角色 A 設定對角色 B 的關係時，系統不會自動為角色 B 創建對角色 A 的反向關係。
              </p>
              <p className="text-gray-300 text-sm mb-2">
                <strong>為什麼這樣設計？</strong>
              </p>
              <ul className="text-gray-300 text-sm space-y-1 ml-4">
                <li>• <strong>現實性</strong>：真實世界的人際關係往往不對等（如單戀、敵視等）</li>
                <li>• <strong>創作靈活性</strong>：能表達複雜的心理關係和情感衝突</li>
                <li>• <strong>故事張力</strong>：不對等關係往往能創造更多戲劇效果</li>
                <li>• <strong>控制權</strong>：作者可以精確控制每個角色的關係認知</li>
              </ul>
              <p className="text-gray-300 text-sm mt-2">
                如需建立雙向關係，您可以分別為兩個角色設定彼此的關係。
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai-assistant',
      title: 'AI 輔助功能',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">AI 輔助寫作</h3>
            <p className="text-gray-300 mb-4">
              AI 助手是您的創作夥伴，能夠理解您的故事背景、角色設定，提供個性化的寫作建議和續寫內容。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 功能特點</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>上下文理解</strong>：分析專案設定、角色關係、已寫內容</li>
              <li>• <strong>風格一致性</strong>：保持與您寫作風格的一致性</li>
              <li>• <strong>角色一致性</strong>：確保角色行為符合設定</li>
              <li>• <strong>劇情連貫性</strong>：維持故事邏輯和時間線</li>
              <li>• <strong>多樣化輸出</strong>：提供多種不同的續寫選項</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">使用 AI 續寫</h4>
            <ol className="text-gray-300 space-y-2">
              <li>1. 在編輯器中將游標定位到想要續寫的位置</li>
              <li>2. 點擊工具列的「AI 續寫」按鈕或按 Alt+A</li>
              <li>3. 在 AI 面板中設定生成參數（長度、風格、創意度）</li>
              <li>4. 點擊「生成」開始 AI 續寫</li>
              <li>5. 查看生成結果，選擇合適的內容插入</li>
              <li>6. 可以重新生成或修改內容後再使用</li>
            </ol>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 設定說明</h4>
            <div className="space-y-3">
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">生成長度</h5>
                <p className="text-gray-300 text-sm">控制 AI 生成內容的字數，可選擇短、中、長</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">創意程度</h5>
                <p className="text-gray-300 text-sm">調整 AI 的創意程度，高創意會產生更多變化</p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">寫作風格</h5>
                <p className="text-gray-300 text-sm">選擇敘述風格：描述性、對話性、動作性等</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 使用建議</h4>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <ul className="text-gray-300 space-y-2 text-sm">
                <li>• AI 生成的內容僅供參考，請根據創作需要進行修改</li>
                <li>• 建議將 AI 內容作為靈感來源，而非直接使用</li>
                <li>• 重要情節轉折建議由人工創作，確保故事品質</li>
                <li>• 定期檢查 AI 生成內容是否符合角色設定</li>
                <li>• 使用 AI 前確保已有足夠的上下文資訊</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings-backup',
      title: '設定與備份',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">應用程式設定</h3>
            <p className="text-gray-300 mb-4">
              透過設定選項，您可以個人化應用程式的外觀和行為，以及管理資料備份。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">一般設定</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>主題設定</strong>：選擇亮色或暗色主題</li>
              <li>• <strong>語言設定</strong>：介面語言選擇</li>
              <li>• <strong>字體設定</strong>：編輯器字體和大小</li>
              <li>• <strong>自動儲存</strong>：設定自動儲存間隔</li>
              <li>• <strong>啟動設定</strong>：設定應用程式啟動行為</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 設定</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>模型選擇</strong>：選擇使用的 AI 模型</li>
              <li>• <strong>預設參數</strong>：設定 AI 生成的預設參數</li>
              <li>• <strong>服務設定</strong>：配置 Ollama 服務連線</li>
              <li>• <strong>快取設定</strong>：AI 回應快取管理</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">資料管理</h4>
            <p className="text-gray-300 mb-4">
              在主頁面的功能選單中，點擊「💾 資料管理」可以存取完整的資料備份、還原與維護功能。
            </p>
            <div className="space-y-3">
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">資料庫備份</h5>
                <p className="text-gray-300 text-sm">
                  點擊「立即備份」可以將整個資料庫（包含所有專案、章節、角色）備份到您指定的位置。
                  備份檔案為 SQLite 格式（.db），包含完整的創作內容。
                </p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">資料庫還原</h5>
                <p className="text-gray-300 text-sm">
                  點擊「選擇備份檔案」可以從之前建立的備份檔案中還原所有資料。
                  還原後系統會自動重新載入以反映還原的內容。
                </p>
              </div>
              <div className="bg-cosmic-800/50 p-3 rounded-lg">
                <h5 className="text-white font-semibold">專案匯入匯出</h5>
                <p className="text-gray-300 text-sm">
                  資料管理功能整合了專案匯入與匯出，提供完整的資料備份解決方案。
                  建議定期建立資料庫備份以確保創作內容安全。
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">系統維護</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>清除快取</strong>：清理暫存檔案釋放空間</li>
              <li>• <strong>資料庫維護</strong>：檢查和修復資料庫</li>
              <li>• <strong>重置設定</strong>：恢復所有設定到預設值</li>
              <li>• <strong>診斷報告</strong>：生成系統狀態報告</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: '故障排除',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">常見問題解決</h3>
            <p className="text-gray-300 mb-4">
              遇到問題時，請先嘗試以下解決方案。如果問題持續存在，請聯繫技術支援。
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 功能異常</h4>
            <div className="space-y-3">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <h5 className="text-red-400 font-semibold">問題：AI 無法連線</h5>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>1. 檢查 Ollama 服務是否正在執行</li>
                  <li>2. 確認網路連線正常</li>
                  <li>3. 檢查防火牆設定</li>
                  <li>4. 重新啟動 Ollama 服務</li>
                </ul>
              </div>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <h5 className="text-red-400 font-semibold">問題：AI 回應緩慢</h5>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>1. 檢查系統資源使用情況</li>
                  <li>2. 嘗試使用較小的 AI 模型</li>
                  <li>3. 減少生成內容長度</li>
                  <li>4. 關閉其他高耗能應用程式</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">應用程式問題</h4>
            <div className="space-y-3">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <h5 className="text-red-400 font-semibold">問題：應用程式無法啟動</h5>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>1. 檢查系統是否符合最低需求</li>
                  <li>2. 以管理員權限執行</li>
                  <li>3. 檢查防毒軟體是否阻擋</li>
                  <li>4. 重新安裝應用程式</li>
                </ul>
              </div>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <h5 className="text-red-400 font-semibold">問題：資料遺失</h5>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  <li>1. 檢查自動備份檔案</li>
                  <li>2. 查看資料庫備份</li>
                  <li>3. 使用資料恢復功能</li>
                  <li>4. 聯繫技術支援協助恢復</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">效能優化</h4>
            <ul className="text-gray-300 space-y-2">
              <li>• <strong>定期清理</strong>：清除暫存檔案和快取資料</li>
              <li>• <strong>資料庫維護</strong>：定期執行資料庫最佳化</li>
              <li>• <strong>更新軟體</strong>：保持應用程式為最新版本</li>
              <li>• <strong>硬體升級</strong>：如有需要，考慮升級記憶體或儲存</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">聯繫支援</h4>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">
                如果上述方法無法解決問題，請準備以下資訊並聯繫技術支援：
              </p>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• 作業系統版本和應用程式版本</li>
                <li>• 詳細的錯誤描述和重現步驟</li>
                <li>• 錯誤訊息截圖（如有）</li>
                <li>• 系統診斷報告</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentSection = manualSections.find(section => section.id === activeSection);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex">
      {/* 側邊欄 */}
      <div className="w-80 bg-cosmic-900/95 backdrop-blur-sm border-r border-gold-500/30 overflow-y-auto">
        <div className="p-4 border-b border-cosmic-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Book className="w-6 h-6 text-gold-400" />
              <h2 className="text-lg font-cosmic text-gold-400">使用手冊</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4">
          {manualSections.map((section) => (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => {
                  setActiveSection(section.id);
                  if (section.subsections) {
                    toggleSection(section.id);
                  }
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-gray-300 hover:bg-cosmic-800/50 hover:text-white'
                }`}
              >
                <span className="font-medium">{section.title}</span>
                {section.subsections && (
                  <div className="text-sm">
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                )}
              </button>

              {section.subsections && expandedSections.includes(section.id) && (
                <div className="ml-4 mt-2 space-y-1">
                  {section.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      onClick={() => setActiveSection(subsection.id)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        activeSection === subsection.id
                          ? 'bg-gold-500/10 text-gold-400'
                          : 'text-gray-400 hover:bg-cosmic-800/30 hover:text-white'
                      }`}
                    >
                      {subsection.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 bg-cosmic-900/95 backdrop-blur-sm overflow-y-auto">
        <div className="p-8 max-w-4xl">
          {currentSection && currentSection.content}
        </div>
      </div>
    </div>
  );
};

export default UserManual;