import Datastore from "lowdb";
import LodashId from "lodash-id";
import FileSync from "lowdb/adapters/FileSync";
import path from "path";
import fs from "fs-extra";

import { getNowDate, getNowDateTime, generateUUID } from "@/utils/common";

const isDevelopment = process.env.NODE_ENV !== "production";

export const CURRENT_VERSION = 3;

let db;

function migrateItem(item) {
  if (!item || typeof item !== "object") return item;
  const rawChildren = Array.isArray(item.children) ? item.children : [];
  const children = rawChildren
    .filter(c => c && typeof c === "object")
    .map(child => migrateItem(child));
  return {
    ...item,
    id: item.id || generateUUID(),
    priority: item.priority != null ? item.priority : null,
    color: item.color != null ? item.color : null,
    children,
    collapsed: item.collapsed != null ? item.collapsed : false,
    sortOrder: item.sortOrder != null ? item.sortOrder : null,
    isChildDone: item.isChildDone != null ? item.isChildDone : false,
    childDoneColor: item.childDoneColor != null ? item.childDoneColor : null
  };
}

const DEFAULT_PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6"
};

function ensureSettingsDisplayDefaults(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.settings || typeof data.settings !== "object") {
    data.settings = {};
  }
  const s = data.settings;
  let patched = false;
  if (typeof s.numberSpacing !== "number") {
    s.numberSpacing = 6;
    patched = true;
  }
  if (typeof s.numberVisible !== "boolean") {
    s.numberVisible = true;
    patched = true;
  }
  if (typeof s.childNumberSpacing !== "number") {
    s.childNumberSpacing = 4;
    patched = true;
  }
  if (typeof s.childNumberVisible !== "boolean") {
    s.childNumberVisible = true;
    patched = true;
  }
  if (typeof s.childFontSize !== "number") {
    s.childFontSize = 16;
    patched = true;
  }
  if (typeof s.childIndent !== "number") {
    s.childIndent = 18;
    patched = true;
  }
  if (!s.levelConfigs || typeof s.levelConfigs !== "object") {
    s.levelConfigs = {
      fontSizes: [16, 14, 13, 12, 12],
      numberSpacings: [6, 4, 4, 4, 4],
      indents: [18, 16, 14, 14, 14],
      formats: [
        "arabic",
        "letter_lower",
        "symbol_dot",
        "symbol_dot",
        "symbol_dot"
      ]
    };
    patched = true;
  }
  if (typeof s.childNumberFormat !== "string") {
    s.childNumberFormat = "arabic";
    patched = true;
  }
  if (typeof s.strikeWidth !== "number") {
    s.strikeWidth = 1;
    patched = true;
  }
  if (typeof s.strikeColor !== "string") {
    s.strikeColor = "";
    patched = true;
  }
  if (typeof s.windowOpacity !== "number") {
    s.windowOpacity = 0.65;
    patched = true;
  }
  if (typeof s.windowBgColor !== "string") {
    s.windowBgColor = "#000000";
    patched = true;
  }
  if (typeof s.windowBgStrength !== "number") {
    s.windowBgStrength = 100;
    patched = true;
  }
  if (typeof s.leftTitle !== "string") {
    s.leftTitle = "todo-list";
    patched = true;
  }
  if (typeof s.rightTitle !== "string") {
    s.rightTitle = "旺财定制版";
    patched = true;
  }
  if (typeof s.linkSpacing !== "number") {
    s.linkSpacing = 8;
    patched = true;
  }
  if (!s.priorityColors || typeof s.priorityColors !== "object") {
    s.priorityColors = Object.assign({}, DEFAULT_PRIORITY_COLORS);
    patched = true;
  } else {
    ["high", "medium", "low"].forEach(k => {
      if (typeof s.priorityColors[k] !== "string" || !s.priorityColors[k]) {
        s.priorityColors[k] = DEFAULT_PRIORITY_COLORS[k];
        patched = true;
      }
    });
  }
  return patched;
}

/** @returns {boolean} whether the persisted file should be rewritten */
function migrateData(data) {
  if (!data || typeof data !== "object") return false;
  let changed = false;
  const version = data._version || 1;

  if (version < CURRENT_VERSION) {
    if (version < 2) {
      data.todoList = (data.todoList || []).map(migrateItem);
      data.doneList = (data.doneList || []).map(migrateItem);
    }
    if (version < 3) {
      const addSortOrder = items => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          if (item.sortOrder == null) item.sortOrder = null;
          delete item.manualOrder;
          if (item.children && item.children.length)
            addSortOrder(item.children);
        });
      };
      addSortOrder(data.todoList || []);
      addSortOrder(data.doneList || []);
    }
    data._version = CURRENT_VERSION;
    changed = true;
  }

  if (ensureSettingsDisplayDefaults(data)) {
    changed = true;
  }

  return changed;
}

