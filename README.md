# Notion to Hugo

[![Deploy Hugo site](https://github.com/TennousuAthena/notion2hugo/actions/workflows/deploy.yml/badge.svg)](https://github.com/TennousuAthena/notion2hugo/actions/workflows/deploy.yml)

## 简介

**Notion to Hugo** 是一个将 Notion 数据库内容转换为 Hugo 静态网站的工具。它利用 Notion API 获取数据，转换为 Markdown 格式，并自动生成适用于 Hugo 的内容文件。

**Notion to Hugo** is a tool that converts content from a Notion database into a static Hugo website. It utilizes the Notion API to fetch data, converts it into Markdown format, and automatically generates content files suitable for Hugo.

## 特性

- **自动化内容同步**：定时从 Notion 数据库获取最新内容并同步到 Hugo 网站。
- **自定义模板**：支持自定义 Markdown 模板，便于生成符合需求的文章。
- **图片处理**：自动下载和替换文章中的图片链接，确保图片在 Hugo 网站中正确显示。
- **多语言支持**：内置多语言配置，支持中文和英文。

- **Automated Content Sync**: Fetches the latest content from Notion databases at scheduled intervals and syncs it to your Hugo site.
- **Custom Templates**: Supports customizable Markdown templates for generating articles that fit your requirements.
- **Image Handling**: Automatically downloads and replaces image links in articles to ensure proper display on your Hugo site.
- **Multilingual Support**: Built-in multilingual configuration supporting both Chinese and English.

## 安装

1. **克隆仓库**

   ```bash
   git clone https://github.com/TennousuAthena/notion2hugo.git
   cd notion2hugo
   ```

2. **安装依赖**

   确保你已经安装了 [Bun](https://bun.sh/) 环境，然后运行：

   ```bash
   bun install
   ```

3. **配置环境变量**

   创建 `.env` 文件并添加以下内容：

   ```env
   NODE_ENV=development
   NOTION_TOKEN=your_notion_integration_token
   NOTION_DB=your_notion_database_id
   ```

## 配置

编辑 `hugo/config.toml` 或 `hugo/config/_default/params.toml` 文件，根据你的需求调整 Hugo 主题和设置。

Ensure that the Hugo configuration files (`hugo/config.toml` or `hugo/config/_default/params.toml`) are edited according to your theme and requirements.

## 使用

1. **运行脚本同步内容**

   ```bash
   bun run src/main.ts
   ```

   该脚本将从 Notion 获取内容，转换为 Markdown，并生成 Hugo 所需的内容文件。

   This script fetches content from Notion, converts it to Markdown, and generates the necessary content files for Hugo.

2. **启动 Hugo 服务器**

   ```bash
   hugo server
   ```

   访问 `http://localhost:1313` 查看你的 Hugo 网站。

   Visit `http://localhost:1313` to view your Hugo site.

## 部署

本项目使用 GitHub Actions 进行自动部署。每次推送到 `master` 分支时，GitHub Actions 会自动构建并部署 Hugo 网站。

This project uses GitHub Actions for automatic deployment. Every push to the `master` branch triggers GitHub Actions to build and deploy the Hugo site automatically.

### 部署步骤

1. **设置 GitHub Secrets**

   在 GitHub 仓库的 Settings > Secrets 中添加以下密钥：

   - `NOTION_TOKEN`：你的 Notion 集成令牌。
   - `NOTION_DB`：你的 Notion 数据库 ID。
   - `DEPLOY_KEY`：用于部署的 SSH 密钥。

2. **配置部署脚本**

   确保 `.github/workflows/deploy.yml` 文件中的配置符合你的部署需求。

3. **推送代码**

   将更改推送到 `master` 分支，GitHub Actions 将自动运行部署流程。

## 贡献

欢迎任何形式的贡献！请提交 Pull Request 或 Issues 来提出你的建议或发现的问题。

Contributions are welcome in any form! Please submit Pull Requests or Issues to propose your suggestions or report any problems.

## 许可证

本项目基于 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
