# ai-blog

AI blog for publishing my deep ideas about AI.

## Astro Blog

```sh
npm create astro@latest -- --template blog
```

Features:

- Minimal styling
- 100/100 Lighthouse performance
- SEO-friendly with canonical URLs and Open Graph data
- Sitemap support
- RSS Feed support
- Markdown & MDX support

## Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

The `src/content/` directory contains related Markdown and MDX content collections.

## Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Builds production site to `./dist/`              |
| `npm run preview`         | Previews build locally                           |
| `npm run astro ...`       | Runs Astro CLI commands                          |
| `npm run astro -- --help` | Shows Astro CLI help                             |

## Credit

This theme is based on [Bear Blog](https://github.com/HermanMartinus/bearblog/).
