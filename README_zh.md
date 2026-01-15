[English](README.md) | [中文]

# Obsidian Hexo 集成插件

一个功能强大的 Obsidian 插件，旨在简化将笔记直接发布到 Hexo 博客的流程。在 Obsidian 中轻松管理您的博客文章，享受自动元数据处理、图像资源同步和同步状态追踪。

## 🚀 核心功能

- **一键发布**: 瞬间将笔记同步到 Hexo 博客的 `_posts` 文件夹。
- **直接调用 Hexo 命令**:
  - **生成 Hexo 页面**: 在 Obsidian 中直接运行 `hexo generate`。
  - **启动 Hexo 服务器**: 运行 `hexo server` 实时预览您的博客。
  - **部署 Hexo 页面**: 运行 `hexo deploy` 将您的站点推送到线上。
- **智能图像处理**:
  - 自动将嵌入的图像复制到文章对应的资源文件夹（asset folder）。
  - 将 Wikilink 和 Markdown 图像语法自动转换为 Hexo 特有的 `{% asset_img ... %}` 标签。
- **持久化同步追踪 (脏检查)**:
  - 使用内部隐藏的哈希（Hash）系统追踪笔记与博客的同步状态。
  - 无需在 Frontmatter 中添加混乱的时间戳。
  - 自动处理 Obsidian 中的文件重命名和删除事件。
- **交互式状态栏**:
  - 实时显示同步状态：**⚪ 未发布 (Unpublished)**, **🟡 未同步 (Unsynced)**, 或 **🟢 已发布 (Published)**。
  - 点击状态栏指示器可直接触发发布。
- **Hexo 命令面板**:
  - 侧边栏专属图标（Hexo Logo），一键访问所有插件命令。
- **元数据自动化**:
  - 自动为笔记添加必要的 Hexo Frontmatter (`title`, `date`, `tags`, `publish`)。
  - 提供“创建新的 Hexo 文章”模板，让您立即开始写作。

## 🛠️ 配置说明

1. 进入 **设置 (Settings)** > **Hexo Integration**。
2. 设置 **Hexo Root Directory**: 提供 Hexo 博客根目录的绝对路径（例如：`D:\MyBlog`）。
3. (可选) 通过 Obsidian 的热键设置，为您常用的命令配置快捷键。

## 📖 使用指南

### 1. 创建或转换
- 使用 **Create new Hexo Post** 命令，使用正确的模板开始新文章。
- 或者，使用 **Convert current file to Hexo format** 为现有笔记添加元数据。

### 2. 管理博客
- 点击左侧边栏的 **Hexo 图标**:
    - **Generate Hexo Pages**: 构建您的静态站点。
    - **Start Hexo Server**: 启动本地预览服务器。
    - **Deploy Hexo Pages**: 部署您的博客。

### 3. 查看状态
- 观察右下角的 **状态栏 (Status Bar)**。
- **🟢 已发布**: 您的笔记内容与博客中的内容一致。
- **🟡 未同步**: 自上次发布以来，您对本地笔记进行了修改。
- **⚪ 未发布**: 该笔记尚未同步，或由于 `publish: false` 未被标记为发布。

### 4. 发布文章
- 直接点击 **状态栏** 指示器。
- 或在侧边栏的 Hexo 菜单中选择 **Publish current post**。

## ⚙️ 技术细节

- **哈希存储**: 文件内容的哈希值存储在插件的 `data.json` 中。这保持了 Markdown 文件的整洁，并能可靠地检测内容变化，不受文件修改时间的影响。
- **图像转换**: 插件会解析笔记中的图像，将其复制到文章专属资源文件夹，并更新引用，确保图像在 Hexo 中正确渲染。

## ⚠️ 重要提示

- 如果您使用图像，请确保 Hexo 博客已启用 `post_asset_folder` 设置。
- Frontmatter 中的 `publish` 字段必须设置为 `true` 才能激活同步追踪。

---

为 Hexo 和 Obsidian 用户倾情打造 ❤️
