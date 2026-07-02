# ComfyUI Web 改进日志

> 版本：v3.18 | 更新日期：2026-07-02

---

## 已完成

### [2026-07-02] 修复：NAI API 响应中泄露调试信息
- **文件**：`functions/api/nai/generate.js`
- **问题**：限流 429 响应中包含 `_debug` 字段，暴露了 admin key 的存在性和匹配状态（`hasHeader`、`hasEnv`、`match`），攻击者可利用此信息推断服务器配置
- **修复**：移除 `_debug` 字段，仅返回必要的错误信息
- **严重性**：中等（信息泄露）

---

## 待改进

### 1. 🔴 高优先级：script.js 模块化拆分
- **现状**：`script.js` 约 178,000 字符（~5,000+ 行），所有逻辑集中在单文件
- **问题**：
  - 难以维护和调试
  - 无法做 Tree Shaking 或按需加载
  - 多人协作时极易冲突
- **建议方案**：
  - 拆分为 ES Modules：`ui.js`、`api.js`、`workflow.js`、`nai.js`、`tags.js`、`history.js` 等
  - 使用 `<script type="module">` 加载
  - 或引入 Vite/esbuild 作为轻量构建工具

### 2. 🟡 中优先级：deploy/ 目录同步问题
- **现状**：`deploy/` 目录包含 `index.html`、`script.js`、`style.css`、`tags.json` 的手动副本
- **问题**：修改根目录文件后需手动复制到 `deploy/`，容易遗漏导致线上版本与开发版不一致
- **建议方案**：
  - 用构建脚本自动复制（npm script 或 shell 脚本）
  - 或直接使用符号链接
  - 或调整 Netlify 配置直接使用根目录文件

### 3. 🟡 中优先级：引入构建工具
- **现状**：纯原生开发，无 minify、无 TypeScript
- **问题**：
  - CSS/JS 未压缩，首屏加载较慢
  - 缺乏类型检查，运行时才能发现类型错误
- **建议方案**：
  - 引入 Vite 作为开发/构建工具
  - 可选：渐进式引入 TypeScript（`.js` → `.ts`）
  - 配置 CSS 压缩和 JS 混淆

### 4. 🟢 低优先级：添加测试覆盖
- **现状**：无任何测试
- **问题**：功能回归难以检测，重构风险高
- **建议方案**：
  - 对核心逻辑（API 调用、工作流解析、提示词处理）添加单元测试
  - 使用 Vitest 或 Jest
  - 对 Serverless Functions 添加集成测试

### 5. 🟢 低优先级：NAI Serverless Functions 健壮性
- **现状**：排队逻辑依赖 KV 存储的一致性，高并发下可能出现竞态条件
- **问题**：
  - `wait_queue` 的读取-修改-写入不是原子操作
  - 超时清理逻辑分散在多处
- **建议方案**：
  - 使用 Durable Objects（如迁移到 Cloudflare Workers）实现强一致排队
  - 或添加乐观锁/版本号机制
  - 统一超时清理到一个定时任务

---

## 架构备忘

```
浏览器 ←→ ComfyUI Web (8080) ←→ ComfyUI 后端 (8188)
                ↓
         Netlify Functions (在线模式)
                ↓
         NovelAI API (NAI 生图)
```

- 桌面版通过 `launcher.py` 启动 `server.py` 反向代理
- 在线版通过 Netlify 部署静态文件 + Serverless Functions
- 前端三模式共用同一页面（`index.html`），通过 CSS class 切换显示
