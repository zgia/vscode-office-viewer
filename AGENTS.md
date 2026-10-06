# AGENTS.md

给 AI 编码代理（Claude Code / Cursor / Codex / DSH 等）的项目开发指南。
动手前请先读完本文件；其中「硬性约束」一节不可协商。改动架构、命令或约束时，请同步更新本文件。

## 1. 项目是什么

VS Code 扩展 **Office Viewer**（包名 `vscode-office-viewer`，扩展 ID `zgia.vscode-office-viewer`）。
它只做一件事：**以严格只读的方式查看 Office 文档**。

支持的格式仅以下 9 种，不要擅自扩大范围：

| 类型 | 扩展名 |
| --- | --- |
| Excel | `.xls` `.xlsx` `.xlsm` `.csv` `.tsv` `.ods` |
| Word | `.docx` `.dotx` |
| PowerPoint | `.pptx` `.pptm` |

技术栈：TypeScript + React 19 + antd（webview）、esbuild（扩展宿主）、Vite（webview 打包）、
Node `>= 22`（见 `.nvmrc`，当前为 24）、VS Code `^1.64.0`。

## 2. 硬性约束

1. **严格只读**：任何“保存 / 另存为 / 导出 / 编辑”能力都不得重新引入。
   - 扩展宿主侧不要注册 `save` / `saveAs` / `change` / `editInVSCode` 事件（见 `src/provider/officeCommonHandler.ts`）。
   - Excel webview 固定 `mode: 'read'` + `showContextmenu: false`；工具栏只允许「查找 / 筛选 / 冻结窗格 / 自动列宽」。
   - Word webview 固定 `readOnly` + `mode="viewing"`。
   - `src/react/view/excel/x-spreadsheet/component/sheet.js` 里的 `copy()` 是**故意**在 read 模式下放开的
     （只读也要能复制单元格），不要当成越权修改修掉。
2. **不要删除 `package-lock.json`**，也不要把它加回 `.gitignore`。`xlsx` 是从 SheetJS 官方 CDN 装的 tarball，
   npm 必须依赖 lockfile 才能确定它的版本；缺了 lockfile，`npm audit` 会把已修复的版本误报成高危漏洞。
3. **不要把 `xlsx` 换回 npm 源**：npm 上的 `xlsx` 永久停留在 0.18.5，带两个无修复版本的原型污染 / ReDoS 公告。
   需要升级时从 CDN 取新版本：`npm i https://cdn.sheetjs.com/xlsx-<version>/xlsx-<version>.tgz`。
4. **保持 `viewType` = `cweijan.officeViewer`**；`activationEvents`（`onCustomEditor:cweijan.officeViewer`）
   与 `contributes.customEditors` 必须一致，否则用户已有的编辑器关联会失效。
5. **不要把临时办公文件留在仓库根目录**（`.xlsx` / `.csv` / `.docx` / `.pptx` …）——`vsce` 会把它们打进 VSIX。
   目前 `.vscodeignore` 只兜底了 `*.xlsx`，其它格式仍需自觉清理。
6. **不要为“只在开发工具链里”的审计项删依赖**。例如 `ovsx → @vscode/vsce@3 → secretlint → … → braces`
   是最上游还没有修复版本的 DoS 公告，且完全不进扩展产物。判断“是否影响发布产物”一律用
   `npm run audit`（= `npm audit --omit=dev`，应为 0）。

## 3. 目录结构

```
package.json            扩展清单：唯一 customEditor、引擎、脚本、依赖
index.html              webview 的 Vite 入口（会注入 {{configs}} 占位）
vite.config.mts         webview 构建 + 触发 build.mts
build.mts               esbuild 打包两个扩展宿主（桌面 / Web）
tsconfig.json           扩展宿主类型检查（allowImportingTsExtensions + noEmit）
src/react/tsconfig.json webview 类型检查（独立项目）
.nvmrc / .vscodeignore / eslint.config.mjs / changelog.md

src/extension.ts            桌面端入口 → out/extension.js（platform: node）
src/extension.web.ts        Web 端入口 → out/extension.web.js（platform: browser）
src/provider/
  officeViewerProvider.ts   唯一的 CustomReadonlyEditorProvider，按扩展名分发 route
  officeCommonHandler.ts    webview 事件绑定（加载文档、外链、赞助位、F12）
  handlers/officeContent.ts 读文件、组装 open payload（含 git: scheme 的二进制绕过）
src/common/
  handler.ts                webview ↔ 扩展的消息桥 + 文件监视
  reactApp.ts               读取 out/webview/index.html 并注入 {{configs}}
  extensionHost.ts          标记是否运行在 Web 扩展宿主
  extensionResource.ts      扩展内资源 URI 工具
  fileSuffix.ts / Output.ts / simpleEventEmitter.ts
src/shims/                  Web 宿主构建时的 node 内置模块替身（勿删）
src/react/
  main.tsx                  按 route 懒加载 excel / word / ppt
  util/                     vscode 消息封装、配置读取、主题检测
  view/excel/               Excel 查看器（含 vendored 的 x-spreadsheet/）
  view/word/  view/powerpoint/
  view/components/          赞助位组件（依赖 resource/sponsor）
resource/sponsor/           赞助位图片（webview 通过 sponsorBaseUrl 引用，勿删）
image/logo.png              扩展图标
test/                       历史遗留的 Excel 性能脚本，无测试框架
```

