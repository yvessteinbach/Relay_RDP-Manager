import type { Config } from "@docusaurus/types";
import type { Options, ThemeConfig } from "@docusaurus/preset-classic";

const config: Config = {
  title: "Relay documentation",
  tagline: "Build and understand Relay",
  favicon: "img/favicon.svg",
  url: "https://example.invalid",
  baseUrl: "/",
  organizationName: "relay-rdp",
  projectName: "relay",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: undefined,
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: false,
      },
    },
    navbar: {
      title: "Relay",
      logo: {
        alt: "Relay mark",
        src: "img/relay.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "developerSidebar",
          position: "left",
          label: "Developer guide",
        },
        {
          to: "/project/status",
          label: "Project status",
          position: "left",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Start here",
          items: [
            { label: "Introduction", to: "/" },
            {
              label: "Development setup",
              to: "/getting-started/development-setup",
            },
          ],
        },
        {
          title: "Build Relay",
          items: [
            { label: "Architecture", to: "/architecture/overview" },
            { label: "Carbon rules", to: "/design/carbon-design-system" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "Status", to: "/project/status" },
            { label: "Security model", to: "/security/credential-model" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Relay contributors. Built with Docusaurus.`,
    },
    prism: {
      additionalLanguages: ["rust", "toml", "powershell"],
    },
  } satisfies ThemeConfig,
};

export default config;
