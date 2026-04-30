<p align="center">
  <a href="./README.md"><strong>English</strong></a> ·
  <strong>中文</strong> ·
  <a href="https://jeffeychou.github.io/maliang-deck/"><strong>Live Demo</strong></a>
</p>

# Maliang Deck -- 面向幻灯片生产的领域专用语言（DSL）

Maliang Deck 是一个 DSL-first 的幻灯片生产工作流，用于从结构化内容创建商业、技术、学术和叙事型演示文稿。它以经过验证的 JSON deck DSL 作为唯一可信源，然后把同一份 deck 渲染为交互式 HTML、PDF 和可编辑 PPTX。

```text
JSON deck DSL -> HTML preview and runtime
JSON deck DSL -> SVG -> PDF export
JSON deck DSL -> SVG metadata -> DrawingML PPTX export
```

目标很简单：把注意力放在信息、结构、证据和设计意图上。不要把生成后的 HTML、SVG、PDF 或 PPTX 当作 canonical deck 手工维护。修改 DSL，验证它，组装它，然后重新构建输出。

你可以把它理解成一种面向幻灯片的 "TeX"：我们把结构化内容和标记写在一个耐久的源格式里，再编译成用于审阅和交付的演示格式。不要再把 token 浪费在脆弱的标记和易碎的 HTML 生成上；用结构化方式描述你的 deck，然后让工作流处理其余部分。

## 为什么是 Maliang Deck

大多数 agent 生成幻灯片的流程，会让 agent 直接把 token 花在原始 HTML、SVG、XML 或 PPTX 内部结构上。小型 deck 这样做可以工作，但一旦 deck 需要验证、多种导出目标、动画、演讲工具和后续修订，这种方式就会变得脆弱。Maliang Deck 把 typed JSON deck DSL 作为唯一可信源，再编译成交互式 HTML、PDF 和可编辑 PPTX。

| 能力 | HTML-first slide tools | PPTX-oriented slide tools | Maliang Deck |
| --- | --- | --- | --- |
| Canonical source | 浏览器标记通常就是工作产物。 | PowerPoint 结构或生成的 PPTX 往往成为交付产物。 | 经过验证的 JSON deck DSL 始终是耐久的唯一可信源。 |
| Agent workload | Agent 会在原始 HTML/CSS/SVG 细节上消耗大量 token。 | Agent 经常需要处理底层 PPTX/XML 约束。 | Agent 用 typed DSL 描述 slide 结构、数据、布局意图、动画元数据和导出选项。 |
| Workflow control | 适合快速视觉实验，但审阅 gate 通常不够正式。 | 当唯一目标是 PowerPoint 时很有用，但不太适合 web-first 审阅。 | Extraction、normalization、outline approval、deck planning、DSL generation、assembly 和 export 是分离的 gate。 |
| Output targets | HTML 很自然；PDF/PPTX 可能变成截图或二次转换。 | PPTX 很自然；丰富的浏览器演示能力通常受限。 | 同一份 DSL 可渲染 HTML preview/runtime、PDF 和可编辑 DrawingML PPTX。 |
| Validation before export | 主要依赖浏览器检查和人工 QA。 | 通常依赖生成的 PPTX 是否能正常打开。 | 在交付前进行 schema、边界、缺失资产、一致性和导出诊断检查。 |
| Animation and live delivery | 浏览器动画能力强，但静态 fallback 往往是临时处理。 | PowerPoint 动画可行，但 runtime 工具有限。 | Reveal steps、transitions、morphing、laser mode、presenter mode、whiteboard 和可预测的静态 fallback 都内置在工作流中。 |
| Revision model | 后续编辑容易偏离最初的生成 prompt。 | PowerPoint 编辑可能与源计划脱节。 | 修改 DSL 并重新构建，HTML、PDF 和 PPTX 会保持一致。 |

