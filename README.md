# 基于边缘计算的智能家居数据缓存项目

包含智能家居房间与设备控制页面、场景配置、账号页面、天气接口和 AI 助手。后端使用 Express 与 SQLite。

## 目录

- `public/html/`：房间、设备、登录和注册页面。
- `public/js/`、`public/css/`、`public/images/`：前端脚本、样式及图片。
- `server/server.js`：API、静态页面服务及数据库初始化。
- `server/package.json` / `server/package-lock.json`：后端依赖及锁文件。
- `server/.env.example`：配置模板，不包含真实密钥。
- `database/`：本地数据库目录，保留空目录占位文件。

## 本地运行准备

```powershell
cd server
npm ci
Copy-Item .env.example .env
```

在本机编辑 `server/.env`，填写自己的 `GOOGLE_API_KEY` 和 `WEATHER_API_KEY`。

**当前原始项目有依赖缺项**：`server.js` 使用 `@google/generative-ai`，但 `package.json` 和锁文件未声明它，因此仅执行 `npm ci` 后仍无法启动。若要继续本地演示，可在 `server/` 中执行 `npm install @google/generative-ai`，再执行 `npm start`；这会修改本地依赖清单与锁文件。原代码指定的模型可用性也需要单独确认。此次整理保留原依赖清单，没有承诺 AI 功能可用。

服务默认端口为 3000，入口为 `http://localhost:3000/html/login.html`。请从 `server/` 启动，确保 dotenv 能加载该目录的 `.env`。SQLite 文件位于 `database/smarthome.db`，表与演示数据由服务初始化。

## 整理说明

源码从 `smart_home.zip` 提取，保留原目录布局及锁文件，移除包内 `node_modules`、真实 `.env` 和旧数据库。天气 API 密钥改为在后端读取环境变量，首页天气请求改走已有 `/api/weather` 接口，前端不包含密钥。整理分支移除根目录原始压缩包；原始版本仍在 Git 历史中。

原始公开压缩包包含凭据，必须在对应服务商后台更换相关密钥；移除当前文件不能清除历史中的凭据。仓库整理不会替你更换服务商密钥或删除 Git 历史。

原代码包含演示账号、明文密码存储及简化账号逻辑，正式使用前需要单独改进认证。此次仅整理文件与配置，未验证完整服务和外部 API。
