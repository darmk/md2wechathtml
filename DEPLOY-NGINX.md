# Nginx 子路径部署

访问路径：`https://你的域名/md2articlehtml/`。服务器仅需 Nginx，无需运行 Node、Wrangler 或 Cloudflare 服务；自定义图床接口需要单独提供。

## 1. 本地打包

在项目目录执行（Node.js >= 22.13.0）：

```bash
npm run build
```

仅首次安装或依赖不完整时需要先执行 `npm ci`。Windows 上先保存网页文章，再停止正在运行的本项目开发服务，否则原生依赖可能被锁定，导致 EPERM。不要批量结束其他项目的 Node 进程。

站点对外访问源通过 `SITE_ORIGIN` 环境变量读入（结尾不带斜杠），用于生成 Open Graph / Twitter 卡片所需的完整 URL。可参考 `.env.example` 建立 `.env`；不配置时使用内置的默认源。换域名后必须重新打包，否则分享卡片里的图片地址仍指向旧域名。

构建命令会编译完整应用、渲染真实的 `/md2articlehtml/` 页面、导出水合数据，并通过本地 HTTP 检查首页、所有生成的客户端资源、缺失文件的 404 和尾斜杠跳转。任意检查失败，命令都会失败；不要上传失败构建的残留文件或旧 ZIP。

成功产物：

```text
dist/
├── client/
│   ├── index.html
│   ├── index.rsc
│   ├── _next/
│   ├── og.png
│   └── favicon.svg
└── md2articlehtml.zip
```

ZIP 内已包含一层 `md2articlehtml/` 目录，仅包含公开的客户端文件，不包含源码、服务端构建文件、环境变量或 node_modules。

## 2. 本地验证成品

```bash
npm run check:static
npm start
```

打开 `http://127.0.0.1:3000/md2articlehtml/`。这是纯静态预览，不是 Node 服务端渲染。若 3000 已被占用，停止本项目的开发服务，或在 PowerShell 使用 `$env:PORT=3001` 后运行 `npm start`。开发仍可使用 `npm run dev`，同样访问带子路径的地址。

不要直接双击 index.html。文件协议无法正确加载子路径下的脚本。

## 3. 上传到服务器

建议先备份服务器上旧的 `md2articlehtml` 目录，再上传新包，解压到 `/home/project/www/`。只更新本项目，不覆盖主站其他目录。

注意：ZIP 已含目录名，不要再解压到 `/home/project/www/md2articlehtml/` 中，否则会多套一层目录。

最终位置必须是：

```text
/home/project/www/md2articlehtml/index.html
/home/project/www/md2articlehtml/_next/...
/home/project/www/md2articlehtml/og.png
```

如果不用 ZIP，上传 `dist/client/` 的全部内容到 `/home/project/www/md2articlehtml/`，不要把 client 目录本身也套进去。

## 4. Nginx 配置

将 `deploy/nginx-md2articlehtml.conf` 中的两个 location 放进主域名现有的 `server {}` 内，不替换整份 nginx.conf，也不修改主站的 `/` location。该文件已包含下一节要求的 CSP 覆盖和安全响应头，直接取用即可。

主配置应保留 `include /etc/nginx/mime.types;`，确保 JS/CSS 的类型正确。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

原配置监听 81 端口，直接访问对应 `http://服务器IP:81/md2articlehtml/`。主域名 HTTPS 访问需确认其 server 或前置代理转发到正确端口。正式使用应启用 HTTPS，否则富文本剪贴板能力可能受限。

## 5. 内容安全策略（必配，否则线上交互全失效）

这是最容易踩的一项，且**本地无法复现**：本地预览服务器不下发 CSP，一切正常；线上站点通常会在 `http` 或 `server` 层统一加上：

```nginx
add_header Content-Security-Policy "default-src 'self'" always;
```

而本应用依赖三类被该策略禁止的能力：

| 被拦截的能力 | 后果 |
| --- | --- |
| 内联脚本（`dist/client/index.html` 中 Vinext 输出的 RSC 水合载荷） | 客户端拿不到水合数据，控制台报 `aborting hydration`，页面只剩静态 HTML，所有交互失效 |
| 内联 `style` 属性 | 主题与预览样式错乱 |
| 外链图片、自定义图床接口 | Markdown 外链图无法加载，图床上传失败 |

因此必须在 `/md2articlehtml/` 的 location 内**显式覆盖** CSP，其余指令仍然收紧：

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'" always;
```

两个 nginx 细节：

- `add_header` **不跨层继承**：一旦在 location 内写了 `add_header`，上层的安全响应头就不再继承，所以 `X-Content-Type-Options`、`X-Frame-Options` 等要在本层重新声明一遍（配置文件里已写好）。
- 若上层用的是 `more_set_headers`（headers-more 模块），它会覆盖 `add_header`，此时需要在 location 内同样改用 `more_set_headers`。先用 `sudo grep -rn "Content-Security-Policy" /etc/nginx/` 确认是哪一种。

站点前面若还有 CDN、宝塔面板或反向代理，也要在那一层同步放宽，否则浏览器仍会拦截。

生效验证：

```bash
curl -I http://服务器IP:81/md2articlehtml/
```

应看到上面那条完整 CSP，而不是 `default-src 'self'`。浏览器控制台不应再出现 `Refused to execute inline script` 或 `aborting hydration`。

## 6. 403 排查

```bash
ls -la /home/project/www/md2articlehtml/index.html
namei -l /home/project/www/md2articlehtml/index.html
sudo tail -n 50 /var/log/nginx/error.log
```

- `directory index ... is forbidden`：首页缺失、上传目录层级错误。
- `Permission denied`：检查 nginx 用户对文件的读取权限和每层目录的穿越权限；启用 SELinux 时还需检查对应访问拒绝记录。
- 不要用 `chmod -R 777`、关闭 SELinux 或开启目录浏览来绕过问题。

## 构建兼容处理

当前锁定的 Vinext 1.0.0-beta.5 CLI 预渲染未给页面请求补上 basePath，导致请求 `/` 得到 404 后将首页记录为 `skipped/dynamic`。本项目使用 Vite 的完整 RSC 构建，再通过 Vinext 的生产渲染器请求正确的 `/md2articlehtml/`，保留真实 HTML 和 React 水合脚本，不生成占位首页，也不修改 node_modules。

构建后将资源目录规范化为可直接上传的 `dist/client/`。请使用 `npm run build`，不要使用 `npx vinext build` 或只运行 `vite build` 来制作部署包。升级框架后应重新执行完整验证再决定是否移除这段兼容处理。

构建与 HTTP 文件检查不等同于浏览器交互验收；部署后建议检查导入、主题切换、手机预览和复制富文本。文章内容不因静态托管自动保存到服务器，刷新前请先导出备份。