## Gallery

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/assets/animation.gif" alt="Runtime animation support" width="100%">
      <br>
      <strong>Runtime animation</strong>
    </td>
    <td width="50%" align="center">
      <img src="./docs/assets/katex-morphing.gif" alt="KaTeX formula morphing" width="100%">
      <br>
      <strong>KaTeX morphing and 3D plot support</strong>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/assets/utility_tool.gif" alt="Utility tool support" width="100%">
      <br>
      <strong>Utility tool support</strong>
    </td>
    <td width="50%" align="center">
      <img src="./docs/assets/ascii.gif" alt="ASCII terminal visual effect" width="100%">
      <br>
      <strong>Runtime visual effects with Three.js</strong>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/assets/image%20export%20support.png" alt="Image-aware export support in PPTX" width="100%">
      <br>
      <strong>Image-aware PPTX export</strong>
    </td>
    <td width="50%" align="center">
      <img src="./docs/assets/token_usage.png" alt="Token usage and workflow support" width="100%">
      <br>
      <strong>495k token usage after a 7-round interview to create 24-slide HTML and PPTX outputs</strong>
    </td>
  </tr>
</table>

## 功能特性

- **DSL first**：JSON deck DSL 是耐久的唯一可信源。
- **面向内容生产**：gated workflow 支持 source extraction、normalized materials、outline approval、deck planning、slide DSL、assembly 和 build。
- **不手工维护生成后的 HTML**：生成的 HTML 是 preview/export 输出，不是你需要手工维护的源文件。
- **丰富的自定义能力**：typed elements、layouts、charts、tables、formulas、themes、CSS themes、custom FX、runtime extensions、Three.js/WebGL modules，以及带导出 fallback 的受控 `customHtml` escape hatch。
- **多种输出格式**：交互式 HTML、PDF 和可编辑 PPTX。
- **现场演示模式**：laser pointer（`L`）、presenter mode（`S`）、whiteboard（`W`）和用于后期审阅的 editable mode（`E`）。
- **动画支持**：click steps、timeline effects、slide transitions、shape morphing、component morphing、reduced-motion handling 和 export diagnostics。
- **Agent-friendly workflow**：持久化 project artifacts，让 deck 生产更容易审阅、恢复、拆分和重建。

## Workflow Pipeline

对于 document-to-slide 项目，Maliang Deck 使用 gated workflow：

```text
init -> extract -> normalize -> outline -> approve-outline -> plan-deck -> generate-dsl -> assemble -> build
```

最重要的规则是：只有在 outline 被批准之后，才生成 slide DSL。

## Quick Start

### Prerequisites

- Node.js 18 或更新版本
- pnpm
- Python 3.10 或更新版本，用于 PDF/PPTX export bridges
- 可选：Docling，用于本地文档抽取
- 可选：MinerU credentials，用于 live MinerU extraction workflows（需要把 `.env.example` 重命名为 `.env` 并填写 keys）

安装 JavaScript 依赖并构建 workspace：

```bash
pnpm install
pnpm -r build
```

安装 Python 导出依赖：

```bash
pip install cairosvg pypdf python-pptx
```

如果你的环境中 CairoSVG 不可用，安装 fallback renderer：

```bash
pip install svglib reportlab
```

可选的本地文档抽取工具：

```bash
pip install docling
```

### Start with an interview

```text
cd path/to/repo
// 启动 agent CLI，并按照提示创建新的 deck project
User: I have some materials in ./path/to/materials and I want to create a deck about XYZ topic. Can you help me with that? Please keep asking me questions to clarify the intent before you start.
// agent 会先阅读本仓库文档，理解工作流和能力，然后向你提出澄清问题，再生成可供批准的 outline 和 slide DSL。你可以在 assembly 和 export 之前审阅并修改 outline 与 DSL。
```

下图展示了 interview workflow：agent 首先阅读文档以理解工作流和能力，然后提出澄清问题来收集需求，生成 outline 供用户批准，最后产出用于 assembly 和 export 的 slide DSL。

<img src="./docs/assets/interview_workflow.png" alt="workflow illustration" width="220" />

### Preview A Deck in HTML

```bash
pnpm serve examples/dreamy-blur-physics/deck.json
# 打开命令输出的 URL，即可在浏览器中预览 deck
# 也可以用下面的命令指定自定义端口
node packages/cli/dist/index.js serve path/to/deck.json --port 3004
```

preview server 默认绑定到 `127.0.0.1:3000`，并打印本地访问 URL。

