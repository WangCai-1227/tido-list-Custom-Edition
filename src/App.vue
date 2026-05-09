<template>
  <div id="app" :class="{ unfocused: ignoreMouse }">
    <div class="mask"></div>
    <div class="drag-nav">
      <b>{{ appName }}</b>
      <i>旺财定制版</i>
    </div>
    <div class="nav">
        <div class="link">
          <router-link draggable="false" to="/">Todo</router-link> |
          <router-link draggable="false" to="/done">Done</router-link>
          <span class="toggle-all-btn" :title="allExpanded ? '折叠全部' : '展开全部'" @click="toggleAll">{{ allExpanded ? '▶' : '▼' }}</span>
        </div>
      <div class="tools">
        <transition-group name="fade" mode="out-in">
          <i
            class="iconfont icon-browse"
            key="settings"
            @click="showSettings = true"
          ></i>
          <i class="iconfont icon-export" key="export" @click="exportData"></i>
          <i class="iconfont icon-eye-close" key="hide" @click="hideWindow"></i>

          <i
            :class="['iconfont', ignoreMouse ? 'icon-lock' : 'icon-unlock']"
            key="lock"
            @mouseenter="setIgnoreMouseEvents(false)"
            @mouseleave="setIgnoreMouseEvents(ignoreMouse)"
            @click="toggleLock"
          ></i>
        </transition-group>
      </div>
    </div>
    <div class="main scrollbar scrollbar-y">
      <transition name="fade-transform" mode="out-in">
        <!-- <keep-alive> -->
        <router-view />
        <!-- </keep-alive> -->
      </transition>
    </div>
    <div
      v-show="showSettings"
      :class="['settings-modal', showSettings ? 'open' : '']"
      @click="showSettings = false"
    >
      <div class="settings-content" @click.stop>
        <div class="settings-header">
          <div class="header-left">
            <div class="logo-dot"></div>
            <span class="header-title">设置</span>
          </div>
          <div class="header-close" @click="showSettings = false">
            <i class="iconfont icon-close"></i>
          </div>
        </div>
        <div class="settings-body">
          <div class="settings-section">
            <div class="section-header">
              <div class="section-icon">◉</div>
              <span>显示</span>
            </div>
            <div class="section-card">
              <div class="setting-row toggle-row">
                <span class="toggle-label">显示编号</span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="settings.numberVisible"
                    @change="schedulePersistSettings"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <div class="section-icon">✦</div>
              <span>格式</span>
            </div>
            <div class="section-card">
              <div class="format-container">
                <div
                  v-for="(group, groupName) in groupedFormats"
                  :key="groupName"
                  class="format-group"
                >
                  <div class="group-name">{{ groupName }}</div>
                  <div class="format-items">
                    <div
                      v-for="format in group"
                      :key="format.id"
                      :class="[
                        'format-item',
                        { active: currentFormat === format.id }
                      ]"
                      @click="selectFormat(format.id)"
                    >
                      <div class="format-number">{{ format.pattern(1) }}</div>
                      <div class="format-text">{{ format.label }}</div>
                      <div
                        v-if="currentFormat === format.id"
                        class="format-status"
                      >
                        <i class="iconfont icon-select"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <div class="section-icon">⊞</div>
              <span>间距</span>
            </div>
            <div class="section-card">
              <div class="setting-row">
                <span class="slider-label">编号间距</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  v-model.number="settings.numberSpacing"
                  @input="schedulePersistSettings"
                  class="spacing-range"
                />
                <span class="spacing-value">{{ settings.numberSpacing }}px</span>
              </div>
              <div class="preview-text">
                <span
                  class="number-preview"
                  :style="{ marginRight: settings.numberSpacing + 'px' }"
                  v-text="'1.'"
                ></span>
                <span>预览文字</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <div class="section-icon">⊟</div>
              <span>子项目</span>
            </div>
            <div class="section-card">
              <div class="setting-row toggle-row">
                <span class="toggle-label">显示子项目编号</span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="settings.childNumberVisible"
                    @change="schedulePersistSettings"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="level-cards">
              <div class="level-card" v-for="(label, idx) in levelLabels" :key="idx">
                <div class="level-card-header">
                  <div class="level-badge">{{ label }}</div>
                </div>
                <div class="level-card-body">
                  <div class="setting-row compact">
                    <span class="slider-label">字号</span>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      step="1"
                      v-model.number="settings.levelConfigs.fontSizes[idx]"
                      @input="schedulePersistSettings"
                      class="spacing-range"
                    />
                    <span class="spacing-value">{{ settings.levelConfigs.fontSizes[idx] }}px</span>
                  </div>
                  <div class="setting-row compact">
                    <span class="slider-label">编号间距</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      v-model.number="settings.levelConfigs.numberSpacings[idx]"
                      @input="schedulePersistSettings"
                      class="spacing-range"
                    />
                    <span class="spacing-value">{{ settings.levelConfigs.numberSpacings[idx] }}px</span>
                  </div>
                  <div class="setting-row compact">
                    <span class="slider-label">缩进</span>
                    <input
                      type="range"
                      min="4"
                      max="36"
                      step="1"
                      v-model.number="settings.levelConfigs.indents[idx]"
                      @input="schedulePersistSettings"
                      class="spacing-range"
                    />
                    <span class="spacing-value">{{ settings.levelConfigs.indents[idx] }}px</span>
                  </div>
                  <div class="compact-format-row">
                    <span class="slider-label">编号</span>
                    <div class="compact-format-picker">
                      <button
                        v-for="fmt in allFormats"
                        :key="fmt.id"
                        :class="['cf-btn', { active: settings.levelConfigs.formats[idx] === fmt.id }]"
                        @click="settings.levelConfigs.formats[idx] = fmt.id; schedulePersistSettings()"
                      >
                        <span class="cf-num">{{ fmt.pattern(1) }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="section-header">
              <div class="section-icon">―</div>
              <span>完成划线</span>
            </div>
            <div class="section-card">
              <div class="setting-row">
                <span class="slider-label">线宽</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  v-model.number="settings.strikeWidth"
                  @input="schedulePersistSettings"
                  class="spacing-range"
                />
                <span class="spacing-value">{{ settings.strikeWidth }}px</span>
              </div>
              <div class="setting-row">
                <span class="slider-label">颜色预设</span>
                <div class="strike-color-group">
                  <button
                    v-for="sc in strikeColorOptions"
                    :key="sc.value"
                    class="strike-color-btn"
                    :class="{ active: settings.strikeColor === sc.value }"
                    :style="{ background: sc.color || 'transparent', borderColor: sc.color || 'rgba(255,255,255,0.2)' }"
                    @click="settings.strikeColor = sc.value; schedulePersistSettings()"
                    :title="sc.label"
                  >{{ sc.value === '' ? '自动' : '' }}</button>
                </div>
              </div>
              <div class="strike-preview" :style="{ '--strike-color': settings.strikeColor || '#999', '--strike-width': settings.strikeWidth + 'px' }">
                <span class="number-preview">1.1</span>
                <span>完成示例</span>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <span class="footer-text">旺财定制版</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import pkg from "../package.json";

import { ipcRenderer } from "electron";
import { numberFormats } from "@/utils/numberFormat";
import DB from "@/utils/db";
import EventBus from "@/utils/eventBus";

export default {
  data() {
    return {
      appName: pkg.name,
      ignoreMouse: false,
      showSettings: false,
      numberFormats: numberFormats,
      currentFormat: "arabic",
      settings: {
        numberSpacing: 6,
        numberVisible: true,
        childNumberSpacing: 4,
        childNumberVisible: true,
        childFontSize: 16,
        childIndent: 18,
        strikeWidth: 1,
        strikeColor: "",
        levelConfigs: {
          fontSizes: [16, 14, 13, 12, 12],
          numberSpacings: [6, 4, 4, 4, 4],
          indents: [18, 16, 14, 14, 14],
          formats: ["arabic", "letter_lower", "symbol_dot", "symbol_dot", "symbol_dot"]
        }
      },
      settingsSaveTimer: null,
      allExpanded: false
    };
  },
  computed: {
    groupedFormats() {
      return this.numberFormats;
    },
    levelLabels() {
      return ["一级", "二级", "三级", "四级", "五级"];
    },
    allFormats() {
      const result = [];
      for (const group of Object.values(this.numberFormats)) {
        for (const fmt of group) {
          result.push(fmt);
        }
      }
      return result;
    },
    strikeColorOptions() {
      return [
        { value: "", label: "自动", color: "" },
        { value: "#ef4444", label: "红色", color: "#ef4444" },
        { value: "#f59e0b", label: "橙色", color: "#f59e0b" },
        { value: "#fbbf24", label: "黄色", color: "#fbbf24" },
        { value: "#22c55e", label: "绿色", color: "#22c55e" },
        { value: "#14b8a6", label: "青色", color: "#14b8a6" },
        { value: "#3b82f6", label: "蓝色", color: "#3b82f6" },
        { value: "#8b5cf6", label: "紫色", color: "#8b5cf6" },
        { value: "#999999", label: "灰色", color: "#999999" }
      ];
    }
  },
  watch: {
    showSettings(open) {
      if (open) {
        this.syncSettingsFromDb();
      } else {
        this.flushPersistSettings();
      }
    }
  },
  mounted() {
    ipcRenderer.invoke("getDataPath").then(storePath => {
      DB.initDB(storePath);
      const format = DB.get("numberFormat");
      if (format) {
        this.currentFormat = format;
      }
      this.syncSettingsFromDb();
    });
  },
  methods: {
    syncSettingsFromDb() {
      const raw = DB.get("settings");
      const s = raw && typeof raw === "object" ? Object.assign({}, raw) : {};
      this.settings = Object.assign(
        {
          numberSpacing: 6,
          numberVisible: true,
          childNumberSpacing: 4,
          childNumberVisible: true,
          childFontSize: 16,
          childIndent: 18,
          strikeWidth: 1,
          strikeColor: "",
          levelConfigs: {
            fontSizes: [16, 14, 13, 12, 12],
            numberSpacings: [6, 4, 4, 4, 4],
            indents: [18, 16, 14, 14, 14],
            formats: ["arabic", "letter_lower", "symbol_dot", "symbol_dot", "symbol_dot"]
          }
        },
        s
      );
      if (typeof this.settings.numberSpacing !== "number") {
        this.settings.numberSpacing = 6;
      }
      if (typeof this.settings.numberVisible !== "boolean") {
        this.settings.numberVisible = true;
      }
      if (typeof this.settings.childNumberSpacing !== "number") {
        this.settings.childNumberSpacing = 4;
      }
      if (typeof this.settings.childNumberVisible !== "boolean") {
        this.settings.childNumberVisible = true;
      }
      if (typeof this.settings.childFontSize !== "number") {
        this.settings.childFontSize = 16;
      }
      if (typeof this.settings.childIndent !== "number") {
        this.settings.childIndent = 18;
      }
      if (typeof this.settings.strikeWidth !== "number") {
        this.settings.strikeWidth = 1;
      }
      if (typeof this.settings.strikeColor !== "string") {
        this.settings.strikeColor = "";
      }
      if (!this.settings.levelConfigs || typeof this.settings.levelConfigs !== "object") {
        this.settings.levelConfigs = {
          fontSizes: [16, 14, 13, 12, 12],
          numberSpacings: [6, 4, 4, 4, 4],
          indents: [18, 16, 14, 14, 14],
          formats: ["arabic", "letter_lower", "symbol_dot", "symbol_dot", "symbol_dot"]
        };
      }
      if (!this.settings.levelConfigs.formats || !Array.isArray(this.settings.levelConfigs.formats)) {
        this.settings.levelConfigs.formats = ["arabic", "letter_lower", "symbol_dot", "symbol_dot", "symbol_dot"];
      }
    },
    persistSettingsNow() {
      const prev = DB.get("settings");
      const base = prev && typeof prev === "object" ? prev : {};
      DB.set(
        "settings",
        Object.assign({}, base, {
          numberSpacing: this.settings.numberSpacing,
          numberVisible: this.settings.numberVisible,
          childNumberSpacing: this.settings.childNumberSpacing,
          childNumberVisible: this.settings.childNumberVisible,
          childFontSize: this.settings.childFontSize,
          childIndent: this.settings.childIndent,
          strikeWidth: this.settings.strikeWidth,
          strikeColor: this.settings.strikeColor,
          levelConfigs: this.settings.levelConfigs
        })
      );
    },
    schedulePersistSettings() {
      if (this.settingsSaveTimer) {
        clearTimeout(this.settingsSaveTimer);
      }
      this.settingsSaveTimer = setTimeout(() => {
        this.settingsSaveTimer = null;
        this.persistSettingsNow();
      }, 500);
    },
    flushPersistSettings() {
      if (this.settingsSaveTimer) {
        clearTimeout(this.settingsSaveTimer);
        this.settingsSaveTimer = null;
        this.persistSettingsNow();
      }
    },
    setIgnoreMouseEvents(ignore) {
      ipcRenderer.invoke("setIgnoreMouseEvents", ignore);
    },
    exportData() {
      ipcRenderer.invoke("exportData");
    },
    hideWindow() {
      ipcRenderer.invoke("hideWindow");
    },
    toggleLock() {
      this.ignoreMouse = !this.ignoreMouse;
      this.setIgnoreMouseEvents(this.ignoreMouse);
      ipcRenderer.invoke("setAlwaysOnTop", this.ignoreMouse);
    },
    toggleAll() {
      this.allExpanded = !this.allExpanded;
      EventBus.$emit("toggle-all", this.allExpanded);
    },
    selectFormat(formatId) {
      this.currentFormat = formatId;
      DB.set("numberFormat", formatId);
      this.$emit("format-change", formatId);
    }
  },
  provide() {
    return {
      getNumberFormat: () => this.currentFormat,
      getNumberSpacing: () => this.settings.numberSpacing,
      getNumberVisible: () => this.settings.numberVisible,
      getChildNumberSpacing: () => this.settings.childNumberSpacing,
      getChildNumberVisible: () => this.settings.childNumberVisible,
      getChildFontSize: () => this.settings.childFontSize,
      getChildIndent: () => this.settings.childIndent,
      getLevelConfigs: () => this.settings.levelConfigs,
      getStrikeWidth: () => this.settings.strikeWidth,
      getStrikeColor: () => this.settings.strikeColor
    };
  },
  beforeDestroy() {
    this.flushPersistSettings();
  }
};
</script>

<style lang="scss" scoped>
#app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: rgba($color: #000000, $alpha: 0.65);
  border-radius: 5px;
  .mask {
    display: none;
    position: absolute;
    z-index: 999;
    width: 100%;
    height: 100%;
  }
  .drag-nav {
    -webkit-app-region: drag;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 20px;
    padding: 0 20px;
    box-sizing: border-box;
    font-size: 12px;
    b,
    i {
      color: rgba($color: #ffffff, $alpha: 0.3);
    }
  }
  .nav {
    display: flex;
    justify-content: space-between;
    height: 26px;
    padding: 0 20px;
    color: #cccccc;
    user-select: none;
    .link {
      a {
        font-weight: bold;
        color: #cccccc;
        text-decoration: none;
        &.router-link-exact-active {
          font-size: 20px;
          color: #ffffff;
        }
        &:hover {
          color: rgba($color: #ffffff, $alpha: 0.6);
        }
      }
      .toggle-all-btn {
        margin-left: 8px;
        font-size: 11px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.35);
        user-select: none;
        transition: color 0.15s;
        &:hover {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }
    .tools {
      display: flex;
      i {
        font-size: 20px;
        line-height: 26px;
        padding: 0 5px;
        cursor: pointer;
      }
    }
  }
  .main {
    flex: 1;
    margin: 10px 0;
    overflow-y: auto;
    &:hover::-webkit-scrollbar-thumb {
      display: block;
    }
  }
}
#app.unfocused {
  opacity: 0.8;
  .mask {
    display: block;
  }
  .tools {
    z-index: 1000;
  }
}
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.settings-content {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 32px);
  background: linear-gradient(
    145deg,
    rgba(30, 30, 35, 0.98),
    rgba(20, 20, 25, 0.98)
  );
  border-radius: 16px;
  width: 88%;
  max-width: 340px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  overflow: hidden;
  transform: translateY(20px) scale(0.95);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.settings-modal.open {
  opacity: 1;
  visibility: visible;
}
.settings-modal.open .settings-content {
  transform: translateY(0) scale(1);
}
.settings-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    transparent 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-dot {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}
.header-title {
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.2px;
}
.header-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    i {
      color: rgba(255, 255, 255, 0.9);
    }
  }
  i {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.2s ease;
  }
}
.settings-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 4px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
}
.settings-section {
  padding: 0 16px;
  margin-bottom: 6px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 4px 8px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.section-icon {
  font-size: 10px;
  opacity: 0.5;
}
.section-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.25s ease;
}
.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 8px 0;
}
.format-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.format-group {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.25s ease;
}
.group-name {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  padding-left: 4px;
}
.format-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.format-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border: 1.5px solid transparent;
  background: rgba(255, 255, 255, 0.02);
  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }
  &.active {
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.12),
      rgba(251, 191, 36, 0.05)
    );
    border-color: rgba(251, 191, 36, 0.3);
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.06);
  }
}
.format-number {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.format-text {
  flex: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 500;
  min-width: 0;
}
.format-status {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  i {
    font-size: 13px;
    color: #fbbf24;
  }
}
.settings-footer {
  flex-shrink: 0;
  padding: 16px 22px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
}
.footer-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.5px;
  font-weight: 500;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.slider-label {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  min-width: 64px;
}
.spacing-range {
  flex: 1;
  min-width: 0;
  height: 4px;
  border-radius: 2px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    transition: transform 0.15s ease;
    &:hover {
      transform: scale(1.15);
    }
  }
}
.spacing-value {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  min-width: 34px;
  text-align: right;
  font-feature-settings: "tnum";
}
.preview-text {
  display: flex;
  align-items: baseline;
  padding: 4px 0 6px 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
.number-preview {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.child-number-preview {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
}

.toggle-row {
  justify-content: space-between;
}
.compact-format-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  margin-top: 4px;
  padding-top: 6px;
}
.compact-format-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  flex: 1;
}
.cf-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }
  &.active {
    background: rgba(251, 191, 36, 0.15);
    border-color: #fbbf24;
  }
}
.cf-num {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
}
.cf-btn.active .cf-num {
  color: #fbbf24;
}
.strike-color-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}
.strike-color-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    transform: scale(1.2);
  }
  &.active {
    border-color: #fbbf24;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
  }
}
.strike-preview {
  display: flex;
  align-items: baseline;
  gap: 6px;
  position: relative;
  padding: 8px 0 4px 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}
.strike-preview::before {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  top: 50%;
  transform: translateY(calc(-50% + 4px));
  height: var(--strike-width, 1px);
  background: var(--strike-color, #999);
  pointer-events: none;
  z-index: 1;
}
.strike-preview .number-preview {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}
.strike-preview span {
  position: relative;
  z-index: 2;
}
.level-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.level-card {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.level-card-header {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.level-badge {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.5px;
}
.level-card-body {
  padding: 4px 12px;
}
.setting-row.compact {
  padding: 3px 0;
}
.setting-row.compact .slider-label {
  min-width: 52px;
  font-size: 12px;
}
.setting-row.compact .spacing-range {
  height: 3px;
}
.setting-row.compact .spacing-range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
}
.toggle-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    transition: 0.25s;
    &::before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }
  }
  input:checked + .slider {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    &::before {
      transform: translateX(18px);
    }
  }
}

</style>
