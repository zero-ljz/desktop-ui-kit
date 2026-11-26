# Desktop Settings CSS

面向桌面 WebView 设置页的 CSS 库。提供侧栏、操作栏、分组卡片、设置行和表单控件。基础样式可以单独使用，自绘下拉框提供可按需引入的原生 JavaScript 模块。

## 构建和预览

在仓库根目录运行 `npm run build`，然后用浏览器打开 `examples/settings.html`。构建脚本只用 Node.js 内置模块。它把 `src/palette.json` 中的浅色和深色值、排版规则和组件样式合成一个可离线分发的文件 `dist/settings.css`。

示例是一个可直接双击打开的阅读应用设置页。在「阅读外观」切换主题、字体和字号可实时预览。「资料库」展示文本框、数字步进器、校验和恢复默认值。「提醒」展示普通和紧凑折叠组、半选复选框、全选和联动禁用。可跨页修改后一起保存或撤销。保存只在本次打开期间有效。

## 在应用中使用

运行 `npm pack` 会自动构建并生成包含 CSS 和示例的本地安装包。通过该包接入的项目可以导入 `desktop-settings-css/settings.css`。

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

折叠组使用 `<details class="settings-expander">`。在它的 `<summary>` 中放入空的 `<span class="settings-expander-chevron" aria-hidden="true"></span>` 即可显示 16 × 16 的箭头，方向随原生 `open` 状态切换。

需要双栏窗口时，在 `.ds-settings` 中放置 `.app-container`，其直接子元素 `.sidebar` 和 `.content` 对应导航和内容。可通过 `--ds-sidebar-width` 调整侧栏宽度，窄面板中侧栏最多占 40%。用 `aria-current="page"` 标记当前导航项。同级的 `.action-bar` 占据底部一整行，用 `hidden` 控制显隐。保存、导航和弹层的行为由应用处理。

当侧栏内容区宽度为 56px 或更窄时，带图标的当前导航项会将图标居中，并在视觉上隐藏文字。将 `.sidebar-icon` 和 `.sidebar-label` 依次放在导航项中，辅助技术仍可读取名称。应用可自行决定收起侧栏的窗口宽度。

要让保存提示悬浮在内容区右下角，给同级页脚加上 `class="action-bar action-bar-floating"`。宽窗口下浮条最大宽度为 520px。窗口宽度降到 900px 及以下时，浮条在内容区两侧各留 28px。使用悬浮布局时，给滚动内容底部留出浮条的空间，方便操作最后一项设置。

## 自绘下拉框

在 `.ds-settings` 内准备可见标签和挂载点，例如 `<label for="font-trigger">字体</label><div id="font-control"></div>`。使用构建工具时，导入组件并传入选项和当前值。

```js
import 'desktop-settings-css/settings.css';
import { createSelect } from 'desktop-settings-css/select';

const font = createSelect({
  id: 'font-trigger',
  options: [
    { value: 'serif', label: '衬线字体' },
    { value: 'sans', label: '系统字体' }
  ],
  value: 'serif',
  onChange: value => console.log(value)
});
document.querySelector('#font-control').append(font);
```

`getValue()` 读取选中值，`getSelectedOption()` 返回对应选项。`setValue(value)` 和 `setOptions(options, value)` 用于回显或刷新选项，只有用户确认选择时才触发 `onChange`。可通过异步 `onOpen` 在展开前刷新数据，通过 `close()` 在切页时收起菜单。

直接打开本地 HTML 时，可先加载 `dist/settings.css` 和普通脚本 `dist/select.browser.js`，再调用 `DesktopSettings.createSelect(...)`。两种 JS 入口由同一份 `src/select.js` 生成。