### Export A Deck

```bash
pnpm export examples/dreamy-blur-physics/deck.json out.pdf --format pdf
pnpm export examples/dreamy-blur-physics/deck.json out.pptx --format pptx
pnpm export examples/dreamy-blur-physics/deck.json out-html --format html
```

导出可编辑 HTML：

```bash
pnpm export examples/dreamy-blur-physics/deck.json out-html --format html --html-mode editable
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Workflow](./docs/WORKFLOW.md)
- [Authoring](./docs/AUTHORING.md)
- [Configuration](./docs/CONFIGURATION.md)
- [Template Extraction](./docs/TEMPLATE-EXTRACTION.md)
- [Animation and Runtime Extensions](./assets/ANIMATIONS.md)
- [Agent Guidance](./docs/agent-guidance/README.md)
- [Project Status](./docs/PROJECT-STATUS.md)

## Repository Structure

```text
packages/
  schema/          typed deck DSL and validation
  renderer-html/   interactive HTML renderer
  renderer-svg/    static SVG renderer for PDF/PPTX paths
  exporter/        HTML/PDF/PPTX export orchestration
  workflow/        project workflow, extraction, planning, assembly, build
  cli/             command-line interface
  authoring/       compile-time authoring helpers
  text-measure/    font metrics, wrapping, and reflow helpers

assets/            themes, animations, FX, runtime extensions
runtime/           browser presentation runtime
python/            PDF and DrawingML PPTX export bridges
docs/              architecture, workflow, authoring, configuration
examples/          example decks
projects/          workflow project workspace
```

## Contributing

欢迎符合 DSL-first 架构方向的贡献。请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，了解可接受的贡献类型、PR 要求和本地检查。

## Security

为了保护用户安全，请不要在公开 issue 中披露安全问题。请查看 [SECURITY.md](./SECURITY.md) 了解报告流程和范围。

## License

Maliang Deck 使用 dual-license 模型：

- 社区路径采用 AGPL-3.0-or-later 开源许可；
- 对于需要 proprietary modifications、private redistribution、hosted-service terms、enterprise deployment、support 或 custom feature development 的团队，提供商业许可。

完整 AGPL 文本见 [LICENSE](./LICENSE)，授权概览见 [DUAL-LICENSE.md](./DUAL-LICENSE.md)，商业授权路径见 [COMMERCIAL.md](./COMMERCIAL.md)，品牌使用规则见 [TRADEMARKS.md](./TRADEMARKS.md)。

## Sponsor And Support

Maliang Deck 目前主要由 [Jeffey Chou](https://github.com/JeffeyChou/zccl) 构建和维护。如果它对你有价值，欢迎赞助项目，或联系获取付费支持与定制开发。

```text
jiefeng.zhou37@gmail.com
```

**Individual support**

如果 Maliang Deck 对你的工作有帮助，欢迎赞助以支持持续开发和维护。任何金额都能帮助项目继续前进并保持免费。

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/jiefengzhou)

<img src="./docs/assets/alipay.png" alt="Alipay QR Code" width="220" />

## Acknowledgments

Maliang Deck 受益于许多开源项目的理念、参考和生态工作。

- [reveal.js](https://revealjs.com/) 帮助建立了现代 browser-based presentation runtime 模式。
- [Three.js](https://threejs.org/) 支撑了浏览器 3D 可视化生态，Maliang Deck 基于它构建交互式 plots 和 models。
- [PPT Master](https://github.com/hugohe3/ppt-master) 启发了 DrawingML PPTX exporter 方向和 native-editable PowerPoint workflow 目标。
- [KaTeX](https://katex.org/) 为快速数学公式渲染提供了实用基础。
- [Zod](https://zod.dev/) 支持 DSL 使用的 typed validation model。
- [Vite](https://vite.dev/)、[TypeScript](https://www.typescriptlang.org/) 和 [Vitest](https://vitest.dev/) 支撑开发工具链。
- [Hand-written like brush](https://www.cnblogs.com/zl03jsj/p/8051912.html) 启发了 laser mode 和 whiteboard mode 中的 "hand-drawn" brush style。
