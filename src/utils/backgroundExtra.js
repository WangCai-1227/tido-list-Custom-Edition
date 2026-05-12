import {
  app,
  ipcMain,
  Tray,
  Menu,
  shell,
  dialog,
  Notification,
  BrowserWindow
} from "electron";
import DB from "./db";
import path from "path";

import pkg from "../../package.json";

import ExcelJS from "exceljs";

import {
  getNowDateTime,
  getNowDateTimeForFlieName,
  generateUUID,
  getNowDate
} from "@/utils/common";

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

ipcMain.handle("importData", event => {
  importData();
});

function formatPriority(pri) {
  if (pri === "high") return "高";
  if (pri === "medium") return "中";
  if (pri === "low") return "低";
  return "";
}

function parsePriority(str) {
  if (str === "高") return "high";
  if (str === "中") return "medium";
  if (str === "低") return "low";
  return null;
}

function flattenWithLevel(items, depth) {
  const result = [];
  for (const item of items) {
    result.push({ item, level: depth });
    if (item.children && item.children.length > 0) {
      result.push(...flattenWithLevel(item.children, depth + 1));
    }
  }
  return result;
}

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2D2D2D" }
};
const HEADER_FONT = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 12,
  name: "微软雅黑"
};
const BODY_FONT = { size: 11, name: "微软雅黑" };
const ALT_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F5" }
};
const BORDER_STYLE = { style: "thin", color: { argb: "FFCCCCCC" } };

function applyTableStyle(sheet, rowCount) {
  sheet.eachRow((row, rowNum) => {
    row.eachCell(cell => {
      cell.border = {
        top: BORDER_STYLE,
        left: BORDER_STYLE,
        bottom: BORDER_STYLE,
        right: BORDER_STYLE
      };
      if (rowNum === 1) {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.font = BODY_FONT;
        cell.alignment = { vertical: "middle", wrapText: true };
        if (rowNum % 2 === 0) {
          cell.fill = ALT_FILL;
        }
      }
    });
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rowCount, column: sheet.columnCount }
  };
}

function exportData() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "todo-list";

  const todoList = DB.get("todoList");

  // ── Todo Sheet ──
  const sheet1 = workbook.addWorksheet("待办事项");
  sheet1.columns = [
    { header: "内容", key: "content", width: 45 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "颜色", key: "color", width: 12 },
    { header: "创建时间", key: "created", width: 22 },
    { header: "折叠", key: "collapsed", width: 8 },
    { header: "层级", key: "level", width: 8 },
    { header: "ID", key: "id", width: 36 }
  ];
  if (Array.isArray(todoList)) {
    const flat = flattenWithLevel(todoList, 0);
    flat.forEach(entry => {
      const item = entry.item;
      sheet1.addRow({
        content: item.content || "",
        priority: formatPriority(item.priority),
        color: item.color || "",
        created: item.todo_datetime || "",
        collapsed: item.collapsed ? "是" : "",
        level: entry.level,
        id: item.id
      });
    });
  }
  applyTableStyle(sheet1, sheet1.rowCount);

  // ── Done Sheet ──
  const doneList = DB.get("doneList");
  const sheet2 = workbook.addWorksheet("已完成事项");
  sheet2.columns = [
    { header: "内容", key: "content", width: 45 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "颜色", key: "color", width: 12 },
    { header: "创建时间", key: "created", width: 22 },
    { header: "完成时间", key: "done", width: 22 },
    { header: "层级", key: "level", width: 8 },
    { header: "ID", key: "id", width: 36 }
  ];
  if (Array.isArray(doneList)) {
    const flat = flattenWithLevel(doneList, 0);
    flat.forEach(entry => {
      const item = entry.item;
      sheet2.addRow({
        content: item.content || "",
        priority: formatPriority(item.priority),
        color: item.color || "",
        created: item.todo_datetime || "",
        done: item.done_datetime || "",
        level: entry.level,
        id: item.id
      });
    });
  }
  applyTableStyle(sheet2, sheet2.rowCount);

  const defaultPath = `/${getNowDateTimeForFlieName()}.xlsx`;

  dialog
    .showSaveDialog({
      title: "数据导出",
      defaultPath: defaultPath,
      filters: [{ name: "Excel 文件", extensions: ["xlsx"] }]
    })
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

function safeReadCellValue(cell) {
  const val = cell.value;
  if (val == null) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    const hh = String(val.getHours()).padStart(2, "0");
    const mm = String(val.getMinutes()).padStart(2, "0");
    const ss = String(val.getSeconds()).padStart(2, "0");
    return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  }
  if (typeof val === "number") {
    return String(Math.round(val));
  }
  return String(val).trim();
}

function importData() {
  dialog
    .showOpenDialog({
      title: "选择要导入的 Excel 文件",
      filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
      properties: ["openFile"]
    })
    .then(async result => {
      if (result.canceled || !result.filePaths || !result.filePaths[0]) return;

      const filePath = result.filePaths[0];
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const todoSheet = workbook.worksheets.find(w => w.name === "待办事项");
        if (!todoSheet) {
          showNotification({
            title: "导入失败",
            body: "未找到「待办事项」工作表，请使用导出的 Excel 文件"
          });
          return;
        }

        const rows = [];
        todoSheet.eachRow((row, rowNum) => {
          if (rowNum === 1) return;
          const content = safeReadCellValue(row.getCell(1));
          if (!content) return;
          rows.push({
            content,
            priority: parsePriority(safeReadCellValue(row.getCell(2))),
            color: safeReadCellValue(row.getCell(3)) || null,
            todo_datetime: safeReadCellValue(row.getCell(4)),
            collapsed: safeReadCellValue(row.getCell(5)) === "是",
            level: Number(row.getCell(6).value) || 0,
            id: safeReadCellValue(row.getCell(7)) || generateUUID()
          });
        });

        if (rows.length === 0) {
          showNotification({
            title: "导入提示",
            body: "文件中没有可导入的数据"
          });
          return;
        }

        const imported = buildTreeFromLevels(rows);
        const existing = DB.get("todoList") || [];
        const merged = existing.concat(imported);
        DB.set("todoList", merged);

        const wins = BrowserWindow.getAllWindows();
        if (wins.length > 0) wins[0].webContents.send("data-imported");

        showNotification({
          title: "导入完成",
          body: `成功导入 ${imported.length} 条待办事项`
        });
      } catch (e) {
        showNotification({
          title: "导入失败",
          body: e.message || "文件格式错误，请确保使用导出的 Excel 文件"
        });
      }
    });
}

function buildTreeFromLevels(rows) {
  const items = rows.map(r => ({
    id: r.id || generateUUID(),
    todo_date: (() => {
      if (r.todo_datetime)
        return r.todo_datetime.split(" ")[0].replace(/-/g, "/");
      return getNowDate();
    })(),
    todo_datetime: r.todo_datetime || getNowDateTime(),
    content: r.content,
    priority: r.priority,
    color: r.color || null,
    collapsed: !!r.collapsed,
    children: [],
    isChildDone: false,
    childDoneColor: null
  }));

  const root = { level: -1, children: [] };
  const stack = [root];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemLevel = rows[i].level;
    while (stack.length > 0 && stack[stack.length - 1].level >= itemLevel) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(item);
    item.children = [];
    stack.push({ level: itemLevel, children: item.children });
  }

  return root.children;
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
