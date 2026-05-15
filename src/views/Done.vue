<template>
  <div class="root">
    <div class="search-bar" v-if="showSearch" @click.stop>
      <i class="iconfont icon-browse search-icon"></i>
      <input
        v-model="searchQuery"
        v-focus
        placeholder="搜索已完成事项..."
        @click.stop
        @keyup.esc="searchQuery = ''"
        spellcheck="false"
      />
      <i
        v-if="searchQuery"
        class="iconfont icon-close clear-icon"
        @click.stop="searchQuery = ''"
      ></i>
    </div>
    <div v-if="displayList.length === 0" class="no-result">
      无匹配结果
    </div>
    <div class="list" v-for="(group, gIdx) in displayList" :key="gIdx">
      <div class="group">{{ group.dateStr }}</div>
      <div
        class="item"
        :class="{ 'is-child': entry._depth > 0 }"
        v-for="entry in group.items"
        :key="entry.item.id || generateUUID()"
        :style="itemStyle(entry)"
      >
        <div
          class="item-body"
          :class="{ 'done-child': entry.item.isChildDone }"
          :style="strikeColorStyle(entry)"
        >
          <span class="number" :style="numberSpanStyle(entry)">{{
            getNumber(entry)
          }}</span>
          <p v-html="highlight(entry.item.content)"></p>
        </div>
        <span
          v-if="hasChildren(entry.item)"
          class="collapse-toggle"
          @click.stop="toggleDoneCollapse(entry.item)"
          >{{ isCollapsed(entry.item) ? "▶" : "▼" }}</span
        >
        <span
          v-if="!hasChildren(entry.item) && entry._depth > 0"
          class="collapse-spacer"
        ></span>
        <i
          class="iconfont icon-back"
          @click.stop="restore(entry.item)"
          title="恢复"
        ></i>
        <i
          class="iconfont icon-close"
          @click.stop="remove(entry.item)"
          title="删除"
        ></i>
      </div>
    </div>
  </div>
</template>
<script>
import { ipcRenderer } from "electron";
import DB from "@/utils/db";
import { getDateStr, generateUUID } from "@/utils/common";
import { getFormatPattern } from "@/utils/numberFormat";
import EventBus from "@/utils/eventBus";

const DEFAULT_PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6"
};

const COLOR_NONE = "__NONE__";

