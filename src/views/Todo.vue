<template>
  <div class="todo-wrapper">
    <div class="root" @click="add">
      <div class="search-bar" v-if="showSearch" @click.stop>
        <i class="iconfont icon-browse search-icon"></i>
        <input
          v-model="searchQuery"
          v-focus
          placeholder="搜索待办事项..."
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
      <div v-if="searchQuery && !searchList.length" class="no-result">
        无匹配结果
      </div>
      <draggable
        v-if="!searchQuery"
        class="list"
        v-model="dragList"
        v-bind="dragOptions"
        @start="onDragStart"
        @end="onDragEnd"
        :disabled="!!editId"
      >
        <transition-group type="transition" :name="!drag ? 'flip-list' : null">
          <div
            class="item"
            :class="{ 'is-child': entry._depth > 0 }"
            v-for="entry in dragList"
            :key="entry.item.id"
            :data-item-id="entry.item.id"
            :style="[itemTextStyle(entry.item), childItemStyle(entry)]"
            @dblclick.stop="done($event, entry.item)"
            @click.stop="editing(entry.item)"
          >
            <div
              class="item-body"
              :class="{ 'done-child': entry.item.isChildDone }"
              :style="itemBodyStyle(entry)"
            >
              <span class="number" :style="numberSpanStyle(entry)">{{
                getNumber(entry)
              }}</span>
              <p
                v-if="!isEditing(entry.item)"
                v-html="highlight(entry.item.content)"
              ></p>
              <div v-else class="edit" @click.stop>
                <input
                  v-model="entry.item.content"
                  v-focus
                  @click.stop="return false;"
                  @keyup.27="cancel"
                  @keyup.13="edited"
                  spellcheck="false"
                  :style="itemTextStyle(entry.item)"
                />
                <div class="edit-tools">
                  <div class="color-editor color-popover">
                    <button
                      class="color-trigger"
                      :style="colorTriggerStyle(entry.item)"
                      @click.stop="toggleColorPicker(entry.item)"
                    ></button>
                    <div
                      v-if="colorPickerId === entry.item.id"
                      class="color-menu color-popover"
                      @click.stop
                    >
                      <button
                        v-for="color in colorOptions"
                        :key="color"
                        class="color-option"
                        :style="{ backgroundColor: color }"
                        @click.stop="applyColor(entry.item, color)"
                      ></button>
                      <button
                        class="color-clear"
                        @click.stop="applyColor(entry.item, colorNoneValue)"
                      >
                        无
                      </button>
                    </div>
                  </div>
                  <div class="priority-editor priority-popover">
                    <button
                      class="tool-button priority-button"
                      :style="priorityButtonStyle(entry.item)"
                      @click.stop="togglePriorityPicker(entry.item)"
                    >
                      {{ priorityButtonText(entry.item) }}
                    </button>
                    <div
                      v-if="priorityPickerId === entry.item.id"
                      class="priority-menu priority-popover"
                      @click.stop
                    >
                      <button
                        v-for="option in priorityOptions"
                        :key="option.label"
                        class="priority-option"
                        :class="{
                          active: (entry.item.priority || null) === option.value
                        }"
                        :style="{
                          color: option.color || 'rgba(255,255,255,0.78)'
                        }"
                        @click.stop="applyPriority(entry.item, option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                  </div>
                  <i
                    class="iconfont icon-add"
                    @click.stop="addChild(entry.item)"
                    title="添加子项目"
                  ></i>
                  <i class="iconfont icon-select" @click.stop="edited"></i>
                  <i
                    class="iconfont icon-close"
                    @click.stop="remove(entry.item)"
                  ></i>
                </div>
              </div>
            </div>
            <span
              v-if="hasChildren(entry.item)"
              class="collapse-toggle"
              @click.stop="toggleCollapse(entry.item)"
              >{{ entry.item.collapsed ? "▶" : "▼" }}</span
            >
            <span
              v-if="!hasChildren(entry.item) && entry._depth > 0"
              class="collapse-spacer"
            ></span>
          </div>
        </transition-group>
      </draggable>
      <div v-else class="list">
        <div
          class="item"
          :class="{ 'is-child': entry._depth > 0 }"
          v-for="entry in searchList"
          :key="entry.item.id"
          :style="[itemTextStyle(entry.item), childItemStyle(entry)]"
          @dblclick.stop="done($event, entry.item)"
          @click.stop="editing(entry.item)"
        >
          <div
            class="item-body"
            :class="{ 'done-child': entry.item.isChildDone }"
            :style="itemBodyStyle(entry)"
          >
            <span class="number" :style="numberSpanStyle(entry)">{{
              getNumber(entry)
            }}</span>
            <p
              v-if="!isEditing(entry.item)"
              v-html="highlight(entry.item.content)"
            ></p>
            <div v-else class="edit" @click.stop>
              <input
                v-model="entry.item.content"
                v-focus
                @click.stop="return false;"
                @keyup.27="cancel"
                @keyup.13="edited"
                spellcheck="false"
                :style="itemTextStyle(entry.item)"
              />
              <div class="edit-tools">
                <div class="color-editor color-popover">
                  <button
                    class="color-trigger"
                    :style="colorTriggerStyle(entry.item)"
                    @click.stop="toggleColorPicker(entry.item)"
                  ></button>
                  <div
                    v-if="colorPickerId === entry.item.id"
                    class="color-menu color-popover"
                    @click.stop
                  >
                    <button
                      v-for="color in colorOptions"
                      :key="color"
                      class="color-option"
                      :style="{ backgroundColor: color }"
                      @click.stop="applyColor(entry.item, color)"
                    ></button>
                    <button
                      class="color-clear"
                      @click.stop="applyColor(entry.item, colorNoneValue)"
                    >
                      无
                    </button>
                  </div>
                </div>
                <div class="priority-editor priority-popover">
                  <button
                    class="tool-button priority-button"
                    :style="priorityButtonStyle(entry.item)"
                    @click.stop="togglePriorityPicker(entry.item)"
                  >
                    {{ priorityButtonText(entry.item) }}
                  </button>
                  <div
                    v-if="priorityPickerId === entry.item.id"
                    class="priority-menu priority-popover"
                    @click.stop
                  >
                    <button
                      v-for="option in priorityOptions"
                      :key="option.label"
                      class="priority-option"
                      :class="{
                        active: (entry.item.priority || null) === option.value
                      }"
                      :style="{
                        color: option.color || 'rgba(255,255,255,0.78)'
                      }"
                      @click.stop="applyPriority(entry.item, option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <i
                  class="iconfont icon-add"
                  @click.stop="addChild(entry.item)"
                  title="添加子项目"
                ></i>
                <i class="iconfont icon-select" @click.stop="edited"></i>
                <i
                  class="iconfont icon-close"
                  @click.stop="remove(entry.item)"
                ></i>
              </div>
            </div>
          </div>
          <span
            v-if="hasChildren(entry.item)"
            class="collapse-toggle"
            @click.stop="toggleCollapse(entry.item)"
            >{{ entry.item.collapsed ? "▶" : "▼" }}</span
          >
          <span
            v-if="!hasChildren(entry.item) && entry._depth > 0"
            class="collapse-spacer"
          ></span>
        </div>
      </div>
    </div>
    <transition name="toast-fade">
      <div v-if="toastVisible" class="toast">
        <span class="toast-icon">&#x26A0;</span>
        <span class="toast-msg">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>
