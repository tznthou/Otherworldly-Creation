import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase } from './database/database';
import { setupIpcHandlers } from './ipc/ipcHandlers';

// 保持對窗口對象的全局引用，如果不這樣做，當 JavaScript 對象被垃圾回收時，窗口會自動關閉
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  // 創建瀏覽器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,

      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false, // 先不顯示，等待準備完成
    icon: path.join(__dirname, '../assets/icon.png'), // 應用程式圖標
  });

  // 載入應用程式
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // 開發模式下打開開發者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 當窗口準備好顯示時
  mainWindow.once('ready-to-show', () => {
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
    // 取消引用 window 對象，如果你的應用程式支持多窗口，
    // 通常會把多個 window 對象存放在一個數組裡，
    // 與此同時，你應該刪除相應的元素
    mainWindow = null;
  });
}

// 這段程序將會在 Electron 結束初始化和創建瀏覽器窗口的時候調用
// 部分 API 在 ready 事件觸發後才能使用
app.whenReady().then(async () => {
  try {
    // 初始化資料庫
    await initDatabase();
    
    // 設置 IPC 處理器
    setupIpcHandlers();
    
    // 創建主窗口
    createWindow();
    
    console.log('Genesis Chronicle 應用程式啟動成功');
  } catch (error) {
    console.error('應用程式啟動失敗:', error);
    app.quit();
  }
});

// 當全部窗口關閉時退出
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用戶用 Cmd + Q 確定地退出，
  // 否則絕大部分應用程式及其選單欄會保持啟用
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，當點擊 dock 圖標並且該應用程式沒有打開的窗口時，
  // 絕大部分應用程式會重新創建一個窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 在這個文件中，你可以續寫應用程式剩下主程序代碼。
// 也可以拆分成幾個文件，然後用 require 導入。