# Claude Glass

给 Claude Code CLI 套上一层漂亮的 Web UI。

所有 AI 能力、工具执行、权限控制全部由 Claude Code CLI 负责，本项目只负责输入传递、流解析和界面渲染。

```
浏览器（React）  ←SSE→  Python 后端（FastAPI）  ←stdin/stdout→  claude CLI 进程
```

## 功能

- **多会话管理** — 创建、重命名、删除会话，历史消息持久化到本地 SQLite
- **工具权限审批** — 通过 Claude Code Hook 拦截工具调用，在前端弹窗让用户决定允许或拒绝
- **工作目录** — 每个会话可独立设置工作目录，Claude 在该目录下执行命令
- **模型选择** — 可为每次对话指定不同的 Claude 模型
- **实时流式输出** — 通过 SSE 实时渲染 Claude 的回复和工具调用结果

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite + React 19 + Tailwind CSS 4 |
| 通信 | SSE (Server-Sent Events) |
| 后端 | Python FastAPI + aiosqlite |
| CLI | `claude -p --output-format stream-json` |

## 前置要求

- Python 3.10+
- Node.js 18+
- pnpm
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装并配置好

## 快速开始

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# 前端（新开一个终端）
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:5173

## License

MIT
