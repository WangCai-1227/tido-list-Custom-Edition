"use strict";

import { app, protocol, BrowserWindow, screen, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
//import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
const isDevelopment = process.env.NODE_ENV !== "production";

import { initExtra, createTray, createAppMenu } from "@/utils/backgroundExtra";

import { autoUpdater } from "electron-updater";

import windowStateKeeper from "electron-window-state";

import pkg from "../package.json";

let win;
let autoHideEdge = true;
let isWindowHidden = false;
let hideTimer = null;
let originalPosition = { x: 0, y: 0 };
const HIDE_THRESHOLD = 30;
const ANIMATION_DURATION = 300;

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (win) {
      setPosition();
    }
  });
} else {
  app.quit();
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } }
]);

createAppMenu();

async function createWindow() {
  // Load the previous state with fallback to defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 320,
    defaultHeight: 290
  });

  // Create the browser window.
  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 320,
    minHeight: 290,
    type: "toolbar",
    frame: false,
    title: "todo-list",
    //resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    //closable: false,
    //show: false,
    transparent: true,
    backgroundColor: "#00000000",
    //alwaysOnTop: true,
    //useContentSize: true,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  });

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  mainWindowState.manage(win);

  if (mainWindowState.x == undefined || mainWindowState.y == undefined)
    setPosition();

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    win.loadURL("app://./index.html");
    autoUpdater.checkForUpdatesAndNotify();
  }

  // win.once("ready-to-show", () => {
  //   win.show();
  // });

  //屏蔽windows原生右键菜单
  if (process.platform === "win32") {
    //int WM_INITMENU = 0x116;
    //当一个下拉菜单或子菜单将要被激活时发送此消息，它允许程序在它显示前更改菜单，而不要改变全部
    win.hookWindowMessage(278, function(e) {
      win.setEnabled(false); //窗口禁用

      setTimeout(() => {
        win.setEnabled(true); //窗口启用
      }, 100); //延时太快会立刻启用，太慢会妨碍窗口其他操作，可自行测试最佳时间

      return true;
    });
  }

  win.on("closed", () => {
    win = null;
  });

  win.on("focus", () => {
    if (isWindowHidden) {
      showFromHidden();
    }
  });

  if (autoHideEdge) {
    setupAutoHideEdge();
  }
}

//闪烁问题
app.commandLine.appendSwitch("wm-window-animations-disabled");

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) init();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  // if (isDevelopment && !process.env.IS_TEST) {
  //   // Install Vue Devtools
  //   try {
  //     await installExtension(VUEJS_DEVTOOLS);
  //   } catch (e) {
  //     console.error("Vue Devtools failed to install:", e.toString());
  //   }
  // }

  init();
});

