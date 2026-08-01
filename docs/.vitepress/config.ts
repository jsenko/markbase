import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'markbase',
  description: 'A markdown database — schema, index, query, and update markdown files',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'What is markbase?', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quickstart' },
          ],
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Data Model', link: '/guide/data-model' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Markdown Subset', link: '/guide/markdown-subset' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'CLI', link: '/reference/' },
            { text: 'REST API', link: '/reference/api' },
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'Schema', link: '/reference/schema' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jsenko/markbase' },
    ],
  },
});
