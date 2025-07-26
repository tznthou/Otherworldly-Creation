import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { initDatabase } from './database/database';
import { setupIpcHandlers } from './ipc/ipcHandlers';

// 全域錯誤處理 - 防止閃退
process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常:', error);
  // 不要讓應用程式閃退，只記錄錯誤
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', reason);
  // 不要讓應用程式閃退，只記錄錯誤
});

// 保持對窗口對象的全局引用
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  console.log('開始創建窗口');
  
  try {
    // 創建瀏覽器窗口
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false, // 先不顯示，等待準備完成
      icon: path.join(__dirname, '../assets/icon.png'),
    });

    console.log('窗口創建成功');

    // 載入應用程式
    if (isDev) {
      console.log('開發模式：載入 Vite 開發服務器');
      mainWindow.loadURL('http://localhost:3000').catch(error => {
        console.error('無法載入開發服務器:', error);
        // 如果開發服務器失敗，使用本地檔案
        if (mainWindow) {
          mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
        }
      });
    } else {
      console.log('生產模式：載入本地檔案');
      mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
    }

    // 監聽頁面載入事件
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('頁面載入完成');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('頁面載入失敗:', errorCode, errorDescription);
    });

    // 當窗口準備好顯示時
    mainWindow.once('ready-to-show', () => {
      console.log('窗口準備完成，開始顯示');
      if (mainWindow) {
        mainWindow.show();
        
        // 在開發模式下聚焦窗口
        if (isDev) {
          mainWindow.focus();
        }
      }
    });

    // 當窗口被關閉時發出
    mainWindow.on('closed', () => {
      console.log('窗口被關閉');
      mainWindow = null;
    });

    // 監聽窗口錯誤
    mainWindow.webContents.on('crashed', () => {
      console.error('渲染進程崩潰');
      // 可以選擇重新載入或重新創建窗口
    });

    mainWindow.on('unresponsive', () => {
      console.error('窗口無響應');
    });

    mainWindow.on('responsive', () => {
      console.log('窗口恢復響應');
    });

    console.log('窗口事件監聽器設置完成');

  } catch (error) {
    console.error('創建窗口時發生錯誤:', error);
  }
}

// 這個方法在 Electron 完成初始化並準備創建瀏覽器窗口時被調用
app.whenReady().then(async () => {
  console.log('Electron 應用程式就緒');
  
  try {
    // 首先初始化資料庫
    console.log('開始初始化資料庫...');
    await initDatabase();
    console.log('資料庫初始化成功');
    
    // 設置 IPC 處理器
    console.log('開始設置 IPC 處理器...');
    setupIpcHandlers();
    console.log('IPC 處理器設置成功');
    
    // 然後創建窗口
    createWindow();
    console.log('Genesis Chronicle 應用程式啟動成功');
  } catch (error) {
    console.error('應用程式啟動失敗:', error);
    
    // 如果資料庫初始化失敗，仍然嘗試創建窗口（但功能會受限）
    console.warn('資料庫初始化失敗，以基本模式啟動應用程式');
    try {
      createWindow();
    } catch (windowError) {
      console.error('窗口創建也失敗:', windowError);
    }
  }
});

// 當所有窗口被關閉時退出應用程式
app.on('window-all-closed', () => {
  console.log('所有窗口已關閉');
  // 在 macOS 上，通常應用程式和它們的菜單欄會保持活動狀態，直到用戶使用 Cmd + Q 明確退出
  if (process.platform !== 'darwin') {
    console.log('退出應用程式');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('應用程式被激活');
  // 在 macOS 上，當點擊 dock 圖標並且沒有其他窗口打開時，通常會重新創建一個窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 處理應用程式退出
app.on('before-quit', () => {
  console.log('應用程式即將退出');
});

app.on('will-quit', (event) => {
  console.log('應用程式準備退出');
});

// 處理其他可能的錯誤
app.on('render-process-gone', (event, webContents, details) => {
  console.error('渲染進程消失:', details);
});

console.log('主進程腳本載入完成');