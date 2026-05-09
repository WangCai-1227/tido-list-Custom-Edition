import {
  app,
  ipcMain,
  Tray,
  Menu,
  shell,
  dialog,
  Notification
} from "electron";
import DB from "./db";
import path from "path";

import pkg from "../../package.json";

import ExcelJS from "exceljs";

import { getNowDateTimeForFlieName } from "@/utils/common";
import { getFormatPattern } from "@/utils/numberFormat";

let tray;

export function getDataPath() {
  return app.getPath("userData");
}

ipcMain.handle("getDataPath", event => {
  return getDataPath();
});

export function initExtra() {
  const storePath = getDataPath();
  DB.initDB(storePath);

  const firstRun = DB.get("settings.firstRun");
  if (firstRun) {
    setOpenAtLogin(true);
    DB.set("settings.firstRun", false);
  }
}

export function createTray(showWindow) {
  tray = new Tray(
    path.join(
      __static,
      process.platform !== "darwin" ? "./tray.png" : "./tray-mac.png"
    )
  );

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "开机启动",
      type: "checkbox",
      checked: getOpenAtLogin(),
      click() {
        const openAtLogin = getOpenAtLogin();
        setOpenAtLogin(!openAtLogin);
      }
    },
    {
      label: "关于",
      role: "abort",
      click() {
        dialog.showMessageBox({
          title: pkg.name,
          message: pkg.description,
          detail: `Version: ${pkg.version}\nAuthor: ${pkg.author}`
        });
      }
    },
    {
      label: "退出",
      role: "quit"
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.setToolTip(pkg.name);

  tray.on("click", (event, bounds, position) => {
    showWindow();
  });
}

export function createAppMenu() {
  const template = [
    // { role: 'appMenu' }
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "关于" },
              { type: "separator" },
              { role: "quit", label: "退出" }
            ]
          }
        ]
      : [])
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setOpenAtLogin(openAtLogin) {
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: openAtLogin
    });
  } else {
    app.setLoginItemSettings({
      openAtLogin: openAtLogin,
      openAsHidden: false,
      path: process.execPath,
      args: [path.resolve(process.argv[1])]
    });
  }
}

function getOpenAtLogin() {
  if (app.isPackaged) {
    const { openAtLogin } = app.getLoginItemSettings();
    return openAtLogin;
  } else {
    const { openAtLogin } = app.getLoginItemSettings({
      path: process.execPath,
      args: [path.resolve(process.argv[1])]
    });
    return openAtLogin;
  }
}

ipcMain.handle("exportData", event => {
  exportData();
});

function formatPriority(pri) {
  if (pri === "high") return "高";
  if (pri === "medium") return "中";
  if (pri === "low") return "低";
  return "";
}

function flattenExportItems(items, depth, path, collapsedMap, formatMap) {
  const result = [];
  const levelFormats = formatMap.levelFormats;
  items.forEach((item, idx) => {
    const curPath = [...path, idx + 1];
    if (depth === 0) {
      result.push({ item, _depth: depth, _path: curPath, _fmt: formatMap.root });
    } else {
      const fmtId = levelFormats && levelFormats.length >= depth ? levelFormats[depth - 1] : "arabic";
      result.push({ item, _depth: depth, _path: curPath, _fmt: getFormatPattern(fmtId) });
    }
    if (item.children && item.children.length > 0 && !collapsedMap[item.id]) {
      result.push(...flattenExportItems(item.children, depth + 1, curPath, collapsedMap, formatMap));
    }
  });
  return result;
}

function buildCollapsedMap(items) {
  const map = {};
  const walk = (arr) => {
    arr.forEach(item => {
      if (item.collapsed) map[item.id] = true;
      if (item.children && item.children.length) walk(item.children);
    });
  };
  walk(items);
  return map;
}

function exportData() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = pkg.name;

  const numberFormatId = DB.get("numberFormat") || "arabic";
  const rootFmt = getFormatPattern(numberFormatId);
  const settings = DB.get("settings") || {};
  const levelConfigs = (settings.levelConfigs) || {};
  const levelFormats = Array.isArray(levelConfigs.formats) ? levelConfigs.formats : [];
  const formatMap = { root: rootFmt, levelFormats };

  // ── Todo Sheet ──
  const sheet1 = workbook.addWorksheet("todo list");
  sheet1.columns = [
    { header: "序号", key: "seq", width: 12 },
    { header: "内容", key: "content", width: 40 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "颜色", key: "color", width: 12 },
    { header: "创建时间", key: "created", width: 20 },
    { header: "折叠", key: "collapsed", width: 8 }
  ];
  const todoList = DB.get("todoList");
  if (Array.isArray(todoList)) {
    const collapsedMap = buildCollapsedMap(todoList);
    const rows = flattenExportItems(todoList, 0, [], collapsedMap, formatMap);
    rows.forEach(entry => {
      const item = entry.item;
      const parts = entry._path.slice(0, -1).join(".");
      const last = entry._fmt(entry._path[entry._path.length - 1]);
      const seq = entry._path.length === 1 ? last : parts + "." + last;
      sheet1.addRow({
        seq,
        content: "  ".repeat(entry._depth) + (item.content || ""),
        priority: formatPriority(item.priority),
        color: item.color || "",
        created: item.todo_datetime || "",
        collapsed: item.collapsed && entry._depth === 0 ? "是" : ""
      });
    });
  }

  // ── Done Sheet ──
  const sheet2 = workbook.addWorksheet("done list");
  sheet2.columns = [
    { header: "序号", key: "seq", width: 12 },
    { header: "内容", key: "content", width: 40 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "颜色", key: "color", width: 12 },
    { header: "创建时间", key: "created", width: 20 },
    { header: "完成时间", key: "done", width: 20 }
  ];
  const doneGroupList = DB.groupby("doneList", "done_date");
  for (const prop in doneGroupList) {
    const doneCollapsed = {};
    const items = doneGroupList[prop];
    const rows = flattenExportItems(items, 0, [], doneCollapsed, formatMap);
    rows.forEach(entry => {
      const item = entry.item;
      const parts = entry._path.slice(0, -1).join(".");
      const last = entry._fmt(entry._path[entry._path.length - 1]);
      const seq = entry._path.length === 1 ? last : parts + "." + last;
      sheet2.addRow({
        seq,
        content: "  ".repeat(entry._depth) + (item.content || ""),
        priority: formatPriority(item.priority),
        color: item.color || "",
        created: item.todo_datetime || "",
        done: item.done_datetime || ""
      });
    });
  }

  const defaultPath = `/${getNowDateTimeForFlieName()}.xlsx`;

  dialog
    .showSaveDialog({ title: "数据导出", defaultPath: defaultPath })
    .then(async result => {
      if (result.canceled) return;

      await workbook.xlsx.writeFile(result.filePath);

      showNotification(
        { title: "导出完成", body: `数据已导出到：${result.filePath}` },
        () => {
          shell.openExternal(result.filePath);
        }
      );
    });
}

export function showNotification(option, clickCallback) {
  if (Notification.isSupported()) {
    const notification = new Notification(option);
    if (clickCallback) {
      notification.on("click", () => {
        clickCallback();
      });
    }
    notification.show();
  }
}
