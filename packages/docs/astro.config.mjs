import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://rulestatus.com",
  integrations: [
    starlight({
      title: "Rulestatus",
      description:
        "ESLint for AI law. Executable compliance testing for the EU AI Act, ISO 42001, and NIST AI RMF.",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/rulestatus/rulestatus",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/rulestatus/rulestatus/edit/main/packages/docs/",
      },
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Quick Start", slug: "getting-started/quickstart" },
            { label: "Configuration", slug: "getting-started/configuration" },
            { label: "GitHub Actions", slug: "getting-started/github-actions" },
          ],
        },
        {
          label: "Frameworks",
          items: [
            { label: "EU AI Act", slug: "frameworks/eu-ai-act" },
            { label: "ISO/IEC 42001", slug: "frameworks/iso-42001" },
            { label: "NIST AI RMF", slug: "frameworks/nist-ai-rmf" },
          ],
        },
        {
          label: "CLI Reference",
          items: [
            { label: "Commands", slug: "reference/commands" },
            { label: "Configuration Schema", slug: "reference/config-schema" },
            { label: "Output Formats", slug: "reference/output-formats" },
          ],
        },
        {
          label: "Methodology",
          items: [
            { label: "How law becomes a test", slug: "methodology/overview" },
            { label: "Assertion IDs", slug: "methodology/assertion-ids" },
            { label: "Evidence model", slug: "methodology/evidence" },
          ],
        },
        {
          label: "Contributing",
          link: "https://github.com/rulestatus/rulestatus/blob/main/CONTRIBUTING.md",
          attrs: { target: "_blank" },
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://rulestatus.com/og.png",
          },
        },
      ],
    }),
  ],
});