function runPersistedMigration() {
  try {
    db.read();
    const state = db.getState();
    const needsWrite = migrateData(state);
    if (needsWrite) {
      db.write();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[db] migrateData failed", e);
  }
}

/** Deep clone plain JSON data (e.g. undo snapshots). */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Count all descendant items (not counting the root item).
 * @param {{ children?: unknown[] }} item
 */
function countChildren(item) {
  if (!item || !Array.isArray(item.children) || item.children.length === 0) {
    return 0;
  }
  return item.children.reduce(
    (sum, child) => sum + 1 + countChildren(child),
    0
  );
}

/**
 * @param {string} id
 * @param {Array<{ id?: string, children?: unknown[] }>} list
 */
function findById(id, list) {
  if (!id || !Array.isArray(list)) return null;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;
    if (item.id === id) return item;
    const nested = findById(id, item.children || []);
    if (nested) return nested;
  }
  return null;
}

function bumpVersionAndWrite(returnValue) {
  db.read();
  const state = db.getState();
  if (state && typeof state === "object") {
    state._version = CURRENT_VERSION;
  }
  return db.write(returnValue);
}

const DB = {
  CURRENT_VERSION,

  initDB(storePath) {
    if (!fs.pathExistsSync(storePath)) {
      fs.mkdirpSync(storePath);
    }

    const dbFile = isDevelopment ? "/data-dev.json" : "/data.json";

    const adapter = new FileSync(path.join(storePath, dbFile));

    db = Datastore(adapter);

    db._.mixin(LodashId);

    db.defaults({
      todoList: [
        {
          id: generateUUID(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content: "🎉 欢迎使用旺财定制版！以下是新功能教程：",
          priority: null,
          color: "#f59e0b",
          collapsed: false,
          children: [
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content:
                "🌳 多级子项目：点击编辑区 + 按钮可添加子项目，支持拖拽重组",
              priority: null,
              color: "#f59e0b",
              children: [
                {
                  id: generateUUID(),
                  todo_date: getNowDate(),
                  todo_datetime: getNowDateTime(),
                  content: "子项目可继续嵌套，最多 5 层",
                  priority: null,
                  color: "#f59e0b",
                  children: []
                }
              ]
            },
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content: "🎨 优先级排序：点击编辑区 1/2/3 按钮设置高/中/低优先级",
              priority: "high",
              color: null,
              children: []
            },
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content:
                "🎯 颜色系统：子项目自动继承父项目颜色，点击色块可自定义",
              priority: null,
              color: "#3b82f6",
              children: []
            },
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content: "🔍 智能搜索：Ctrl+F 搜索，自动展开折叠项目并高亮关键词",
              priority: null,
              color: null,
              children: []
            },
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content: "↩️ 跨路由撤销：Ctrl+Z 可撤销删除/完成/恢复，最多 20 步",
              priority: null,
              color: null,
              children: []
            },
            {
              id: generateUUID(),
              todo_date: getNowDate(),
              todo_datetime: getNowDateTime(),
              content:
                "⚙️ 层级配置：设置面板可为每级子项目独立设置字号/间距/缩进/编号",
              priority: null,
              color: null,
              children: []
            }
          ]
        },
        {
          id: generateUUID(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content: "💡 基本操作：单击空白处创建，单击项目编辑，双击完成",
          priority: null,
          color: null,
          children: []
        },
        {
          id: generateUUID(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content: "📋 级联操作：完成/删除父项目时，自动处理所有子项目",
          priority: "medium",
          color: null,
          children: []
        },
        {
          id: generateUUID(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content:
            "🔢 编号格式：设置面板支持 18 种编号格式，主项目与子项目独立配置",
          priority: null,
          color: "#10b981",
          children: []
        }
      ],
      doneList: [
        {
          done_date: getNowDate(),
          done_datetime: getNowDateTime(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content: "✨ 双击项目标记完成，会移到这里",
          id: generateUUID(),
          priority: null,
          color: "#8b5cf6",
          children: []
        },
        {
          done_date: getNowDate(),
          done_datetime: getNowDateTime(),
          todo_date: getNowDate(),
          todo_datetime: getNowDateTime(),
          content: "【重要】给爱你的人轻声道谢",
          id: "272aa857-bd53-44fb-b6fc-49d4ef595ade",
          priority: null,
          color: null,
          children: []
        }
      ],
      settings: {}
    }).write();

    runPersistedMigration();

    if (!this.has("settings.firstRun")) {
      this.set("settings.firstRun", true);
    }
  },
  has(key) {
    return db
      .read()
      .has(key)
      .value();
  },
  get(key) {
    return db
      .read()
      .get(key)
      .value();
  },
  set(key, value) {
    return db
      .read()
      .set(key, value)
      .set("_version", CURRENT_VERSION)
      .write();
  },
  insert(key, value) {
    const ret = db
      .read()
      .get(key)
      .insert(value)
      .write();
    return bumpVersionAndWrite(ret);
  },
  removeById(key, id) {
    const ret = db
      .read()
      .get(key)
      .removeById(id)
      .write();
    return bumpVersionAndWrite(ret);
  },
  groupby(key, prop) {
    const d = db
      .read()
      .get(key)
      .sortBy(prop)
      .reverse()
      .groupBy(prop)
      .value();
    return d;
  },

  findById,
  deepClone,
  countChildren
};

export default DB;