<script>
import draggable from "vuedraggable";
import CursorSpecialEffects from "@/utils/fireworks";
import { ipcRenderer } from "electron";
import DB from "@/utils/db";
import { getNowDate, getNowDateTime, generateUUID } from "@/utils/common";
import { getFormatPattern } from "@/utils/numberFormat";
import EventBus from "@/utils/eventBus";

const DEFAULT_PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e"
};

const COLOR_NONE = "__NONE__";

const COLOR_OPTIONS = [
  "#ef4444",
  "#f59e0b",
  "#fbbf24",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f5f5f5"
];

export default {
  name: "Todo",
  components: {
    draggable
  },
  inject: [
    "getNumberFormat",
    "getNumberSpacing",
    "getNumberVisible",
    "getChildNumberVisible",
    "getLevelConfigs",
    "getStrikeWidth",
    "getStrikeColor"
  ],
  data() {
    return {
      todoList: null,
      dragList: [],
      drag: false,
      dragUndoSnapshot: null,
      editId: "",
      tempItem: null,
      dblclick: false,
      searchQuery: "",
      showSearch: false,
      undoStack: [],
      colorPickerId: "",
      priorityPickerId: "",
      colorNoneValue: COLOR_NONE,
      colorOptions: COLOR_OPTIONS,
      docClickBound: null,
      searchRestoreCollapsed: {},
      toastMessage: "",
      toastVisible: false,
      toastTimer: null
    };
  },
  watch: {
    searchQuery(val) {
      if (!val) {
        this.restoreSearchCollapsed();
        this.$nextTick(() => this.syncDragList());
      } else {
        this.autoExpandForSearch(val);
      }
    }
  },
  methods: {
    getTodoList() {
      const list = DB.get("todoList");
      this.todoList = Array.isArray(list) ? list : [];
      this.ensureItemReactive(this.todoList);
      this.deduplicateTree(this.todoList);
      this.sortChildrenRecursive(this.todoList);
      const flat = this.flattenTree(this.sortedTodoList);
      this.dragList = flat;
    },
    ensureItemReactive(items) {
      if (!items || !items.length) return;
      for (const item of items) {
        this.$set(item, "color", item.color != null ? item.color : null);
        this.$set(
          item,
          "priority",
          item.priority != null ? item.priority : null
        );
        this.$set(
          item,
          "sortOrder",
          item.sortOrder != null ? item.sortOrder : null
        );
        if (item.children && item.children.length) {
          this.ensureItemReactive(item.children);
        }
      }
    },
    deduplicateTree(items) {
      for (const item of items) {
        if (item.children && item.children.length) {
          const seen = new Set();
          item.children = item.children.filter(child => {
            if (!child || !child.id) return false;
            if (seen.has(child.id)) return false;
            seen.add(child.id);
            return true;
          });
          this.deduplicateTree(item.children);
        }
      }
    },
    syncDragList() {
      if (!this.todoList) return;
      if (this.searchQuery) return;
      this.sortChildrenRecursive(this.todoList);
      const source = this.sortedTodoList;
      const next = this.flattenTree(source);
      this.dragList = next;
    },
    onDragStart() {
      this.drag = true;
      this.dragUndoSnapshot = DB.deepClone(this.todoList);
    },
    recalculateDepths(flat) {
      if (!flat || !flat.length) return;
      flat[0]._depth = 0;
      for (let i = 1; i < flat.length; i++) {
        const entry = flat[i];
        const prev = flat[i - 1];
        if (entry._depth > prev._depth + 1) {
          entry._depth = prev._depth + 1;
        }
        if (entry._depth < 0) entry._depth = 0;
      }
    },
    hasPriorityInversion(flat, newIndex) {
      if (newIndex <= 0) return false;
      const moved = flat[newIndex];
      if (!moved || !moved.item || !moved.item.priority) return false;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const movedRank = priorityOrder[moved.item.priority];
      const prev = flat[newIndex - 1];
      if (!prev || !prev.item) return false;
      const prevRank =
        prev.item.priority != null ? priorityOrder[prev.item.priority] ?? 3 : 3;
      return movedRank < prevRank;
    },
    showToast(msg) {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastMessage = msg;
      this.toastVisible = true;
      this.toastTimer = setTimeout(() => {
        this.toastVisible = false;
        this.toastTimer = null;
      }, 2500);
    },
    onDragEnd(evt) {
      this.drag = false;
      const flat = this.dragList;
      const movedEntry = flat[evt.newIndex];

      if (this.hasPriorityInversion(flat, evt.newIndex)) {
        this.showToast("高优先级项目不能拖到低优先级项目下方");
        this.getTodoList();
        return;
      }

      const baseDepth = movedEntry._depth;
      const descendants = [];
      const start =
        evt.newIndex < evt.oldIndex ? evt.oldIndex + 1 : evt.oldIndex;
      for (let i = start; i < flat.length; i++) {
        if (flat[i]._depth <= baseDepth) break;
        descendants.push(flat[i]);
      }
      if (descendants.length > 0) {
        flat.splice(start, descendants.length);
        const idx = flat.indexOf(movedEntry);
        flat.splice(idx + 1, 0, ...descendants);
      }
      for (const entry of flat) {
        entry.item.children = [];
      }
      this.recalculateDepths(flat);
      this.todoList = this.unflattenTree(flat);
      this.reassignSortOrders();
      if (movedEntry && movedEntry._depth > 0) {
        const parent = this.findParentInTree(this.todoList, movedEntry.item.id);
        if (parent && parent.collapsed) {
          this.$set(parent, "collapsed", false);
        }
      }
      DB.set("todoList", this.todoList);
      this.pushUndo({ type: "drag", snapshot: this.dragUndoSnapshot });
      this.dragUndoSnapshot = null;
      this.syncDragList();
      this.$nextTick(() => {
        if (movedEntry) {
          const el = this.$el.querySelector(
            `[data-item-id="${movedEntry.item.id}"]`
          );
          if (el) {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
      });
    },
    reassignSortOrders() {
      if (!this.todoList) return;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const assign = items => {
        const groups = {};
        for (const t of items) {
          const key = t.priority != null ? priorityOrder[t.priority] ?? 3 : 3;
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
        }
        for (const key in groups) {
          groups[key].forEach((t, idx) => {
            this.$set(t, "sortOrder", idx);
          });
        }
        for (const item of items) {
          if (item.children && item.children.length) {
            assign(item.children);
          }
        }
      };
      assign(this.todoList);
    },
    priorityBaseColor(todo) {
      if (!todo || !todo.priority) return null;
      return DEFAULT_PRIORITY_COLORS[todo.priority] || null;
    },
    itemAccentColor(todo) {
      if (!todo) return null;
      if (todo.color === COLOR_NONE) return null;
      if (todo.color) return todo.color;
      return this.priorityBaseColor(todo);
    },
    itemTextStyle(todo) {
      const color = this.itemAccentColor(todo);
      return color ? { color } : {};
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
    childItemStyle(entry) {
      if (!entry || entry._depth <= 0) return {};
      const depth = entry._depth;
      return {
        fontSize: this.levelFontSize(depth) + "px",
        paddingLeft: this.levelIndentTotal(depth) + "px"
      };
    },
    itemBodyStyle(entry) {
      if (!entry || !entry.item || !entry.item.isChildDone) return {};
      const useColor =
        this.strikeColor || this.itemAccentColor(entry.item) || "#999";
      return {
        "--strike-color": useColor,
        "--strike-width": this.strikeWidth + "px"
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
    priorityButtonText(todo) {
      if (!todo || !todo.priority) return "无";
      if (todo.priority === "high") return "1";
      if (todo.priority === "medium") return "2";
      if (todo.priority === "low") return "3";
      return "无";
    },
    priorityButtonStyle(todo) {
      const color = this.priorityBaseColor(todo);
      if (!color) {
        return {
          color: "rgba(255,255,255,0.55)",
          borderColor: "rgba(255,255,255,0.12)"
        };
      }
      return {
        color,
        borderColor: color
      };
    },
    togglePriorityPicker(todo) {
      if (!todo || !todo.id) return;
      this.colorPickerId = "";
      this.priorityPickerId = this.priorityPickerId === todo.id ? "" : todo.id;
    },
    applyPriority(todo, priority) {
      if (!todo) return;
      const oldColor = todo.color;
      const oldPriority = todo.priority;
      const changedChildren = [];
      if (todo.children && todo.children.length) {
        const allSameAsOld = todo.children.every(child => {
          const childColor = child.color || null;
          const old = oldColor || null;
          return childColor === old;
        });
        if (allSameAsOld) {
          for (const child of todo.children) {
            changedChildren.push({ id: child.id, oldColor: child.color });
          }
        }
      }
      this.$set(todo, "priority", priority);
      this.$set(todo, "sortOrder", null);
      if (priority) {
        this.$set(todo, "color", DEFAULT_PRIORITY_COLORS[priority]);
      } else {
        this.$set(todo, "color", COLOR_NONE);
      }
      if (changedChildren.length) {
        const newColor = todo.color;
        for (const child of todo.children) {
          this.$set(child, "color", newColor);
        }
      }
      this.pushUndo({
        type: "priority",
        itemId: todo.id,
        oldPriority,
        oldColor,
        changedChildren
      });
      this.priorityPickerId = "";
      this.persistTodoList();
    },
    colorTriggerStyle(todo) {
      const color = this.itemAccentColor(todo);
      return {
        backgroundColor: color || "transparent",
        borderColor: color || "rgba(255,255,255,0.2)"
      };
    },
    toggleColorPicker(todo) {
      if (!todo || !todo.id) return;
      this.priorityPickerId = "";
      this.colorPickerId = this.colorPickerId === todo.id ? "" : todo.id;
    },
    applyColor(todo, color) {
      if (!todo) return;
      const oldColor = todo.color;
      const changedChildren = [];
      if (todo.children && todo.children.length) {
        const allSameAsOld = todo.children.every(child => {
          const childColor = child.color || null;
          const old = oldColor || null;
          return childColor === old;
        });
        if (allSameAsOld) {
          for (const child of todo.children) {
            changedChildren.push({ id: child.id, oldColor: child.color });
          }
        }
      }
      this.$set(todo, "color", color);
      if (changedChildren.length) {
        for (const child of todo.children) {
          this.$set(child, "color", color);
        }
      }
      this.pushUndo({
        type: "color",
        itemId: todo.id,
        oldColor,
        changedChildren
      });
      this.colorPickerId = "";
      this.priorityPickerId = "";
      this.persistTodoList();
    },
    getNumber(entry) {
      if (!entry || !entry._path || !entry._path.length) return "";
      const fmt =
        entry._depth > 0 ? this.levelFormat(entry._depth) : this.formatPattern;
      if (entry._path.length === 1) {
        return fmt(entry._path[0]);
      }
      const prefix = entry._path.slice(0, -1).join(".");
      const last = fmt(entry._path[entry._path.length - 1]);
      return prefix + "." + last;
    },
    measureNumberWidth(label) {
      if (!label) return 28;
      const canvas =
        this._numberMeasureCanvas ||
        (this._numberMeasureCanvas = document.createElement("canvas"));
      const context = canvas.getContext("2d");
      if (!context) return Math.max(String(label).length * 16, 28);
      context.font =
        '600 16px "Avenir", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
      return Math.ceil(context.measureText(String(label)).width) + 6;
    },
    add() {
      if (!this.todoList) return;
      if (this.drag) return;
      if (this.editId) {
        this.edited();
        return;
      }

      const newItem = {
        id: generateUUID(),
        todo_date: getNowDate(),
        todo_datetime: getNowDateTime(),
        content: "",
        priority: null,
        color: null,
        sortOrder: null,
        children: [],
        collapsed: false
      };
      this.todoList.push(newItem);
      this.tempItem = Object.assign({}, newItem);
      this.editId = newItem.id;
      this.colorPickerId = "";
      this.priorityPickerId = "";
      this.$nextTick(() => this.syncDragList());
    },
    isEditing(todo) {
      return !!todo && todo.id === this.editId;
    },
    editing(todo) {
      setTimeout(() => {
        if (this.dblclick || !todo) {
          return;
        }

        if (this.editId && this.editId !== todo.id) {
          this.edited();
        }

        this.tempItem = Object.assign({}, todo);
        this.editId = todo.id;
        this.colorPickerId = "";
        this.priorityPickerId = "";
      }, 220);
    },
    edited() {
      if (!this.todoList) return;
      const removeEmpty = items => {
        return items.filter(item => {
          if (!item.content) return false;
          if (item.children && item.children.length) {
            item.children = removeEmpty(item.children);
          }
          return true;
        });
      };
      this.todoList = removeEmpty(this.todoList);
      this.editId = "";
      this.colorPickerId = "";
      this.priorityPickerId = "";
      DB.set("todoList", this.todoList);
      this.$nextTick(() => this.syncDragList());
    },
    cancel() {
      if (!this.editId) return;
      const todo = this.findInTree(this.todoList, this.editId);
      if (todo) {
        Object.assign(todo, DB.deepClone(this.tempItem));
      }
      this.editId = "";
      this.colorPickerId = "";
      this.priorityPickerId = "";
      this.edited();
    },
    findInTree(items, id) {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children && item.children.length) {
          const found = this.findInTree(item.children, id);
          if (found) return found;
        }
      }
      return null;
    },
    findAndRemoveFromTree(items, id, parentId) {
      const index = items.findIndex(t => t.id === id);
      if (index !== -1) {
        const removedItem = items[index];
        items.splice(index, 1);
        return {
          parentArray: items,
          index,
          removedItem,
          parentId: parentId || null
        };
      }
      for (const item of items) {
        if (item.children && item.children.length) {
          const result = this.findAndRemoveFromTree(item.children, id, item.id);
          if (result) return result;
        }
      }
      return null;
    },
    findParentInTree(items, id) {
      if (!items || !id) return null;
      for (const item of items) {
        if (!item.children || !item.children.length) continue;
        if (item.children.some(c => c.id === id)) return item;
        const found = this.findParentInTree(item.children, id);
        if (found) return found;
      }
      return null;
    },
    hasChildren(todo) {
      return todo && todo.children && todo.children.length > 0;
    },
    toggleCollapse(todo) {
      if (!todo) return;
      this.$set(todo, "collapsed", !todo.collapsed);
      this.persistTodoList();
    },
    addChild(parent) {
      if (!parent) return;
      const parentDepth = this.calcDepth(this.todoList, parent.id);
      if (parentDepth >= 5) {
        return;
      }
      if (this.editId) {
        this.edited();
      }
      const newItem = {
        id: generateUUID(),
        todo_date: getNowDate(),
        todo_datetime: getNowDateTime(),
        content: "",
        priority: null,
        color: parent.color,
        sortOrder: null,
        children: [],
        collapsed: false
      };
      if (!Array.isArray(parent.children)) {
        this.$set(parent, "children", []);
      }
      parent.children.push(newItem);
      this.tempItem = Object.assign({}, newItem);
      this.editId = newItem.id;
      this.colorPickerId = "";
      this.priorityPickerId = "";
      this.persistTodoList();
    },
    flattenTree(tree) {
      const result = [];
      const walk = (items, depth, parentPath) => {
        if (depth > 5) return;
        items.forEach((item, idx) => {
          const path = [...parentPath, idx + 1];
          result.push({ item, _depth: depth, _path: path });
          if (item.children && item.children.length > 0 && !item.collapsed) {
            walk(item.children, depth + 1, path);
          }
        });
      };
      walk(tree, 0, []);
      return result;
    },
    unflattenTree(flat) {
      const root = [];
      const stack = [{ children: root, level: -1 }];
      for (const entry of flat) {
        const item = entry.item;
        const _depth = entry._depth;
        if (!item) continue;
        while (stack.length > 1 && stack[stack.length - 1].level >= _depth) {
          stack.pop();
        }
        stack[stack.length - 1].children.push(item);
        if (!Array.isArray(item.children)) {
          item.children = [];
        }
        stack.push({ children: item.children, level: _depth });
      }
      return root;
    },
    remove(todo) {
      if (!todo || !todo.id) return;
      const result = this.findAndRemoveFromTree(this.todoList, todo.id);
      if (!result) return;
      this.pushUndo({
        type: "remove",
        item: DB.deepClone(result.removedItem),
        parentId: result.parentId,
        childIndex: result.index
      });
      this.editId = "";
      this.colorPickerId = "";
      this.priorityPickerId = "";
      DB.set("todoList", this.todoList);
      this.$nextTick(() => this.syncDragList());
    },
    done(event, todo) {
      if (this.editId && this.editId !== todo.id) {
        this.edited();
      }
      if (this.editId === todo.id) {
        this.editId = "";
        this.colorPickerId = "";
        this.priorityPickerId = "";
      }
      this.dblclick = true;
      setTimeout(() => {
        this.dblclick = false;
      }, 500);
      CursorSpecialEffects.handleMouseDown(event);
      if (!todo || !todo.id) return;

      const parent = this.findParentInTree(this.todoList, todo.id);
      if (parent) {
        const prevState = todo.isChildDone;
        this.$set(todo, "isChildDone", !todo.isChildDone);
        this.pushUndo({
          type: "child_done",
          itemId: todo.id,
          prevState: prevState
        });
        DB.set("todoList", this.todoList);
        return;
      }

      if (todo.children && todo.children.length > 0) {
        this.cascadeDone(todo);
        return;
      }

      const result = this.findAndRemoveFromTree(this.todoList, todo.id);
      if (!result) return;
      const removedItem = result.removedItem;
      const doneItem = Object.assign(
        { done_date: getNowDate(), done_datetime: getNowDateTime() },
        removedItem
      );
      DB.insert("doneList", doneItem);
      this.pushUndo({
        type: "done",
        item: DB.deepClone(removedItem),
        doneItem
      });
      DB.set("todoList", this.todoList);
      this.$nextTick(() => this.syncDragList());
    },
    cascadeDone(todo) {
      if (!todo || !todo.id) return;
      const doneItem = Object.assign(
        { done_date: getNowDate(), done_datetime: getNowDateTime() },
        DB.deepClone(todo)
      );
      DB.insert("doneList", doneItem);
      this.pushUndo({
        type: "cascade_done",
        items: [doneItem],
        parentId: todo.id
      });
      const result = this.findAndRemoveFromTree(this.todoList, todo.id);
      if (result) {
        DB.set("todoList", this.todoList);
        EventBus.$emit("refresh-done");
        this.$nextTick(() => this.syncDragList());
      }
    },
    calcDepth(items, id, depth) {
      if (!depth) depth = 0;
      for (const item of items) {
        if (item.id === id) return depth;
        if (item.children && item.children.length) {
          const found = this.calcDepth(item.children, id, depth + 1);
          if (found !== -1) return found;
        }
      }
      return -1;
    },
    cleanEmptyChildren(items) {
      if (!items) return;
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          this.cleanEmptyChildren(item.children);
          const hasReal = item.children.some(c => !c.isChildDone || c.content);
          if (!hasReal && item.children.every(c => !c.content)) {
            item.children = [];
          }
        }
      }
    },
    sortChildrenRecursive(items) {
      if (!items || !items.length) return;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => {
        const rankA = a.priority != null ? priorityOrder[a.priority] ?? 3 : 3;
        const rankB = b.priority != null ? priorityOrder[b.priority] ?? 3 : 3;
        if (rankA !== rankB) return rankA - rankB;
        if (a.sortOrder != null && b.sortOrder != null)
          return a.sortOrder - b.sortOrder;
        if (a.sortOrder != null) return -1;
        if (b.sortOrder != null) return 1;
        return new Date(a.todo_datetime) - new Date(b.todo_datetime);
      });
      for (const item of items) {
        if (item.children && item.children.length) {
          this.sortChildrenRecursive(item.children);
        }
      }
    },
    persistTodoList() {
      if (!this.todoList) return;
      DB.set("todoList", this.todoList);
      this.$nextTick(() => this.syncDragList());
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
    autoExpandForSearch(q) {
      if (!this.todoList) return;
      const lowerQ = q.toLowerCase();
      this.searchRestoreCollapsed = {};
      const walk = (items, ancestors) => {
        items.forEach(item => {
          const match = item.content.toLowerCase().includes(lowerQ);
          if (match && ancestors.length > 0) {
            ancestors.forEach(anc => {
              if (anc.collapsed) {
                this.searchRestoreCollapsed[anc.id] = true;
                this.$set(anc, "collapsed", false);
              }
            });
          }
          if (item.children && item.children.length) {
            walk(item.children, [...ancestors, item]);
          }
        });
      };
      walk(this.todoList, []);
    },
    restoreSearchCollapsed() {
      for (const id in this.searchRestoreCollapsed) {
        const found = this.findInTree(this.todoList, id);
        if (found) {
          this.$set(found, "collapsed", true);
        }
      }
      this.searchRestoreCollapsed = {};
    },
    handleUndo() {
      if (this.editId) return;
      if (this.undoStack.length === 0) return;

      const action = this.undoStack.pop();

      if (action.type === "done") {
        this.todoList.push(DB.deepClone(action.item));
        DB.removeById("doneList", action.doneItem.id);
        DB.set("todoList", this.todoList);
        EventBus.$emit("refresh-done");
        this.$nextTick(() => this.syncDragList());
      } else if (action.type === "cascade_done") {
        action.items.forEach(item => {
          if (item.id) {
            DB.removeById("doneList", item.id);
          }
        });
        this.todoList.push(DB.deepClone(action.items[0]));
        DB.set("todoList", this.todoList);
        EventBus.$emit("refresh-done");
        this.$nextTick(() => this.syncDragList());
      } else if (action.type === "remove") {
        const restored = DB.deepClone(action.item);
        if (action.parentId) {
          const parent = this.findInTree(this.todoList, action.parentId);
          if (parent) {
            if (!Array.isArray(parent.children)) {
              this.$set(parent, "children", []);
            }
            parent.children.splice(action.childIndex, 0, restored);
          } else {
            this.todoList.push(restored);
          }
        } else {
          this.todoList.push(restored);
        }
        DB.set("todoList", this.todoList);
        this.$nextTick(() => this.syncDragList());
      } else if (action.type === "child_done") {
        const target = this.findInTree(this.todoList, action.itemId);
        if (target) {
          this.$set(target, "isChildDone", action.prevState);
          DB.set("todoList", this.todoList);
          this.$nextTick(() => this.syncDragList());
        }
      } else if (action.type === "drag") {
        this.todoList = DB.deepClone(action.snapshot);
        DB.set("todoList", this.todoList);
        this.$nextTick(() => this.syncDragList());
      } else if (action.type === "color") {
        const target = this.findInTree(this.todoList, action.itemId);
        if (target) {
          this.$set(target, "color", action.oldColor);
          for (const childInfo of action.changedChildren) {
            const child = this.findInTree(this.todoList, childInfo.id);
            if (child) {
              this.$set(child, "color", childInfo.oldColor);
            }
          }
          DB.set("todoList", this.todoList);
          this.$nextTick(() => this.syncDragList());
        }
      } else if (action.type === "priority") {
        const target = this.findInTree(this.todoList, action.itemId);
        if (target) {
          this.$set(target, "priority", action.oldPriority);
          this.$set(target, "color", action.oldColor);
          for (const childInfo of action.changedChildren) {
            const child = this.findInTree(this.todoList, childInfo.id);
            if (child) {
              this.$set(child, "color", childInfo.oldColor);
            }
          }
          DB.set("todoList", this.todoList);
          this.$nextTick(() => this.syncDragList());
        }
      }
    },
    onDocClick(e) {
      if (!this.colorPickerId && !this.priorityPickerId) return;
      const el = e.target;
      if (
        el &&
        el.closest &&
        (el.closest(".color-popover") || el.closest(".priority-popover"))
      ) {
        return;
      }
      this.colorPickerId = "";
      this.priorityPickerId = "";
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
      if (e.ctrlKey && e.key === "ArrowDown") {
        e.preventDefault();
        if (e.shiftKey) {
          this.expandAll();
        } else {
          this.expandCurrent();
        }
      }
      if (e.ctrlKey && e.key === "ArrowUp") {
        e.preventDefault();
        if (e.shiftKey) {
          this.collapseAll();
        } else {
          this.collapseCurrent();
        }
      }
    },
    expandCurrent() {
      if (!this.todoList) return;
      for (const item of this.todoList) {
        if (item.children && item.children.length && item.collapsed) {
          this.$set(item, "collapsed", false);
          this.persistTodoList();
          return;
        }
      }
    },
    collapseCurrent() {
      if (!this.todoList) return;
      for (const item of this.todoList) {
        if (item.children && item.children.length && !item.collapsed) {
          this.$set(item, "collapsed", true);
          this.persistTodoList();
          return;
        }
      }
    },
    expandAll() {
      if (!this.todoList) return;
      const walk = items => {
        items.forEach(item => {
          if (item.children && item.children.length) {
            this.$set(item, "collapsed", false);
            walk(item.children);
          }
        });
      };
      walk(this.todoList);
      this.persistTodoList();
    },
    collapseAll() {
      if (!this.todoList) return;
      const walk = items => {
        items.forEach(item => {
          if (item.children && item.children.length) {
            this.$set(item, "collapsed", true);
            walk(item.children);
          }
        });
      };
      walk(this.todoList);
      this.persistTodoList();
    }
  },
  computed: {
    sortedTodoList() {
      if (!this.todoList || !this.todoList.length) return [];
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return this.todoList.slice().sort((a, b) => {
        const rankA = a.priority != null ? priorityOrder[a.priority] ?? 3 : 3;
        const rankB = b.priority != null ? priorityOrder[b.priority] ?? 3 : 3;
        if (rankA !== rankB) return rankA - rankB;
        if (a.sortOrder != null && b.sortOrder != null)
          return a.sortOrder - b.sortOrder;
        if (a.sortOrder != null) return -1;
        if (b.sortOrder != null) return 1;
        return new Date(a.todo_datetime) - new Date(b.todo_datetime);
      });
    },
    numberFormat() {
      return this.getNumberFormat();
    },
    numberSpacing() {
      const fn = this.getNumberSpacing;
      return typeof fn === "function" ? fn() : 6;
    },
    numberVisible() {
      const fn = this.getNumberVisible;
      return typeof fn === "function" ? fn() : true;
    },
    childNumberVisible() {
      const fn = this.getChildNumberVisible;
      return typeof fn === "function" ? fn() : true;
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
    searchList() {
      if (!this.searchQuery || !this.todoList) return [];
      const q = this.searchQuery.toLowerCase();
      const result = [];
      const walk = (items, depth, parentPath) => {
        items.forEach((item, idx) => {
          const path = [...parentPath, idx + 1];
          if (item.content.toLowerCase().includes(q)) {
            result.push({ item, _depth: depth, _path: path });
          }
          if (item.children && item.children.length) {
            walk(item.children, depth + 1, path);
          }
        });
      };
      walk(this.sortedTodoList, 0, []);
      return result;
    },
    priorityOptions() {
      return [
        { value: "high", label: "1", color: DEFAULT_PRIORITY_COLORS.high },
        { value: "medium", label: "2", color: DEFAULT_PRIORITY_COLORS.medium },
        { value: "low", label: "3", color: DEFAULT_PRIORITY_COLORS.low },
        { value: null, label: "无", color: null }
      ];
    },
    maxNumberWidth() {
      return 0;
    },
    dragOptions() {
      return {
        animation: 200,
        group: "description",
        disabled: false,
        ghostClass: "ghost"
      };
    }
  },
  created() {
    ipcRenderer.invoke("getDataPath").then(storePath => {
      DB.initDB(storePath);
      this.getTodoList();
    });

    window.addEventListener("keydown", this.onKeyDown);
    this.docClickBound = this.onDocClick.bind(this);
    document.addEventListener("click", this.docClickBound);
    EventBus.$on("refresh-todo", () => {
      this.getTodoList();
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
    if (this.docClickBound) {
      document.removeEventListener("click", this.docClickBound);
    }
    EventBus.$off("refresh-todo");
    EventBus.$off("toggle-all");
  },
  directives: {
    focus: {
      inserted(el) {
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
    .item {
      display: flex;
      align-items: center;
      min-height: 28px;
      box-sizing: border-box;
      color: rgba(255, 255, 255, 0.9);
      transition: color 0.16s ease;
      &.is-child {
        min-height: 28px;
        p {
          font-size: inherit;
          line-height: 28px;
        }
        .edit input {
          font-size: inherit;
          line-height: 28px;
          height: 28px;
        }
        .number {
          font-size: inherit;
          line-height: 28px;
        }
        .collapse-toggle {
          line-height: 28px;
        }
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
      }
      p {
        flex: 1;
        min-width: 0;
        height: 100%;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        cursor: pointer;
        user-select: none;
        line-height: 28px;
        color: inherit;
        ::v-deep .highlight-match {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.2);
          border-radius: 2px;
          padding: 0 1px;
        }
      }
      .edit {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        gap: 8px;
        input {
          flex: 1;
          min-width: 0;
          height: 28px;
          outline: none;
          border: none;
          background: transparent;
          font-size: 16px;
          line-height: 28px;
          color: inherit;
        }
      }
      .edit-tools {
        position: relative;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        i {
          line-height: 28px;
          padding: 0 5px;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.82);
        }
        .icon-add {
          font-size: 14px;
          font-weight: bold;
        }
      }
      .tool-button {
        min-width: 28px;
        height: 22px;
        padding: 0 6px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        font-size: 12px;
        line-height: 20px;
        cursor: pointer;
      }
      .priority-button {
        font-weight: 600;
      }
      .color-editor {
        position: relative;
      }
      .color-trigger {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: transparent;
        cursor: pointer;
      }
      .priority-editor {
        position: relative;
      }
      .priority-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        z-index: 200;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 80px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(28, 28, 32, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      }
      .priority-option {
        width: 100%;
        height: 28px;
        padding: 0 10px;
        border-radius: 6px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.78);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: background 0.15s;
        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        &.active {
          background: rgba(255, 255, 255, 0.12);
        }
      }
      .color-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        z-index: 200;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 80px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(28, 28, 32, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      }
      .color-option {
        width: 100%;
        height: 24px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        cursor: pointer;
      }
      .color-clear {
        width: 100%;
        height: 28px;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.78);
        font-size: 12px;
        border-radius: 6px;
        border: none;
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

.flip-list-move {
  transition: transform 0.4s ease;
}
.flip-list-enter-active,
.flip-list-leave-active {
  transition: all 0.3s ease;
}
.flip-list-enter,
.flip-list-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
.no-move {
  transition: transform 0s;
}
.ghost {
  opacity: 0.5;
}
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.95),
    rgba(239, 68, 68, 0.95)
  );
  color: #fff;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 99999;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  white-space: nowrap;
}
.toast-icon {
  font-size: 15px;
  flex-shrink: 0;
}
.toast-msg {
  font-weight: 500;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}
.toast-fade-enter,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