export default {
  name: "Done",
  inject: [
    "getNumberFormat",
    "getNumberVisible",
    "getChildNumberVisible",
    "getLevelConfigs",
    "getStrikeWidth",
    "getStrikeColor"
  ],
  data() {
    return {
      doneGroupList: null,
      searchQuery: "",
      showSearch: false,
      undoStack: [],
      doneCollapsed: {}
    };
  },
  methods: {
    getDateStr,
    generateUUID,
    priorityColorsMap() {
      return DEFAULT_PRIORITY_COLORS;
    },
    doneAccentColor(done) {
      if (!done) return null;
      if (done.color === COLOR_NONE) return null;
      if (done.color) return done.color;
      if (done.priority) {
        const m = this.priorityColorsMap();
        return m[done.priority] || null;
      }
      return null;
    },
    itemStyle(entry) {
      if (!entry) return {};
      const c = this.doneAccentColor(entry.item);
      const style = {};
      if (c) style.color = c;
      if (entry._depth > 0) {
        style.fontSize = this.levelFontSize(entry._depth) + "px";
        style.paddingLeft = this.levelIndentTotal(entry._depth) + "px";
      }
      return style;
    },
    strikeColorStyle(entry) {
      if (!entry || !entry.item || !entry.item.isChildDone) return {};
      const useColor =
        this.strikeColor || this.doneAccentColor(entry.item) || "#999";
      return {
        "--strike-color": useColor,
        "--strike-width": this.strikeWidth + "px"
      };
    },
    numberSpanStyle(entry) {
      if (!entry) return {};
      const depth = entry._depth;
      const isChild = depth > 0;
      const spacing = isChild
        ? this.levelNumberSpacing(depth)
        : this.numberSpacing;
      const visible = isChild ? this.childNumberVisible : this.numberVisible;
      return {
        marginRight: spacing + "px",
        display: visible ? "inline-flex" : "none",
        justifyContent: "center"
      };
    },
    levelFontSize(depth) {
      const arr = this.levelConfigs.fontSizes;
      return arr && arr.length >= depth ? arr[depth - 1] : 16;
    },
    levelNumberSpacing(depth) {
      const arr = this.levelConfigs.numberSpacings;
      return arr && arr.length >= depth ? arr[depth - 1] : 4;
    },
    levelIndentTotal(depth) {
      const arr = this.levelConfigs.indents;
      let total = 0;
      for (let i = 0; i < depth; i++) {
        total +=
          i < arr.length ? arr[i] : arr.length > 0 ? arr[arr.length - 1] : 18;
      }
      return total;
    },
    levelFormat(depth) {
      const arr = this.levelConfigs.formats;
      const id = arr && arr.length >= depth ? arr[depth - 1] : "arabic";
      return getFormatPattern(id);
    },
    hasChildren(item) {
      return item && item.children && item.children.length > 0;
    },
    isCollapsed(item) {
      return !!this.doneCollapsed[item.id];
    },
    toggleDoneCollapse(item) {
      if (!item || !item.id) return;
      this.$set(this.doneCollapsed, item.id, !this.doneCollapsed[item.id]);
    },
    expandAll() {
      this.doneCollapsed = {};
      this.getDoneList();
    },
    collapseAll() {
      if (!this.doneGroupList) return;
      const map = {};
      const walk = items => {
        items.forEach(item => {
          if (item.children && item.children.length) {
            map[item.id] = true;
            walk(item.children);
          }
        });
      };
      for (const key in this.doneGroupList) {
        walk(this.doneGroupList[key]);
      }
      this.doneCollapsed = map;
      this.getDoneList();
    },
    flattenTree(items) {
      const result = [];
      const walk = (arr, depth) => {
        arr.forEach(item => {
          result.push({ item, _depth: depth });
          if (
            item.children &&
            item.children.length > 0 &&
            !this.isCollapsed(item)
          ) {
            walk(item.children, depth + 1);
          }
        });
      };
      walk(items, 0);
      return result;
    },
    getNumber(entry) {
      if (!entry) return "";
      const fmt =
        entry._depth > 0 ? this.levelFormat(entry._depth) : this.formatPattern;
      if (!entry._path || entry._path.length <= 1) {
        const n = entry._path ? entry._path[0] : 0;
        return fmt(n);
      }
      const prefix = entry._path.slice(0, -1).join(".");
      const last = fmt(entry._path[entry._path.length - 1]);
      return prefix + "." + last;
    },
    getDoneList() {
      const list = DB.groupby("doneList", "done_date");
      this.doneGroupList = list;
      this.ensureItemReactive(this.doneGroupList);
    },
    ensureItemReactive(groups) {
      if (!groups || typeof groups !== "object") return;
      for (const key in groups) {
        const items = groups[key];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          this.$set(item, "color", item.color != null ? item.color : null);
          this.$set(
            item,
            "priority",
            item.priority != null ? item.priority : null
          );
          if (item.children && item.children.length) {
            this.ensureItemReactive({ _: item.children });
          }
        }
      }
    },
    restore(item) {
      const cleanChildren = children => {
        if (!children || !children.length) return [];
        return children.map(child => ({
          ...child,
          done_date: undefined,
          done_datetime: undefined,
          sortOrder: null,
          children: cleanChildren(child.children || [])
        }));
      };
      const todoId = generateUUID();
      DB.insert("todoList", {
        id: todoId,
        todo_date: item.todo_date,
        todo_datetime: item.todo_datetime,
        content: item.content,
        priority: item.priority != null ? item.priority : null,
        color: item.color != null ? item.color : null,
        sortOrder: null,
        children: cleanChildren(item.children),
        collapsed: false
      });

      const ids = this.collectDescendantIds(item);
      for (const id of ids) {
        DB.removeById("doneList", id);
      }

      this.pushUndo({
        type: "restore",
        item: item,
        todoId: todoId
      });

      this.getDoneList();
      EventBus.$emit("refresh-todo");
    },
    collectDescendantIds(item) {
      const ids = [item.id];
      if (item.children && item.children.length) {
        for (const child of item.children) {
          ids.push(...this.collectDescendantIds(child));
        }
      }
      return ids;
    },
    remove(item) {
      const ids = this.collectDescendantIds(item);
      for (const id of ids) {
        DB.removeById("doneList", id);
      }

      this.pushUndo({
        type: "remove",
        item: DB.deepClone(item),
        ids: ids
      });

      this.getDoneList();
    },
    highlight(content) {
      if (!this.searchQuery) return content;
      const escaped = this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const reg = new RegExp(`(${escaped})`, "gi");
      return content.replace(reg, '<span class="highlight-match">$1</span>');
    },
    pushUndo(action) {
      this.undoStack.push(action);
      if (this.undoStack.length > 20) {
        this.undoStack.shift();
      }
    },
    handleUndo() {
      if (this.undoStack.length === 0) return;

      const action = this.undoStack.pop();

      if (action.type === "restore") {
        if (action.todoId) {
          const todoList = DB.get("todoList");
          const matchedIndex = todoList.findIndex(t => t.id === action.todoId);
          if (matchedIndex !== -1) {
            todoList.splice(matchedIndex, 1);
            DB.set("todoList", todoList);
            EventBus.$emit("refresh-todo");
          }
        }

        const restored = DB.deepClone(action.item);
        DB.insert("doneList", restored);
        this.getDoneList();
      }

      if (action.type === "remove") {
        const restored = DB.deepClone(action.item);
        DB.insert("doneList", restored);
        this.getDoneList();
      }
    },
    onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        this.showSearch = true;
        this.$nextTick(() => {
          const input = this.$el.querySelector(".search-bar input");
          if (input) input.focus();
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        this.handleUndo();
      }
      if (e.key === "Escape" && this.showSearch) {
        this.searchQuery = "";
        this.showSearch = false;
      }
    }
  },
  computed: {
    numberFormat() {
      return this.getNumberFormat();
    },
    numberVisible() {
      const fn = this.getNumberVisible;
      return typeof fn === "function" ? fn() : true;
    },
    childNumberVisible() {
      const fn = this.getChildNumberVisible;
      return typeof fn === "function" ? fn() : true;
    },
    numberSpacing() {
      return 6;
    },
    levelConfigs() {
      const fn = this.getLevelConfigs;
      return (
        (typeof fn === "function" ? fn() : null) || {
          fontSizes: [],
          numberSpacings: [],
          indents: []
        }
      );
    },
    formatPattern() {
      return getFormatPattern(this.numberFormat || "arabic");
    },
    strikeWidth() {
      const fn = this.getStrikeWidth;
      return typeof fn === "function" ? fn() : 1;
    },
    strikeColor() {
      const fn = this.getStrikeColor;
      return typeof fn === "function" ? fn() : "";
    },
    displayList() {
      const groups = this.doneGroupList;
      if (!groups) return [];
      const result = [];
      const q = this.searchQuery ? this.searchQuery.toLowerCase() : "";
      for (const key in groups) {
        const items = groups[key];
        const enriched = [];
        const walk = (arr, depth, path) => {
          arr.forEach((item, idx) => {
            const curPath = [...path, idx + 1];
            enriched.push({ item, _depth: depth, _path: curPath });
            if (
              item.children &&
              item.children.length > 0 &&
              !this.isCollapsed(item)
            ) {
              walk(item.children, depth + 1, curPath);
            }
          });
        };
        walk(items, 0, []);
        let filtered = enriched;
        if (q) {
          filtered = enriched.filter(e =>
            e.item.content.toLowerCase().includes(q)
          );
        }
        if (filtered.length > 0) {
          result.push({ dateStr: getDateStr(key), items: filtered });
        }
      }
      return result;
    },
    hasResults() {
      return this.displayList.length > 0;
    }
  },
  created() {
    ipcRenderer.invoke("getDataPath").then(storePath => {
      DB.initDB(storePath);
      this.getDoneList();
    });

    window.addEventListener("keydown", this.onKeyDown);
    EventBus.$on("refresh-done", () => {
      this.getDoneList();
    });
    EventBus.$on("toggle-all", expanded => {
      if (expanded) {
        this.expandAll();
      } else {
        this.collapseAll();
      }
    });
  },
  beforeDestroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    EventBus.$off("refresh-done");
    EventBus.$off("toggle-all");
  },
  directives: {
    focus: {
      inserted: function(el) {
        el.focus();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.root {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 0 15px 28px 15px;
  .search-bar {
    display: flex;
    align-items: center;
    height: 28px;
    margin-bottom: 6px;
    padding: 0 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    .search-icon {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.3);
      margin-right: 6px;
    }
    input {
      flex: 1;
      height: 100%;
      outline: none;
      border: none;
      background: transparent;
      color: #ffffff;
      font-size: 13px;
      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }
    }
    .clear-icon {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      padding: 4px;
      &:hover {
        color: rgba(255, 255, 255, 0.6);
      }
    }
  }
  .no-result {
    text-align: center;
    color: rgba(255, 255, 255, 0.25);
    font-size: 13px;
    padding: 30px 0;
  }
  .list {
    .group {
      position: sticky;
      top: 0;
      z-index: -999;
      height: 224px;
      line-height: 180px;
      box-sizing: border-box;
      color: rgba($color: #cccccc, $alpha: 0.8);
      font-size: 35px;
      text-align: center;
      user-select: none;
    }
    .item {
      display: flex;
      align-items: center;
      min-height: 28px;
      box-sizing: border-box;
      color: rgba(255, 255, 255, 0.9);
      transition: color 0.16s ease;
      &.is-child {
        min-height: 28px;
      }
      .item-body {
        flex: 1;
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 0;
        position: relative;
        color: inherit;
        &.done-child::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: var(--strike-width, 1px);
          background: var(--strike-color, #999);
          pointer-events: none;
          z-index: 1;
        }
      }
      .number {
        font-size: 16px;
        text-align: left;
        flex-shrink: 0;
        line-height: 28px;
        font-feature-settings: "tnum";
        font-variant-numeric: tabular-nums;
        color: inherit;
      }
      .collapse-toggle {
        flex-shrink: 0;
        width: 18px;
        text-align: center;
        font-size: 10px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.35);
        line-height: 28px;
        user-select: none;
        margin-left: auto;
        &:hover {
          color: rgba(255, 255, 255, 0.7);
        }
      }
      .collapse-spacer {
        flex-shrink: 0;
        width: 18px;
        display: inline-block;
        margin-left: auto;
      }
      p {
        flex: 1;
        min-width: 0;
        height: 100%;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        line-height: 28px;
        cursor: pointer;
        color: inherit;
        ::v-deep .highlight-match {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.2);
          border-radius: 2px;
          padding: 0 1px;
        }
      }
      i {
        line-height: 28px;
        padding: 0 5px;
        cursor: pointer;
      }
    }
    .item:hover {
      p {
        opacity: 0.86;
      }
    }
  }
}
</style>
