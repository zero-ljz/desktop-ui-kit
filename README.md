# Desktop Settings CSS

面向桌面 WebView 设置页的 CSS 库。侧栏、操作栏、分组卡片、设置行、管理列表和表单控件都可单独使用 CSS。自绘下拉框、消息框、工具提示、菜单和内联提示条可按需引入原生 JavaScript 模块。

## 构建和预览

在仓库根目录运行 `npm run build`，然后用浏览器打开 `examples/gallery.html`。构建脚本只用 Node.js 内置模块。它把 `src/palette.json` 中的浅色和深色值、排版规则和组件样式合成一个可离线分发的文件 `dist/settings.css`。

示例是一个可离线打开的交互式控件图库，分为「按钮与操作」「文本与数值」「选择控件」「标签页」「列表与折叠」「菜单与反馈」。使用侧栏或底部的「上一类」「下一类」浏览示例，顶部的「主题」菜单可切换浅色、深色或跟随系统。分类地址可直接打开，切换分类时会保留本次试用的控件状态。

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

要支持手动收起和窄窗覆盖式展开，在 `.sidebar` 中放置 `.sidebar-header`、可独立滚动的 `.sidebar-primary`，以及可选的底部区域 `.sidebar-secondary`。标题区使用原生 `<button type="button" class="sidebar-toggle">`，分类标题用 `.sidebar-group-label`。在导航项上使用原生链接或按钮，页面切换由应用处理。

```js
import { bindSidebar } from 'desktop-settings-css/sidebar';
import * as tooltips from 'desktop-settings-css/tooltip';

const navigation = bindSidebar(document.querySelector('.sidebar'), {
  narrowQuery: '(width < 900px)',
  tooltips
});
```

宽窗展开时内容区随侧栏移动。窄窗展开时侧栏覆盖内容区，点击导航项、点击外部、按 Esc 或将焦点移出侧栏都可收起。Esc 会将焦点送回展开按钮。宽度分别由 `--ds-sidebar-width`（默认 200px）和 `--ds-sidebar-compact-width`（默认 48px）控制，宽度过渡默认 250ms，并跟随系统的减少动态效果偏好。可用 `expandLabel` 和 `collapseLabel` 设置按钮名称。传入 `tooltips` 可显示图标提示；离线示例通过 `DesktopSettings.bindSidebar` 调用同一接口。程序切页时可调用 `navigation.closeOverlay()`，卸载侧栏时调用 `navigation.destroy()`。

给每个页面的内容面板加上 `class="ds-page"`。导航时隐藏旧面板、显示新面板（例如切换 `hidden` 属性），新页面就会在 250ms 内从下方 10px 淡入。系统启用“减少动态效果”时直接显示内容。

要让保存提示悬浮在内容区右下角，给同级页脚加上 `class="action-bar action-bar-floating"`。浮条最宽 520px，内容区空间不足时自动缩窄。窗口宽度降到 900px 及以下时，浮条靠右留出 28px。使用悬浮布局时，给滚动内容底部留出浮条的空间，方便操作最后一项设置。

## 桌面输入控件

图库的「文本与数值」提供密码、快捷键、标签、日期和时间输入，「选择控件」提供文件、目录和颜色选择器。日期和时间直接使用带 `.input-text` 的原生 `date`、`time` 输入框，通过 `min` 和 `max` 限定范围。

图库的「文本与数值 → 请求超时」演示带内联按钮的数值步进框，「选择控件 → 图库主题」演示通过底色和边框标记当前选项的分段选择器。

将原生数字框放在 `.number-stepper` 中。用户可以直接输入、点击微调箭头或使用上下方向键。`min`、`max` 和 `step` 控制范围及步长，可用 `valueAsNumber` 读取数值。单位写在字段标签或说明中。

```html
<label for="timeout">请求超时（秒）</label>
<span class="number-stepper">
  <input type="number" id="timeout" name="timeout" min="0.5" max="60" step="0.5"
         value="5">
</span>
```

