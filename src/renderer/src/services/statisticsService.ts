import { useAppSelector } from '../hooks/redux';

export interface ProjectStatistics {
  id: string;
  name: string;
  totalChapters: number;
  totalWords: number;
  averageWordsPerChapter: number;
  createdAt: Date;
  lastUpdated: Date;
  charactersCount: number;
  completionPercentage: number;
}

export interface WritingSession {
  date: string;
  wordsWritten: number;
  timeSpent: number; // 分鐘
  chaptersWorked: number;
}

export interface OverallStatistics {
  totalProjects: number;
  totalChapters: number;
  totalWords: number;
  totalCharacters: number;
  averageWordsPerDay: number;
  totalWritingTime: number; // 分鐘
  mostProductiveDay: string;
  longestChapter: {
    title: string;
    projectName: string;
    wordCount: number;
  };
  recentActivity: WritingSession[];
}

export interface MonthlyStats {
  month: string;
  wordsWritten: number;
  chaptersCompleted: number;
  timeSpent: number;
}

class StatisticsService {
  // 計算專案統計
  static async getProjectStatistics(): Promise<ProjectStatistics[]> {
    try {
      const projects = await window.electronAPI.projects.getAll();
      const statistics: ProjectStatistics[] = [];

      for (const project of projects) {
        const chapters = await window.electronAPI.chapters.getByProjectId(project.id);
        const characters = await window.electronAPI.characters.getByProjectId(project.id);
        
        const totalWords = chapters.reduce((sum, chapter) => {
          // 更精確的字數計算：去除空白字符後計算
          const content = chapter.content || '';
          const wordCount = content.replace(/\s+/g, '').length;
          return sum + wordCount;
        }, 0);

        const averageWords = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;
        
        // 簡單的完成度計算（基於章節數量）
        const targetChapters = 20; // 假設目標為20章
        const completionPercentage = Math.min((chapters.length / targetChapters) * 100, 100);

        statistics.push({
          id: project.id,
          name: project.name,
          totalChapters: chapters.length,
          totalWords,
          averageWordsPerChapter: averageWords,
          createdAt: new Date(project.created_at),
          lastUpdated: new Date(project.updated_at),
          charactersCount: characters.length,
          completionPercentage: Math.round(completionPercentage)
        });
      }

      return statistics.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    } catch (error) {
      console.error('獲取專案統計失敗:', error);
      return [];
    }
  }

  // 計算整體統計
  static async getOverallStatistics(): Promise<OverallStatistics> {
    try {
      const projectStats = await this.getProjectStatistics();
      
      const totalProjects = projectStats.length;
      const totalChapters = projectStats.reduce((sum, p) => sum + p.totalChapters, 0);
      const totalWords = projectStats.reduce((sum, p) => sum + p.totalWords, 0);
      const totalCharacters = projectStats.reduce((sum, p) => sum + p.charactersCount, 0);

      // 生成模擬的寫作會話數據（實際應用中應該從數據庫獲取）
      const recentActivity = this.generateRecentActivity();
      
      // 計算平均每日寫作量
      const daysActive = Math.max(recentActivity.length, 1);
      const averageWordsPerDay = Math.round(
        recentActivity.reduce((sum, session) => sum + session.wordsWritten, 0) / daysActive
      );

      // 找出最長的章節
      const longestChapter = await this.findLongestChapter();

      // 計算總寫作時間
      const totalWritingTime = recentActivity.reduce((sum, session) => sum + session.timeSpent, 0);

      // 找出最高產的一天
      const mostProductiveSession = recentActivity.reduce((max, session) => 
        session.wordsWritten > max.wordsWritten ? session : max
      , recentActivity[0] || { date: '', wordsWritten: 0, timeSpent: 0, chaptersWorked: 0 });

      return {
        totalProjects,
        totalChapters,
        totalWords,
        totalCharacters,
        averageWordsPerDay,
        totalWritingTime,
        mostProductiveDay: mostProductiveSession.date,
        longestChapter,
        recentActivity
      };
    } catch (error) {
      console.error('獲取整體統計失敗:', error);
      return {
        totalProjects: 0,
        totalChapters: 0,
        totalWords: 0,
        totalCharacters: 0,
        averageWordsPerDay: 0,
        totalWritingTime: 0,
        mostProductiveDay: '',
        longestChapter: { title: '', projectName: '', wordCount: 0 },
        recentActivity: []
      };
    }
  }

  // 生成月度統計
  static async getMonthlyStatistics(): Promise<MonthlyStats[]> {
    const months = [];
    const now = new Date();
    
    // 生成過去6個月的統計
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
      
      // 模擬數據（實際應用中應該從數據庫計算）
      const wordsWritten = Math.floor(Math.random() * 15000) + 5000;
      const chaptersCompleted = Math.floor(Math.random() * 8) + 2;
      const timeSpent = Math.floor(Math.random() * 300) + 100; // 分鐘
      
      months.push({
        month: monthName,
        wordsWritten,
        chaptersCompleted,
        timeSpent
      });
    }
    
    return months;
  }

  // 生成最近的寫作活動（基於真實數據和模擬數據的混合）
  private static generateRecentActivity(): WritingSession[] {
    const sessions: WritingSession[] = [];
    const now = new Date();
    
    // 從最近的章節更新時間推測寫作活動
    try {
      // 這裡可以根據章節的 updated_at 時間來生成更真實的活動記錄
      // 目前使用模擬數據，但邏輯框架已建立
      
      for (let i = 14; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('zh-TW');
        
        // 模擬寫作活動（可以後續改為從數據庫查詢）
        const hasActivity = Math.random() > 0.4; // 60%的天數有寫作活動
        
        if (hasActivity) {
          sessions.push({
            date: dateStr,
            wordsWritten: Math.floor(Math.random() * 1500) + 300,
            timeSpent: Math.floor(Math.random() * 90) + 30,
            chaptersWorked: Math.floor(Math.random() * 2) + 1
          });
        }
      }
    } catch (error) {
      console.error('生成寫作活動失敗:', error);
    }
    
    return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // 找出最長的章節
  private static async findLongestChapter(): Promise<{ title: string; projectName: string; wordCount: number }> {
    try {
      const projects = await window.electronAPI.projects.getAll();
      let longestChapter = { title: '', projectName: '', wordCount: 0 };
      
      for (const project of projects) {
        const chapters = await window.electronAPI.chapters.getByProjectId(project.id);
        
        for (const chapter of chapters) {
          const content = chapter.content || '';
          const wordCount = content.replace(/\s+/g, '').length;
          if (wordCount > longestChapter.wordCount) {
            longestChapter = {
              title: chapter.title,
              projectName: project.name,
              wordCount
            };
          }
        }
      }
      
      return longestChapter;
    } catch (error) {
      console.error('找尋最長章節失敗:', error);
      return { title: '', projectName: '', wordCount: 0 };
    }
  }

  // 格式化數字
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // 格式化時間（分鐘轉為小時分鐘）
  static formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}分鐘`;
    } else if (mins === 0) {
      return `${hours}小時`;
    } else {
      return `${hours}小時${mins}分鐘`;
    }
  }
}

export default StatisticsService;