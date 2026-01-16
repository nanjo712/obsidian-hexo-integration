[English] | [中文](README_zh.md)

# Hexo Integration for Obsidian

A powerful Obsidian plugin that streamlines the process of publishing notes directly to your Hexo blog. Manage your blog posts within Obsidian with automatic metadata handling, image processing, and sync tracking.

---

## 🛠️ Installation

### 1. Community Plugins (Recommended)
- Go to Obsidian **Settings** > **Community Plugins** > **Browse**.
- Search for `Hexo Integration`.
- Click **Install** and then **Enable**.
> [!NOTE]
> The plugin is currently under review by the Obsidian team and might not be searchable yet. Please use one of the methods below in the meantime.

### 2. Via BRAT (Beta)
- Install the [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
- In BRAT settings, click `Add Beta plugin`.
- Enter this repository URL: `nanjo712/obsidian-hexo-integration`.

### 3. Manual Installation
- Download `main.js`, `manifest.json`, and `styles.css` from the latest [Release](https://github.com/nanjo712/obsidian-hexo-integration/releases).
- Create a folder named `obsidian-hexo-integration` in `<vault>/.obsidian/plugins/`.
- Place the downloaded files into that folder and restart Obsidian.

---

## 🚀 Key Features

### 📤 Publishing & Sync
- **One-Click Publishing**: Instantly sync notes to your Hexo `_posts` folder.
- **CLI Integration**: Run `hexo g` (generate), `hexo s` (server), and `hexo d` (deploy) directly from Obsidian.
- **Sync Tracking**: Uses internal hashes to track changes and renames without cluttering your frontmatter.
- **Status Indicators**: Real-time status in the status bar: **⚪ Draft**, **🟡 Unsynced**, **🟢 Published**.

### 🖼️ Asset Management
- **Smart Image Sync**: Automatically copies embedded and cover images to Hexo asset folders.
- **Asset Cleanup**: Identifies and removes unused images in your Hexo project to keep it clean.
- **Flexible Syntax**: Supports both standard Markdown `![]()` and Hexo `{% asset_img %}` tags.

### 🤖 Automation
- **SEO Optimization**: Automatic filename sanitization (lowercase, spaces to hyphens, special character removal).
- **Permalink Generation**: Automatically generate URLs via Short Hash, Pinyin, Note Title, or Baidu Translate.
- **Auto Excerpt**: Optional automatic insertion of the `<!--more-->` tag.
- **Metadata Automation**: Automatically populates `title`, `date`, `tags`, and `published` frontmatter fields.

---

## 📖 Quick Start

1. **Set Root Directory**: Enter your Hexo blog's absolute path in the plugin settings.
2. **Convert Note**: Use the `Convert current file to Hexo format` command to add metadata to an existing note.
3. **Publish**: Click the status bar indicator or use the `Publish current post` command to sync.

> [!TIP]
> We recommend using Obsidian's built-in templates to create notes that already include the necessary frontmatter (like `published: false`).

---

## 🔄 Sync Tracking Mechanism

The plugin uses an intelligent hash-based system to ensure your writing workflow remains uninterrupted:

- **Free Movement & Renaming**: You can freely move or rename files within your Obsidian vault. The plugin automatically tracks these changes without losing the association between your notes and Hexo posts.
- **Content Integrity Check**: By calculating hashes of file content, the plugin precisely identifies whether a note is in sync with your Hexo blog. The status bar provides real-time feedback on this status.
- **Deletion Policy**:
    - **Manual Handling**: Given the sensitive nature of file deletion, the plugin does not automatically delete files in your Hexo directory.
    - **Recommended Action**: If you delete a note in Obsidian, please manually delete the corresponding `.md` file and asset folder in your Hexo directory if needed.

---

## ⚠️ Important Notes
- Ensure `post_asset_folder: true` is enabled in your Hexo `_config.yml`.
- **Managed Files**: The plugin only manages articles that contain the `published` field in their frontmatter.
- **Sync Tracking**: The `published: true` field must be present and set to true for sync tracking to be active.

---
Made with ❤️ for Hexo and Obsidian users.