从 `desktop-settings-css/inputs` 导入并调用 `bindNumberStepper(document.querySelector('#timeout'))` 后，宽度随内容调整。两个箭头前始终为清除键预留 32 px，输入框聚焦且有内容时显示清除键。点击清除键可继续在原处输入，按住箭头可连续步进。离线页面使用 `DesktopSettings.bindNumberStepper(...)`。直接通过脚本设置 `input.value` 后可调用返回对象的 `refresh()` 更新宽度和按钮状态。`destroy()` 恢复原生数字框。

在 `.segmented-control` 中用同名的原生单选框组成一组，每项用 `<label>` 包住输入框和文字。Tab 进入控件，方向键切换选项。宿主可监听 `change`，或通过表单读取选中的 `value`。

```html
<div class="segmented-control" role="radiogroup" aria-label="主题">
  <label><input type="radio" name="theme" value="system" checked><span>跟随系统</span></label>
  <label><input type="radio" name="theme" value="light"><span>浅色</span></label>
  <label><input type="radio" name="theme" value="dark"><span>深色</span></label>
</div>
```

需要脚本绑定的输入控件从 `desktop-settings-css/inputs` 导入。离线 HTML 加载 `dist/inputs.browser.js` 后，可通过 `DesktopSettings` 调用同名方法。

| 方法 | 用法 |
| --- | --- |
| `bindPathPicker(input, button, options)` | `kind` 可选 `file` 或 `directory`。浏览器预览显示所选名称，也可手动输入路径。桌面宿主可传入 `choose({ kind, value })` 返回完整路径，支持 Promise。返回 `null` 或取消选择时保留原值。打开失败可通过 `onError(error)` 处理。 |
| `bindShortcutInput(input, record, clear)` | 点击输入框或录入按钮开始，也可聚焦输入框后按 Enter。Esc 或移开焦点取消，清除按钮移除当前组合。宿主读取文本框中的值，自行注册快捷键。 |
| `bindPasswordInput(input, button)` | 将 `type="password"` 输入框与「显示密码」按钮绑定。切换显隐时保留输入值。 |
| `bindColorInput(hex, swatch)` | 将文本框与 `type="color"` 色块双向绑定。文本框接受 `#RRGGBB`，可用 `required pattern="#[0-9a-fA-F]{6}"` 启用原生校验。 |
| `createTagInput({ id, values, placeholder, onChange })` | 标签与输入光标在框内排成一行，可横向滚动查看已有标签。添加后自动滚动到输入位置。标签忽略首尾空白和大小写去重，通过 `getValues()` 或 `onChange(values)` 取得当前数组。用 `<label for="…">` 关联编辑框的 `id`。 |

以上绑定方法均返回带 `destroy()` 的对象。文件选择和快捷键录入在值变更时触发输入框的 `input` 和 `change` 事件。在支持目录选择 API 的浏览器中可以选择空目录，使用 `webkitdirectory` 回退时通过所选文件的相对路径取得目录名。

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

### 可编辑下拉框

在「选择控件」的可编辑下拉框中，点击箭头可查看全部颜色预设，输入“蓝”可筛出“天蓝”和“深蓝”。也可以直接填写自定义颜色名称。

```js
import { bindEditableSelect } from 'desktop-settings-css/select';

const input = document.querySelector('#color-input');
const picker = bindEditableSelect(input, {
  label: '颜色预设',
  options: ['天蓝', '深蓝', '草绿', '石墨灰']
});
```

将组件绑定到已有标签的单行文本框，`name`、`required`、`maxlength` 和表单提交均由原生输入框处理。`options` 是字符串数组。输入时按包含关系筛选，英文忽略大小写。上下方向键浏览候选，Enter 选中高亮项，Esc 或 Tab 收起并保留已输入的文字。选择不同的预设立即触发 `input`。离开文本框时，值有变化会触发 `change`。

`picker.setOptions([...])` 刷新候选并保留输入值，`picker.close()` 收起列表，`picker.destroy()` 解除绑定。离线 HTML 使用已有的 `dist/select.browser.js`，通过 `DesktopSettings.bindEditableSelect` 调用。

### WinUI 3 风格的可搜索多选框