function init() {
  createWindow();
  initExtra();
  createTray(showWindow);
  //createAppMenu();
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", data => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

function setPosition() {
  const size = screen.getPrimaryDisplay().workAreaSize;
  const winSize = win.getSize();
  win.setPosition(size.width - winSize[0] - 30, 30);
}

function showWindow() {
  //if (!win.isVisible())
  win.show();
}

ipcMain.handle("setIgnoreMouseEvents", (event, ignore) => {
  if (ignore) win.setIgnoreMouseEvents(true, { forward: true });
  else win.setIgnoreMouseEvents(false);
});

ipcMain.handle("setAlwaysOnTop", (event, alwaysOnTop) => {
  win.setAlwaysOnTop(alwaysOnTop);
});

ipcMain.handle("hideWindow", event => {
  win.hide();
});

let windowMoveTimer = null;
let currentHideEdge = null;

function setupAutoHideEdge() {
  win.on("move", () => {
    if (isWindowHidden) return;

    clearTimeout(windowMoveTimer);
    windowMoveTimer = setTimeout(() => {
      checkAndHideToEdge();
    }, 500);
  });

  win.on("resized", () => {
    if (isWindowHidden) return;

    clearTimeout(windowMoveTimer);
    windowMoveTimer = setTimeout(() => {
      checkAndHideToEdge();
    }, 500);
  });

  startMouseMonitor();
}

function checkAndHideToEdge() {
  if (!autoHideEdge || isWindowHidden) return;

  const winPos = win.getPosition();
  const winSize = win.getSize();
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  let edge = null;

  if (winPos.x <= HIDE_THRESHOLD - winSize[0] + workArea.x) {
    edge = "left";
  } else if (
    winPos.x + winSize[0] >=
    workArea.width + workArea.x - HIDE_THRESHOLD
  ) {
    edge = "right";
  } else if (winPos.y <= HIDE_THRESHOLD - winSize[1] + workArea.y) {
    edge = "top";
  }

  if (edge) {
    hideToEdge(edge, winPos, winSize, workArea);
  }
}

function hideToEdge(edge, winPos, winSize, workArea) {
  currentHideEdge = edge;
  originalPosition = { x: winPos[0], y: winPos[1] };

  let hideX = winPos[0];
  let hideY = winPos[1];

  switch (edge) {
    case "left":
      hideX = workArea.x - winSize[0] + 5;
      break;
    case "right":
      hideX = workArea.width + workArea.x - 5;
      break;
    case "top":
      hideY = workArea.y - winSize[1] + 5;
      break;
  }

  animateWindowPosition(winPos[0], winPos[1], hideX, hideY, () => {
    isWindowHidden = true;
  });
}

function animateWindowPosition(fromX, fromY, toX, toY, callback) {
  const steps = 15;
  let currentStep = 0;

  const deltaX = (toX - fromX) / steps;
  const deltaY = (toY - fromY) / steps;

  function step() {
    currentStep++;
    if (currentStep >= steps) {
      win.setPosition(Math.round(toX), Math.round(toY));
      if (callback) callback();
      return;
    }

    const newX = fromX + deltaX * currentStep;
    const newY = fromY + deltaY * currentStep;
    win.setPosition(Math.round(newX), Math.round(newY));

    setTimeout(step, ANIMATION_DURATION / steps);
  }

  step();
}

let mouseMonitorInterval = null;

function startMouseMonitor() {
  if (mouseMonitorInterval) {
    clearInterval(mouseMonitorInterval);
  }

  mouseMonitorInterval = setInterval(() => {
    if (!isWindowHidden || !currentHideEdge) return;

    const cursorPos = screen.getCursorScreenPoint();
    const winPos = win.getPosition();
    const winSize = win.getSize();
    const display = screen.getPrimaryDisplay();
    const workArea = display.workArea;

    let shouldShow = false;
    const MOUSE_TRIGGER_DISTANCE = 30;

    switch (currentHideEdge) {
      case "left": {
        const edgeX = workArea.x;
        if (
          cursorPos.x >= edgeX - MOUSE_TRIGGER_DISTANCE &&
          cursorPos.x <= edgeX + MOUSE_TRIGGER_DISTANCE &&
          cursorPos.y >= winPos[1] - 20 &&
          cursorPos.y <= winPos[1] + winSize[1] + 20
        ) {
          shouldShow = true;
        }
        break;
      }
      case "right": {
        const edgeX = workArea.width + workArea.x;
        if (
          cursorPos.x >= edgeX - MOUSE_TRIGGER_DISTANCE &&
          cursorPos.x <= edgeX + MOUSE_TRIGGER_DISTANCE &&
          cursorPos.y >= winPos[1] - 20 &&
          cursorPos.y <= winPos[1] + winSize[1] + 20
        ) {
          shouldShow = true;
        }
        break;
      }
      case "top": {
        const edgeY = workArea.y;
        if (
          cursorPos.y >= edgeY - MOUSE_TRIGGER_DISTANCE &&
          cursorPos.y <= edgeY + MOUSE_TRIGGER_DISTANCE &&
          cursorPos.x >= winPos[0] - 50 &&
          cursorPos.x <= winPos[0] + winSize[0] + 50
        ) {
          shouldShow = true;
        }
        break;
      }
    }

    if (shouldShow) {
      showFromHidden();
    }
  }, 200);
}

function showFromHidden() {
  if (!isWindowHidden || !currentHideEdge) return;

  const targetX = originalPosition.x;
  const targetY = originalPosition.y;
  const currentPos = win.getPosition();

  animateWindowPosition(currentPos[0], currentPos[1], targetX, targetY, () => {
    isWindowHidden = false;
    currentHideEdge = null;
  });
}

ipcMain.handle("toggleAutoHideEdge", (event, enabled) => {
  if (enabled !== undefined) {
    autoHideEdge = enabled;
  } else {
    autoHideEdge = !autoHideEdge;
  }

  if (!autoHideEdge && isWindowHidden) {
    showFromHidden();
  }

  return autoHideEdge;
});

ipcMain.handle("showFromHidden", () => {
  if (isWindowHidden) {
    showFromHidden();
  }
});
