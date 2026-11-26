# Desktop Settings CSS

面向桌面 WebView 设置页的纯 CSS 库。提供分组卡片、可换行的设置行、原生折叠组、开关、复选框、单选按钮、输入框、滑块和按钮。HTML 或任意前端框架都可以使用。

## 构建和预览

在仓库根目录运行 `npm run build`，然后用浏览器打开 `examples/settings.html`。构建脚本只用 Node.js 内置模块。它把 `src/palette.json` 中的浅色和深色值、排版规则和组件样式合成一个可离线分发的文件 `dist/settings.css`。

## 在应用中使用

将产物放入应用的静态资源目录，用 `<link>` 引入。在设置窗口的根元素上加 `ds-settings`。组件默认跟随系统配色，在同一个根元素上设置 `data-theme="light"` 或 `data-theme="dark"` 可固定主题。

```html
<link rel="stylesheet" href="./styles/settings.css">
<main class="ds-settings">
  <div class="section-card">
    <label class="setting-row">
      <span class="setting-info">显示通知</span>
      <input class="toggle-switch" type="checkbox" role="switch" checked>
    </label>
  </div>
</main>
```

开关使用原生 `checked`、`disabled` 和 `change`。表单值保存由宿主应用处理。可在根元素上覆盖 `--ds-accent`、`--ds-font-sans`、`--ds-radius-md` 等变量。宿主可将窗口背景设为 `var(--ds-bg-primary)`，也可以提供系统窗口材质。