在图库「选择控件」的「多项选择」中可以试用。展开后按名称搜索，英文忽略大小写。点击选项即可勾选或取消，面板会保持展开。也可用上下方向键移动高亮，按 Enter 切换选中状态，按 Esc 收起。再次展开时会显示全部选项并保留勾选。

```js
import { createMultiSelect } from 'desktop-settings-css/select';

const formats = createMultiSelect({
  placeholder: '选择文件格式',
  options: [
    { value: 'pdf', label: 'PDF' },
    { value: 'md', label: 'Markdown' },
    { value: 'txt', label: '纯文本' }
  ],
  values: ['pdf'],
  onChange: values => console.log(values)
});
document.querySelector('#formats-picker').append(formats);
```

每个选项使用唯一的 `value`。`getValues()` 按选项顺序返回选中值数组，`setValues(values)` 设置选中项，`setOptions(options)` 刷新选项并保留仍存在的选中值。也可用 `setOptions(options, values)` 同时更新两者。只有用户勾选或取消时才触发 `onChange`。通过 `id` 和 `labelledBy` 关联页面标签，通过 `close()` 收起面板。离线 HTML 加载 `dist/select.browser.js` 后可调用 `DesktopSettings.createMultiSelect`。

## Pivot 标签页

在图库的「标签页」中可试用「常规」「通知」「启动与退出」。切换时，选中线平滑移到新标题下方并随标题宽度伸缩，面板内容轻微淡入。开启系统“减少动态效果”时直接切换。点击标题或在面板空白处左右滑动可切换页面。键盘聚焦标题时，左右方向键切换页面，Home 和 End 跳到首尾可用标签，Tab 进入当前页的控件。切换页面时保留表单值。

```html
<div class="pivot" id="preferences">
  <div role="tablist" aria-label="偏好设置">
    <button type="button" role="tab" id="general-tab" aria-controls="general" aria-selected="true">常规</button>
    <button type="button" role="tab" id="alerts-tab" aria-controls="alerts" tabindex="-1">通知</button>
  </div>
  <div role="tabpanel" id="general" aria-labelledby="general-tab">
    <label>配置名称 <input class="input-text" value="个人配置"></label>
  </div>
  <div role="tabpanel" id="alerts" aria-labelledby="alerts-tab" hidden>
    <label><input type="checkbox" class="toggle-switch" role="switch"> 显示通知</label>
  </div>
</div>
```

```js
import { bindPivot } from 'desktop-settings-css/pivot';
const pivot = bindPivot(document.querySelector('#preferences'));
pivot.setValue('alerts');
```

在 `.ds-settings` 内放置组件。每个标签和面板各有唯一 ID，`aria-controls` 指向对应面板。纯文字面板可加 `tabindex="0"` 以便键盘聚焦。`getValue()` 返回当前面板 ID，`onChange(id)` 响应用户切换，`destroy()` 解除绑定。离线 HTML 加载 `dist/pivot.browser.js` 后可调用 `DesktopSettings.bindPivot(...)`。

## WinUI 3 风格菜单

图库顶部的「分类」菜单可跳转到各组示例。在「菜单与反馈」右键单击上下文菜单示例行，或点击「打开菜单」，可从菜单调出提示框或确认框。键盘用户可在该按钮上按 Shift+F10 或菜单键打开上下文菜单。方向键移动焦点，Enter 或空格执行命令，Esc 关闭菜单并返回触发位置。

菜单栏和上下文菜单共用菜单项格式。传入 `items` 数组，或传入每次展开时返回数组的函数。用 `disabled` 控制命令可用性，用布尔值 `checked` 显示勾选状态，点击时由 `onSelect` 更新应用数据。

```js
import { createMenuBar, bindContextMenu } from 'desktop-settings-css/menu';

const items = [
  { label: '按钮与操作', onSelect: () => { location.hash = 'buttons'; } },
  { label: '菜单与反馈', onSelect: () => { location.hash = 'feedback'; } }
];
const bar = createMenuBar({ menus: [{ label: '分类', items }] });
document.querySelector('#gallery-menu').replaceWith(bar);

const context = bindContextMenu(document.querySelector('#menu-sample'), {
  label: '切换分类', trigger: document.querySelector('#open-menu'), items
});
```

