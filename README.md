[English] | [中文](README_zh.md)

# Hexo Integration for Obsidian

A powerful Obsidian plugin that streamlines the process of publishing specialized notes directly to your Hexo blog. Manage your blog posts within Obsidian with automatic metadata handling, image processing, and sync tracking.

## 🚀 Key Features

- **One-Click Publishing**: Instantly copy your notes to your Hexo blog's `_posts` folder.
- **Direct Hexo CLI Commands**:
  - **Generate Hexo Pages**: Run `hexo generate` from Obsidian.
  - **Start Hexo Server**: Run `hexo server` to preview your blog.
  - **Deploy Hexo Pages**: Run `hexo deploy` to push your site live.
- **Smart Image Handling**:
  - Automatically copies embedded images to post-specific asset folders.
  - Transforms Wikilink and Markdown image syntax to Hexo's specific `{% asset_img ... %}` tags.
- **Persistent Sync Tracking (Dirty Check)**:
  - Uses an internal, invisible hash-based system to track if your notes are in sync with your blog.
  - No messy timestamps in your frontmatter.
  - Automatically handles file renames and deletions in Obsidian.
- **Interactive Status Bar**:
  - Displays real-time sync status: **⚪ Unpublished**, **🟡 Unsynced**, or **🟢 Published**.
  - Clickable status indicator to trigger immediate publishing.
- **Hexo Command Palette**:
  - A dedicated ribbon icon (Hexo logo) in the sidebar to access all plugin commands.
- **Metadata Automation**:
  - Automatically adds required Hexo frontmatter (`title`, `date`, `tags`, `publish`) to your notes.
  - "Create new Hexo Post" template to start writing immediately.

## 🛠️ Configuration

1. Go to **Settings** > **Hexo Integration**.
2. Set your **Hexo Root Directory**: Provide the absolute path to your Hexo blog's root folder (e.g., `D:\MyBlog`).
3. (Optional) Customize your hotkeys for commands via the Obsidian Hotkeys settings.

## 📖 How to Use

### 1. Create or Convert
- Use the **Create new Hexo Post** command to start a new post with the correct template.
- Or, use **Convert current file to Hexo format** to add metadata to an existing note.

### 2. Manage your Blog
- Click the **Hexo icon** in the left ribbon to:
    - **Generate Hexo Pages**: Build your static site.
    - **Start Hexo Server**: Start the local preview server.
    - **Deploy Hexo Pages**: Deploy your blog.

### 3. Track Status
- Look at the bottom-right **Status Bar**.
- **🟢 Published**: Your note matches what's in your blog.
- **🟡 Unsynced**: You've made local changes since your last publish.
- **⚪ Unpublished**: This note hasn't been synced or isn't marked for publishing yet.

### 4. Publish
- Click the **Status Bar** indicator directly.
- Or, select **Publish current post** from the Hexo sidebar menu.

## ⚙️ Technical Details

- **Hash Storage**: File content hashes are stored in the plugin's `data.json`. This keeps your Markdown files clean and allows for reliable change detection regardless of file modification times.
- **Image Transformation**: The plugin parses your note for images, copies them to an asset folder matching the post name, and updates the references to ensure they render correctly in Hexo.

## ⚠️ Important Notes

- Ensure your Hexo blog is configured to use the `post_asset_folder` setting if you use images.
- The `publish` field in frontmatter must be set to `true` for the sync tracking to activate.

---

Made with ❤️ for Hexo and Obsidian users.
