# Office Viewer

## 重要

本项目 fork [Office Viewer](https://github.com/cweijan/vscode-office.git) 项目，只保留了Office文档的只读查看，移除了Office文件的编辑功能以及其他格式文件的查看。

## 介绍

本扩展用于在 VS Code 中查看 Office 文档，为以下文件类型注册只读自定义编辑器：

- Excel: `.xls`、`.xlsx`、`.xlsm`、`.csv`、`.tsv`、`.ods`
- Word: `.docx`、`.dotx`
- PowerPoint: `.pptx`、`.pptm`

## 使用方式

直接打开受支持的文件即可，VS Code 默认使用 Office Viewer 打开。

查看器**严格只读**：不能在扩展内编辑或保存文档。需要编辑时请使用对应的办公软件（Microsoft Office、WPS、LibreOffice 等）；`.csv`、`.tsv` 等文本格式可选择 **打开方式... → 文本编辑器** 查看原始内容。

查看器提供的阅读辅助功能：查找、复制、筛选、冻结窗格、切换工作表、超链接跳转、明暗主题切换，以及自动调整列宽（Excel）。

## Sponsor

[![Database Client](https://doc.database-client.com/public/logo.png)](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)

适用于 Visual Studio Code 的数据库客户端，支持 **MySQL/MariaDB、PostgreSQL、SQLite、Redis** 以及 **ElasticSearch** 等数据库的管理，且可作为一个 SSH 客户端，极大地提升您的生产力！[立刻安装](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)。

## 开发指南

### 环境要求

- [Node.js](https://nodejs.org/) 22+ (see `.nvmrc`; run `nvm use` before `npm ci`)
- [VS Code](https://code.visualstudio.com/) 1.64+

### 快速开始

```bash
git clone https://github.com/zgia/vscode-office-viewer.git
cd vscode-office-viewer
npm install
```

### 开发调试

**桌面端扩展**：

```bash
npm run dev
```

在 VS Code 中按 `F5`，或在「运行和调试」中选择 **Extension**。

**Web 端扩展**（在 [vscode.dev](https://vscode.dev) 中查看）：

```bash
npm run dev:web
```

在「运行和调试」中选择 **Extension (Web)**。

### 构建与打包

```bash
npm ci           # 安装依赖（package-lock.json 已纳入版本管理）
npm run build    # 生产构建
npm run package  # 生成 .vsix
```

`.xls` / `.ods` 的解析使用 SheetJS，从官方 CDN `https://cdn.sheetjs.com/xlsx-0.20.3/` 安装
——npm 上的 `xlsx` 包停留在 0.18.5，存在两个没有 npm 修复版本的安全公告
（GHSA-4r6h-8v6p-xvw6、GHSA-5pgg-2g8v-p4x9）。`package-lock.json` 用于固定该版本，保证安装可复现。

## Credits

- DOCX rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- PPTX rendering: [pptxviewjs](https://www.npmjs.com/package/pptxviewjs)
- XLSX rendering:
  - [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  - [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
