# 不做清单 · STOP DOING LIST

反向待办清单应用 - 记录"不做的事"，培养自我觉察

## 功能特性

- 收据式打印动画
- 滑动交互（左滑操作）
- 时光机预测
- 票夹归档
- 数据统计（日/周/月/年 + 30天趋势）
- 演示模式（30天模拟数据）

## 本地运行

```bash
node server.js
```

访问 http://localhost:8080

## 部署

### GitHub

1. 创建 GitHub 仓库
2. 推送代码

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### Cloudflare Pages

1. 登录 Cloudflare Dashboard
2. 创建 Pages 项目，连接 GitHub 仓库
3. 构建设置：
   - Build command: （留空，纯静态）
   - Build output directory: `不做清单demo`

## 项目结构

```
├── 不做清单demo/          # 前端代码
│   ├── index.html         # 主页面
│   ├── css/style.css      # 样式
│   ├── js/app.js          # 主逻辑
│   ├── fonts/             # 字体
│   └── optimized_drawing.svg
├── server.js              # 本地开发服务器
└── deploy.bat             # 部署脚本
```
