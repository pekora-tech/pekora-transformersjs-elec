import { app, BrowserWindow, Tray, Menu, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let tray = null;
let viteProcess = null;

const isDev = process.env.NODE_ENV === 'development';

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 480,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  mainWindow.loadFile('control.html');

  // 處理所有新視窗請求，優先使用Chrome開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 嘗試使用Chrome開啟
    const openInChrome = () => {
      const command = process.platform === 'darwin' 
        ? `open -a "Google Chrome" "${url}"`
        : `start chrome "${url}"`;
      
      spawn(command, [], { shell: true }).on('error', () => {
        // 如果Chrome開啟失敗，使用默認瀏覽器
        shell.openExternal(url);
      });
    };
    
    openInChrome();
    return { action: 'deny' };
  });

  // 處理所有連結點擊，優先使用Chrome開啟
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      const command = process.platform === 'darwin' 
        ? `open -a "Google Chrome" "${url}"`
        : `start chrome "${url}"`;
      
      spawn(command, [], { shell: true }).on('error', () => {
        // 如果Chrome開啟失敗，使用默認瀏覽器
        shell.openExternal(url);
      });
    }
  });
};

const startViteServer = () => {
  viteProcess = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'inherit'
  });
  
  // 等待vite服務器啟動
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
};

const createTray = () => {
  tray = new Tray(join(__dirname, '../public/logo.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '開啟控制介面',
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: '退出',
      click: () => {
        if (viteProcess) {
          viteProcess.kill();
        }
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Llama 3.2 WebGPU Service');
  tray.setContextMenu(contextMenu);
};

app.whenReady().then(async () => {
  if (isDev) {
    await startViteServer();
  }
  createTray();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (viteProcess) {
    viteProcess.kill();
  }
});
