// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: "todo-list",
        productName: "todo-list",
        copyright: "Copyright © 2024 WangCai-1227",
        directories: {
          buildResources: "./public"
        },
        electronDownload: {
          mirror: "https://npmmirror.com/mirrors/electron/"
        },
        win: {
          icon: "./public/logo.ico",
          target: [
            {
              target: "nsis",
              arch: ["x64", "ia32"]
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          shortcutName: "todo-list"
        },
        dmg: {
          contents: [
            {
              x: 410,
              y: 150,
              type: "link",
              path: "/Applications"
            },
            {
              x: 130,
              y: 150,
              type: "file"
            }
          ]
        },
        mac: {
          icon: "./public/logo.icns",
          hardenedRuntime: true,
          gatekeeperAssess: false,
          entitlements: "./public/entitlements.mac.plist",
          entitlementsInherit: "./public/entitlements.mac.plist",
          target: {
            target: "default",
            arch: "universal"
          }
        }
        // publish: ["github"]
        // releaseInfo: {
        //   releaseName: "",
        //   releaseNotes: "",
        //   releaseDate: "",
        // },
      },
      nodeIntegration: true
    }
  },
  configureWebpack: {
    externals: {}
  }
};