## 4. 常用命令

| 命令 | 用途 |
| --- | --- |
| `nvm use && npm ci` | 准备环境（Node 24，见 `.nvmrc`） |
| `npm run dev` | 桌面端：esbuild watch 构建 `extension.js` + Vite dev server(5739)，然后 F5 |
| `npm run dev:web` | Web 端：设 `OFFICE_EXTENSION_TARGET=web`，watch 构建 `extension.web.js` |
| `npm run build` | 生产构建：两个扩展宿主 + webview（`out/` 会先被清空） |
| `npm run package` | 生成 `.vsix`（自动先跑 `vscode:prepublish` → build） |
| `npm run publish` | 发布到 Marketplace 与 Open VSX（需要 PAT） |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run audit` | 只审计会随扩展发布的依赖，应为 0 |

## 5. 架构与数据流

### 两个扩展宿主

两个入口都只注册 `cweijan.officeViewer`（`OfficeViewerProvider`，`CustomReadonlyEditorProvider`，
`retainContextWhenHidden: true`）。Web 宿主构建时 `build.mts` 的 node-shim 插件会把 `path` / `child_process`
/ `fs` 等替换为 `src/shims/*`，因此 Web 端代码里出现 node 内置模块导入是正常的，**不要删 `src/shims`**。

### 打开文档的流程

1. 文件命中 `customEditors.selector` → `OfficeViewerProvider.resolveCustomEditor()`。
2. `Handler.bind()` 建立消息桥，`handleCommonEvent()` 注册事件。
3. `ReactApp.view()` 读取 `out/webview/index.html`，替换 `{{configs}}`
   （`{ route, sponsorBaseUrl, language }`）并修正 `<base href>`；webview 侧用 `getConfigs()` 读取。
4. webview 发 `init` → 扩展回发 `open`：
   - 真实文件：`{ ext, path: webview.asWebviewUri(uri), fileName, documentCacheId }`（webview 自行 fetch）
   - 虚拟文件（`vscode-vfs:` / `git:` / …）：额外带 `buffer: number[]`
   - 读取失败：带 `error`
5. 磁盘文件变化 → `Handler` 的文件监视器 → `fileChange` → 重新回发 `open`。
6. 其它事件：`openExternal`、`openSponsor` / `sponsorClick`、`developerTool`。

`route` 取值 `excel` / `word` / `ppt`，由 `resolveCustomEditor` 按 `getFileSuffix()` 决定。

### 构建流水线

`npm run build` 即 `vite build --mode=production`：

1. `vite.config.mts` 先 `rm -rf out/`；
2. 因为命令行带 `--mode`，它会 `import('./build.mts')`，由 esbuild 产出 `out/extension.js` 与
   `out/extension.web.js`；
3. Vite 再把 webview（`index.html` + `src/react/main.tsx`）打进 `out/webview/`。

开发模式下扩展通过 `ExtensionMode.Development` 判定，直接从 `http://127.0.0.1:5739/index.html` 拉 webview，
所以 F5 之前必须先跑 `npm run dev` / `npm run dev:web`。

配置文件是 `.mts`（ESM）：`vite.config.mts` 里的 `import('./build.mts')` 依赖 tsconfig 的
`allowImportingTsExtensions`。不要改回 `.ts`，否则会触发 Vite native config loader 警告并导致 tsc 报 TS5097。

### 各查看器要点

- **Excel**：`excel_reader.ts` 按扩展名分流读取 —— CSV/TSV 走 `udsv` + `csvEncoding.ts`（含 GBK 自动识别），
  `.xls` / `.ods` 走 SheetJS，其余走 `@cweijan/exceljs`；样式与元数据在 `excel_styles.ts` /
  `excel_meta.ts` / `excel_hyperlink.ts` / `excel_images.ts` / `excel_validation.ts` / `excel_protection.ts`
  （这些都只剩“读取”方向）。视图在 `Excel.tsx`，查找面板在 `FindPanel.tsx`，只读工具栏在
  `x-spreadsheet/component/toolbar/index.js`。
- **Word**：`Word.tsx` 用 `@eigenpal/docx-editor-react` 的 `DocxEditor`，只读参数直接写在 props 上。
- **PowerPoint**：`PowerPoint.tsx` 用 `pptxviewjs` 画到 canvas，另做缩略图、缩放与平移。

## 6. 已知坑

- `npx tsc -p src/react/tsconfig.json` 有 **19 个改动前就存在**的错误（ExcelJS 命名空间、`iconv-lite` 的
  Buffer 类型等）。它们不影响 Vite 构建，**不要当成回归**，也不要在无关改动里顺手修。
- webview 侧不能直接使用 node 内置模块；`build.mts` 的 shim 只作用于扩展宿主，webview 由
  `vite.config.mts` 的 alias（`stream` / `util`）与 `src/react/polyfills/buffer.ts` 兜底。
- `src/react/view/excel/x-spreadsheet/` 是从 x-spreadsheet 改造来的 vendored 代码，大量逻辑用
  `data.settings.mode === 'read'` 做守卫。改工具栏或交互前，先确认走的是只读分支，
  并且新代码不会绕过只读限制。
- Excel 的文案取 `excel_i18n.ts` 的 `t()` → vendored 语言包 `x-spreadsheet/locale/*.js`
  （`src/react/i18n` 已删除）。新增 key 要同时改 `en` / `zh-cn` / `zh-tw` / `de` / `nl`。
- `test/` 没有测试框架，只是历史脚本；`test/excelJs_performance_test.js` 依赖未安装的 `exceljs`
  （项目用的是 `@cweijan/exceljs`）跑不起来。核心逻辑改动只能靠手动验证。
- `.vscodeignore` 已排除 `src/`、`test/`、`.github/`、`.vscode/`、`.nvmrc`、`package-lock.json`、`**/*.mts`、
  `*.xlsx` 等。新增根目录文件后请确认它是否该被打包：`npx vsce ls --tree`。
- 若 npm 因 `~/.npm` 属主异常报 `EPERM … _cacache`，先 `sudo chown -R "$(id -u):$(id -g)" ~/.npm`，
  或临时加 `--cache /tmp/npm-cache`。

## 7. 改动流程建议

- 想加一种**新的只读格式**（先确认用户真的要）：① `package.json` 的 selector 加 `filenamePattern`；
  ② `officeViewerProvider.ts` 的 `switch` 加分支与 route；③ `src/react/main.tsx` 加懒加载与 `case`；
  ④ 若是二进制格式，把它加进 `officeContent.ts` 的 `BINARY_OFFICE_EXTENSIONS`
  （Windows + `git:` scheme 需要绕开 textconv）；⑤ 同步三个 README 与 changelog。
- 改用户可见行为 → 在 `changelog.md` 顶部新增 `# <version> <YYYY-M-D>`（英文、按 `Extension` /
  `Excel` / `Word` / `PowerPoint` / `Security` / `Development` 分类），并同步 `package.json` 的 `version`。
- 改使用说明 → 同步三个 README：`README.md`（简体中文，Marketplace 展示的是它）、`README-US.md`（英文）、
  `README-TW.md`（繁体中文）。

## 8. 提交前检查清单

- [ ] `npm run build` 通过（同时覆盖两个扩展宿主与 webview）
- [ ] `npx tsc --noEmit -p tsconfig.json` 0 错误
- [ ] `npx eslint "src/**/*.{ts,tsx}"` 0 错误
- [ ] 涉及依赖：`npm run audit` 为 0，且 `npm run package` 成功、VSIX 内无多余文件
- [ ] 改动影响界面/解析时：用 `npm run dev` + F5 手动打开 `.xlsx`、`.docx`、`.pptx` 各一次
      （另建议覆盖 `.xls`、`.csv`、`.ods`）
- [ ] 用户可见变更已写入 `changelog.md`，README 与 `package.json` 版本号已同步
