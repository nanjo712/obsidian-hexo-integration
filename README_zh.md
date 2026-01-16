[English](README.md) | [中文]

# Obsidian Hexo 集成插件

一个功能强大的 Obsidian 插件，旨在简化将笔记直接发布到 Hexo 博客的流程。在 Obsidian 中轻松管理您的博客文章，享受自动元数据处理、图像资源同步和同步状态追踪。

---

## 🛠️ 安装说明

### 1. 官方社区插件 (推荐)
- 打开 Obsidian 设置 > **社区插件 (Community Plugins)** > **浏览 (Browse)**。
- 搜索 `Hexo Integration`。
- 点击 **安装** 并 **启用**。
> [!NOTE]
> 插件目前正在官方审核中，暂时搜索不到，请使用以下方式。

### 2. 通过 BRAT 安装 (测试版)
- 安装 [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件。
- 在 BRAT 中点击 `Add Beta plugin`。
- 输入本仓库地址: `nanjo712/obsidian-hexo-integration`。

### 3. 手动安装
- 下载最新 [Release](https://github.com/nanjo712/obsidian-hexo-integration/releases) 的 `main.js`, `manifest.json`, `styles.css`。
- 在插件目录中创建文件夹 `<vault>/.obsidian/plugins/obsidian-hexo-integration`。
- 将文件放入该文件夹并重启 Obsidian。

---

## 🚀 核心功能

### 📤 发布与同步
- **一键发布**: 瞬间将笔记同步到 Hexo 的 `_posts` 文件夹。
- **命令行集成**: 直接在 Obsidian 中运行 `hexo g` (生成), `hexo s` (预览), `hexo d` (部署)。
- **同步追踪 (脏检查)**: 使用内部哈希关联，无需繁琐的时间戳即可精准追踪修改与重命名。
- **状态栏指示**: 实时显示 **⚪草稿**, **🟡未同步**, **🟢已发布** 状态。

### 🖼️ 资源管理
- **智能图像同步**: 自动将文章内引用的图片及封面图拷贝至 Hexo 资源文件夹。
- **资源清理**: 自动识别并一键清理 Hexo 中不再被文章引用的冗余图片。
- **灵活语法**: 支持原生 Markdown `![]()` 或 Hexo `{% asset_img %}`。

### 🤖 自动化增强
- **SEO 优化**: 自动文件名规范化（英文转小写、空格转连字符、保留中文）。
- **永久链接 (Permalink)**: 支持短哈希、拼音缩写、标题、或百度翻译自动生成 URL。
- **自动摘要**: 可配置在第一段后自动插入 `<!--more-->`。
- **元数据自动化**: 自动补全 `title`, `date`, `tags`, `published` 等 Frontmatter 信息。

---

## 📖 快速上手

1. **设置根目录**: 在设置中填写 Hexo 根目录的绝对路径。
2. **转换笔记**: 使用命令 `Convert current file to Hexo format` 为笔记添加元数据。
3. **发布**: 点击状态栏指标或使用 `Publish current post` 即可完成同步。

> [!TIP]
> 建议利用 Obsidian 的模板功能自行创建包含必要元数据（如 `published: false`）的笔记，以便快速开始写作。

---

## 🔄 同步追踪机制

插件采用智能哈希校验系统，确保您的写作流不受技术细节干扰：

- **自由移动与重命名**：您可以在 Obsidian 库内随意移动笔记或重命名文件，插件会自动追踪这些变化，且不会抹除笔记与 Hexo 文章之间的关联。
- **内容一致性校验**：通过对文件内容进行哈希（Hash）计算，精准识别笔记是否已被同步至 Hexo。状态栏会实时反馈同步状态。
- **删除政策**：
    - **手动谨慎处理**：由于删除操作具有较高的敏感性，插件不会自动删除 Hexo 目录下的文件。
    - **操作建议**：如果您删除了 Obsidian 中的笔记，请根据需要手动前往您的 Hexo 博客目录删除对应的 `.md` 文件及资源文件夹，以保持博客整洁。

---

## ⚠️ 注意事项
- 确保 Hexo `_config.yml` 中设置了 `post_asset_folder: true`。
- **管理机制**：插件仅管理 Frontmatter 中包含 `published` 字段的文章。
- **同步追踪**：笔记 Frontmatter 中的 `published: true` 必须开启才会进行同步追踪。

---
为 Hexo 和 Obsidian 用户倾情打造 ❤️
