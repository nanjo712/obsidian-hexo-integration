[English] | [中文](README_zh.md)

# Hexo Integration for Obsidian

A powerful Obsidian plugin that streamlines the process of publishing specialized notes directly to your Hexo blog. Manage your blog posts within Obsidian with automatic metadata handling, image processing, and sync tracking.

## 🚀 Key Features

- **One-Click Publishing**: Instantly copy your notes to your Hexo blog's `_posts` folder.
- **Direct Hexo CLI Commands**:
  - **Generate Hexo Pages**: Run `hexo generate` from Obsidian.
  - **Start Hexo Server**: Run `hexo server` to preview your blog.
  - **Deploy Hexo Pages**: Run `hexo deploy` to push your site live.
- **Advanced Slug Generation**:
  - Automatically generate URLs based on your preference: **Short Hash**, **Pinyin Initials**, **Note Title** or **Baidu Translate**.
  - **Note Title**: Directly uses your note's title (with optional cleaning). Perfect for English users.
  - **Baidu Translate Integration**: Automatically converts Chinese titles to SEO-friendly English slugs.
  - **Smart Formatting**: Option to remove stop words (a, the, in, etc.) and truncate slugs to a specific word count (available for Title and Translate modes).
- **Smart Image Handling**:
  - Automatically copies embedded images to post-specific asset folders.
  - **Flexible Syntax**: Choose between Hexo's specific `{% asset_img ... %}` tags or native Markdown `![]()` syntax for better compatibility with other Markdown editors.
- **Persistent Sync Tracking (Dirty Check)**:
  - Uses an internal, invisible hash-based system to track if your notes are in sync with your blog.
  - No messy timestamps in your frontmatter.
  - Automatically handles file renames and deletions in Obsidian.
- **Interactive Status Bar**:
  - Displays real-time sync status: **⚪ Unpublished**, **🟡 Unsynced**, or **🟢 Published**.
  - Clickable status indicator to trigger immediate publishing.
- **Hexo Command Palette**:
  - A dedicated ribbon icon (Hexo logo) in the sidebar to access all plugin commands, including a new **Generate Slug** tool.
- **Metadata Automation**:
  - Automatically adds required Hexo frontmatter (`title`, `slug`, `date`, `tags`, `publish`) to your notes.
  - "Create new Hexo Post" template to start writing immediately.

## 🛠️ Configuration

1. Go to **Settings** > **Hexo Integration**.
2. Set your **Hexo Root Directory**: Provide the absolute path to your Hexo blog's root folder (e.g., `D:\MyBlog`).
3. Set your **Slug Style**:
    - **Short Hash**: Generates an 8-character unique hash.
    - **Pinyin Initials**: Converts Chinese characters to pinyin initials (e.g., "测试" -> "cs").
    - **Note Title**: Uses the note title directly.
    - **Baidu Translate**: Uses Baidu API to translate titles to English.
        - Requires **Baidu AppID** and **API Key**.
    - **Manual**: Aborts publication if the slug is not manually filled.
4. **Slug Post-Processing** (For Title and Baidu styles):
    - **Remove Stop Words**: Clean up slugs by removing common English words (a, the, etc.).
    - **Max Slug Words**: Limit the length of the generated slug.
5. **Image Syntax**:
    - **Hexo Tag**: Uses `{% asset_img %}` (best for Hexo features like better image scaling).
    - **Native Markdown**: Uses standard `![]()` (best for cross-editor preview compatibility).
6. (Optional) Customize hotkeys via the Obsidian Hotkeys settings.

## 📖 How to Use

### 1. Create or Convert
- Use **Create new Hexo Post** to start a new post with the correct template.
- Use **Convert current file to Hexo format** to prepare an existing note.
- Use **Generate Slug** to manually create or update the slug field.

### 2. Manage your Blog
- Click the **Hexo icon** in the left ribbon to:
    - **Generate Hexo Pages**: Build your static site.
    - **Start Hexo Server**: Start the local preview server.
    - **Deploy Hexo Pages**: Deploy your blog.

### 3. Track Status
- Look at the bottom-right **Status Bar**.
- **🟢 Published**: Matches your blog.
- **🟡 Unsynced**: Local changes detected.
- **⚪ Unpublished**: Not yet synced or marked for publishing.

### 4. Publish
- Click the **Status Bar** directly, or select **Publish current post** from the Hexo sidebar menu.

## ⚙️ Technical Details

- **Hash Storage**: File hashes are stored in `data.json` for reliable, frontmatter-clean change detection.
- **Image Transformation**: Copies images to asset folders and updates references to Hexo-compatible tags.

## ⚠️ Important Notes

- Ensure `post_asset_folder: true` is set in your Hexo `_config.yml` if using images.
- The `publish` field must be `true` for sync tracking.

---

Made with ❤️ for Hexo and Obsidian users.
