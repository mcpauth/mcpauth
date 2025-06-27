import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  githubUrl: 'https://github.com/mcpauth/mcpauth',

  nav: {
    title: (
      <>
        <Image
          src="/icon.jpeg"
          alt="Logo"
          width={24}
          height={24}
          className="rounded-sm"
        />
        MCP Auth
      </>
    ),
  },
  // see https://fumadocs.dev/docs/ui/navigation/links
  links: [{ url: "/docs", text: "Docs" }],
};