把菜单栏和触发元素放在 `.ds-settings` 内以继承主题。`trigger` 可选，传入按钮即可用单击打开同一菜单。省略时，目标元素本身可通过键盘打开菜单。用 `bar.close()` 或 `context.close()` 主动收起，用 `context.destroy()` 解除绑定。离线 HTML 加载 `dist/menu.browser.js` 后可通过 `DesktopSettings` 调用这两个组件。

## 消息框

加载 `desktop-settings-css/settings.css` 后，按需从 `desktop-settings-css/dialog` 导入消息框。组件使用原生 `<dialog>`，从当前焦点所在的 `.ds-settings` 继承主题。多个设置根节点共存时，可通过 `showModal({ root, type, title, message, okLabel, cancelLabel })` 指定挂载点和按钮文字。

```js
import { showAlert, showConfirm, showPrompt } from 'desktop-settings-css/dialog';

await showAlert('更改已保存。');
const confirmed = await showConfirm('恢复默认设置？');
const name = await showPrompt('输入书架名称。', '我的书架', '重命名');
```

`showAlert` 关闭后返回 `true`。`showConfirm` 返回确认结果。`showPrompt` 确认后返回输入字符串（包括空字符串），取消或按 Esc 时返回 `null`。这些结果均通过 Promise 返回，调用方用 `await` 取得结果后执行业务操作。

离线 HTML 可加载 `dist/dialog.browser.js`，通过 `DesktopSettings.showConfirm(...)` 等同名接口调用。在图库的「菜单与反馈」中可试用三种消息框并查看返回结果。

## 工具提示

从 `desktop-settings-css/tooltip` 导入 `setTooltip` 和 `clearTooltip`。例如 `setTooltip(button, '展开导航', { placement: 'right' })`。文字也可以是回调函数。键盘聚焦和鼠标悬停都能显示提示，按 Esc 可收起。用 `clearTooltip(button)` 解除绑定。离线 HTML 加载 `dist/tooltip.browser.js` 后可调用 `DesktopSettings.setTooltip`。缩窄示例窗口后，在侧栏导航项上试用。

## WinUI 3 风格的内联提示条（InfoBar）

在图库的「菜单与反馈」中切换提示类型，可比较信息、成功、警告和错误四种提示条。关闭提示条后，点击「显示提示」可再次预览。

```js
import { createInfoBar } from 'desktop-settings-css/info-bar';

const bar = createInfoBar({
  severity: 'info',
  title: '查找控件',
  message: '可以按名称或 CSS 类名筛选。',
  action: { label: '搜索控件', onClick: () => document.querySelector('#list-search').focus() },
  closable: true
});
document.querySelector('#lists').append(bar);
```

`severity` 可取 `info`（默认）、`success`、`warning` 或 `error`。标题、操作按钮和关闭按钮均可省略。用 `bar.setMessage(text)` 更新正文，用 `bar.hidden` 控制显隐。设置 `closable: true` 后，点击关闭按钮会隐藏提示条，并调用可选的 `onClose`，宿主可在这里恢复焦点。离线 HTML 加载 `dist/info-bar.browser.js` 后，通过 `DesktopSettings.createInfoBar(...)` 创建组件并挂载到 `.ds-settings` 内。

## 表单错误与管理列表

字段校验失败时设置 `aria-invalid="true"`，显示带有 `field-error` 类的文字，并把它的 ID 加入输入控件的 `aria-describedby`。校验通过后隐藏错误文字，并从描述中移除它的 ID，保留日常填写提示。

列表使用 `.manage-list`，每个 `.manage-row` 中的 `.manage-main` 可以包含 `.manage-title` 和 `.manage-subtitle`，行末可以放操作按钮。用 `.manage-empty` 显示无数据或无匹配时的说明。搜索、筛选及批量操作由页面组合已有控件并安排布局。图库的「列表与折叠」展示了按控件名称或类名搜索、无匹配结果的空状态，以及跳转到控件分类的行末操作。
