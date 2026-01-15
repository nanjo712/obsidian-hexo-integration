[English](README.md) | [中文]

# Obsidian Hexo 集成插件

一个功能强大的 Obsidian 插件，旨在简化将笔记直接发布到 Hexo 博客的流程。在 Obsidian 中轻松管理您的博客文章，享受自动元数据处理、图像资源同步和同步状态追踪。

## 🚀 核心功能

- **一键发布**: 瞬间将笔记同步到 Hexo 博客的 `_posts` 文件夹。
- **直接调用 Hexo 命令**:
  - **生成 Hexo 页面**: 在 Obsidian 中直接运行 `hexo generate`。
  - **启动 Hexo 服务器**: 运行 `hexo server` 实时预览您的博客。
  - **部署 Hexo 页面**: 运行 `hexo deploy` 将您的站点推送到线上。
- **高级 Slug 生成**:
  - 根据您的偏好自动生成 URL：支持 **短哈希 (Short Hash)**、**拼音首字母 (Pinyin Initials)**、**直接使用标题 (Note Title)** 或 **百度翻译 (Baidu Translate)**。
  - **直接使用标题 (Note Title)**: 直接使用文章标题作为 Slug（支持可选的格式清理）。非常适合英文用户。
  - **百度翻译集成**: 自动将中文标题转换为利于 SEO 的英文 Slug。
  - **智能格式化**: 支持自动去除英文停用词（a, the, in 等）并可设置 Slug 的最大单词截断数量（适用于“标题”和“翻译”模式）。
- **智能图像处理**:
  - 自动将嵌入的图像复制到文章对应的资源文件夹（asset folder）。
  - **灵活语法**: 可选择使用 Hexo 特有的 `{% asset_img ... %}` 标签或原生 Markdown `![]()` 语法，以获得更好的跨编辑器兼容性。
- **持久化同步追踪 (脏检查)**:
  - 使用内部隐藏的哈希（Hash）系统追踪笔记与博客的同步状态。
  - 无需在 Frontmatter 中添加混乱的时间戳。
  - 自动处理 Obsidian 中的文件重命名和删除事件。
- **交互式状态栏**:
  - 实时显示同步状态：**⚪ 未发布 (Unpublished)**, **🟡 未同步 (Unsynced)**, 或 **🟢 已发布 (Published)**。
  - 点击状态栏指示器可直接触发发布。
- **Hexo 命令面板**:
  - 侧边栏专属图标（Hexo Logo），一键访问所有插件命令，包括全新的 **Generate Slug** 工具。
- **元数据自动化**:
  - 自动为笔记添加必要的 Hexo Frontmatter (`title`, `slug`, `date`, `tags`, `publish`)。
  - 提供“创建新的 Hexo 文章”模板，让您立即开始写作。

## 🛠️ 配置说明

1. 进入 **设置 (Settings)** > **Hexo Integration**。
2. 设置 **Hexo Root Directory**: 提供 Hexo 博客根目录的绝对路径（例如：`D:\MyBlog`）。
3. 设置 **Slug Style**: 选择当 Slug 缺失时如何自动生成：
    - **Short Hash**: 生成 8 位唯一哈希码。
    - **Pinyin Initials**: 将中文字符转换为拼音首字母（例如：“测试” -> “cs”）。
    - **Note Title**: 直接使用文章标题。
    - **Baidu Translate**: 使用百度翻译 API 将标题转换为英文。
        - 需要填入 **Baidu AppID** 和 **API Key**。
    - **Manual**: 手动模式。若未填写 Slug，将中止发布流程并提醒。
4. **Slug 后处理** (适用于“标题”和“百度翻译”模式):
    - **Remove Stop Words**: 开启后将自动过滤 Slug 中的英文虚词（a, the 等）。
    - **Max Slug Words**: 限制生成的 Slug 最大单词数量。
5. **图片语法 (Image Syntax)**:
    - **Hexo Tag**: 使用 `{% asset_img %}` (支持 Hexo 原生资源特性)。
    - **Native Markdown**: 使用原生的 `![]()` (获得更好的通用预览兼容性)。
6. (可选) 通过 Obsidian 的热键设置配置快捷键。

## 📖 使用指南

### 1. 创建或转换
- 使用 **Create new Hexo Post** 命令使用模板开始新文章。
- 使用 **Convert current file to Hexo format** 为现有笔记添加元数据。
- 使用 **Generate Slug** 命令手动生成或更新 Slug 字段。

### 2. 管理博客
- 点击左侧边栏的 **Hexo 图标**:
    - **Generate Hexo Pages**: 构建您的静态站点。
    - **Start Hexo Server**: 启动本地预览服务器。
    - **Deploy Hexo Pages**: 部署您的博客。

### 3. 查看状态
- 观察右下角的 **状态栏 (Status Bar)**。
- **🟢 已发布**: 内容一致。
- **🟡 未同步**: 检测到本地有新修改。
- **⚪ 未发布**: 尚未同步或未标记为发布。

### 4. 发布文章
- 直接点击 **状态栏** 指示器，或在侧边栏的 Hexo 菜单中选择 **Publish current post**。

## ⚙️ 技术细节

- **哈希存储**: 文件哈希值存储在 `data.json` 中，确保 Markdown 文件整洁的同时实现可靠的变化检测。
- **图像转换**: 自动处理图像引用，确保在 Hexo 中正确显示。

## ⚠️ 重要提示

- 如果使用图像，请确保 Hexo 启用 `post_asset_folder: true` 设置。
- Frontmatter 中的 `publish` 字段必须为 `true` 才能激活同步追踪。

---

为 Hexo 和 Obsidian 用户倾情打造 ❤️
