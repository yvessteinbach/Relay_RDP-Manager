import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  developerSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting started",
      collapsed: false,
      items: [
        "getting-started/development-setup",
        "getting-started/rdp-import-export",
      ],
    },
    {
      type: "category",
      label: "Architecture",
      collapsed: false,
      items: ["architecture/overview"],
    },
    {
      type: "category",
      label: "Design and interface",
      collapsed: false,
      items: ["design/carbon-design-system"],
    },
    {
      type: "category",
      label: "Security",
      collapsed: false,
      items: ["security/credential-model"],
    },
    {
      type: "category",
      label: "Contributing",
      collapsed: false,
      items: ["contributing/documentation"],
    },
    {
      type: "category",
      label: "Project",
      collapsed: false,
      items: ["project/status", "project/support-policy"],
    },
  ],
};

export default sidebars;
