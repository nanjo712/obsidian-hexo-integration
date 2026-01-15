[English](README.md) | [中文]

# Obsidian Hexo 集成插件

一个功能强大的 Obsidian 插件，旨在简化将笔记直接发布到 Hexo 博客的流程。在 Obsidian 中轻松管理您的博客文章，享受自动元数据处理、图像资源同步和同步状态追踪。

## 🚀 核心功能

- **一键发布**: 瞬间将笔记同步到 Hexo 博客的 `_posts` 文件夹。
- **直接调用 Hexo 命令**:
  - **生成 Hexo 页面**: 在 Obsidian 中直接运行 `hexo generate`。
  - **启动 Hexo 服务器**: 运行 `hexo server` 实时预览您的博客。
  - **部署 Hexo 页面**: 运行 `hexo deploy` 将您的站点推送到线上。
- **智能自动摘要**:
  - 发布文章时自动在第一段后插入 `<!--more-->` 标签（若文章中已手动添加则会自动跳过）。
  - 可在设置中开启或关闭。
- **资源文件夹清理**:
  - **扫描与清理**: 自动扫描 Hexo 资源文件夹，识别不再被文章引用的图片（包括封面和正文内容）。
  - **二次确认**: 删除前弹窗列出所有待删除的文件，确保操作安全。
  - **全局清理**: 支持一键扫描并清理所有已发布文章的冗余资源。
- **自动文件名同步**:
  - **规范化 (Sanitization)**: 自动将 Obsidian 文件名转换为利于 SEO 的 Hexo 文件名（小写、空格转连字符、去除特殊字符、保留中文）。
  - **重命名同步**: 在 Obsidian 中重命名笔记会自动同步重命名 Hexo 中的对应文件，保持博客结构整洁。
  - **冲突处理**: 自动处理文件名冲突，通过添加数字后缀确保唯一性。
- **高级 Permalink (永久链接) 生成**:
  - 根据您的偏好自动生成 URL：支持 **短哈希 (Short Hash)**、**拼音首字母 (Pinyin Initials)**、**直接使用标题 (Note Title)** 或 **百度翻译 (Baidu Translate)**。
  - **直接使用标题 (Note Title)**: 直接使用文章标题作为 Permalink（支持可选的格式清理）。非常适合英文用户。
  - **百度翻译集成**: 自动将中文标题转换为利于 SEO 的英文 Permalink。
  - **智能格式化**: 支持自动去除英文停用词（a, the, in 等）并可设置 Permalink 的最大单词截断数量（适用于“标题”和“翻译”模式）。
- **智能图像处理**:
  - 自动将嵌入的图像复制到文章对应的资源文件夹（asset folder）。
  - **封面图支持**: 自动识别 Frontmatter 中的封面字段，将其拷贝至资源文件夹并转换引用。
  - **灵活语法**: 可选择使用 Hexo 特有的 `{% asset_img ... %}` 标签或原生 Markdown `![]()` 语法。
- **持久化同步追踪 (脏检查)**:
  - 使用内部隐藏的哈希（Hash）系统追踪笔记与博客的同步状态。
  - 无需在 Frontmatter 中添加混乱的时间戳。
  - 自动处理 Obsidian 中的文件重命名和删除事件。
- **交互式状态栏**:
  - 实时显示同步状态：**⚪ 未发布 (Unpublished)**, **🟡 未同步 (Unsynced)**, 或 **🟢 已发布 (Published)**。
  - 点击状态栏指示器可直接触发发布。
- **Hexo 管理视图**:
  - 侧边栏专属视图，轻松管理 Hexo 命令和设置。
- **元数据自动化**:
  - 自动为笔记添加必要的 Hexo Frontmatter (`title`, `permalink`, `date`, `tags`, `published`)。
  - 提供“创建新的 Hexo 文章”模板，让您立即开始写作。

## 🛠️ 配置说明

1. 进入 **设置 (Settings)** > **Hexo Integration**。
2. 设置 **Hexo Root Directory**: 提供 Hexo 博客根目录的绝对路径（例如：`D:\MyBlog`）。
3. 设置 **Permalink Style**: 选择当 Permalink 缺失时如何自动生成：
    - **Short Hash**: 生成 8 位唯一哈希码。
    - **Pinyin Initials**: 将中文字符转换为拼音首字母（例如：“测试” -> “cs”）。
    - **Note Title**: 直接使用文章标题。
    - **Baidu Translate**: 使用百度翻译 API 将标题转换为英文。
        - 需要填入 **Baidu AppID** 和 **API Key**。
    - **Manual**: 手动模式。若未填写 Permalink，将中止发布流程并提醒。
4. **Permalink 后处理** (适用于“标题”和“百度翻译”模式):
    - **Remove Stop Words**: 开启后将自动过滤 Permalink 中的英文虚词（a, the 等）。
    - **Max Permalink Words**: 限制生成的 Permalink 最大单词数量。
5. **图片语法 (Image Syntax)**:
    - **Hexo Tag**: 使用 `{% asset_img %}` (支持 Hexo 原生资源特性)。
    - **Native Markdown**: 使用原生的 `![]()` (获得更好的通用预览兼容性)。
6. **封面字段名称 (Cover Field Name)**: 自定义用于识别封面的 Frontmatter 字段（默认为 `cover`）。
7. **自动摘要 (Auto Excerpt)**: 开启后在发布时自动在第一段后添加 `<!--more-->`。
8. (可选) 通过 Obsidian 的热键设置配置快捷键。

## 📖 使用指南

### 1. 创建或转换
- 使用 **Create new Hexo Post** 命令使用模板开始新文章。
- 使用 **Convert current file to Hexo format** 为现有笔记添加元数据。
- 使用 **Generate Permalink** 命令手动生成或更新 Permalink 字段。

### 2. 管理博客
- 使用侧边栏的 **Hexo 管理视图** 或功能区图标:
    - **Generate Hexo Pages**: 构建您的静态站点。
    - **Start Hexo Server**: 启动本地预览服务器。
    - **Deploy Hexo Pages**: 部署您的博客。

### 3. 查看状态
- 观察右下角的 **状态栏 (Status Bar)**。
- **🟢 已发布**: 笔记已同步且与博客内容一致。
- **🟡 未同步**: 检测到本地修改（需要重新发布）。
- **⚪ 草稿**: 尚未发布或未标记为发布。

### 4. 发布文章
- 直接点击 **状态栏** 指示器，或在 Hexo 菜单中选择 **Publish current post**。

## ⚙️ 技术细节

- **哈希存储**: 文件哈希值存储在 `data.json` 中，确保 Markdown 文件整洁的同时实现可靠的变化检测。
- **文件名映射**: 维护 Obsidian 文件与 Hexo 文件之间的持久映射，支持无缝重命名同步。
- **图像转换**: 自动处理图像引用，确保在 Hexo 中正确显示。

## ⚠️ 重要提示

- 如果使用图像，请确保 Hexo 启用 `post_asset_folder: true` 设置。
- Frontmatter 中的 `published` 字段必须为 `true` 才能激活同步追踪。

---

为 Hexo 和 Obsidian 用户倾情打造 ❤️
