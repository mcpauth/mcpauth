import CustomLink from "./custom-link"
import packageJSON from "@mcpauth/auth/package.json"

export default function Footer() {
  return (
    <footer className="mx-0 my-4 flex w-full flex-col gap-4 px-4 text-sm sm:mx-auto sm:my-12 sm:h-5 sm:max-w-3xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <CustomLink href="https://github.com/mcpauth/mcpauth">Documentation</CustomLink>
        <CustomLink href="https://www.npmjs.com/package/@mcpauth/auth">
          NPM
        </CustomLink>
        <CustomLink href="https://github.com/mcpauth/mcpauth">
          Source on GitHub
        </CustomLink>
        <CustomLink href="/policy">Policy</CustomLink>
      </div>
      <div className="flex items-center justify-start gap-2">
        <CustomLink href="https://www.npmjs.com/package/@mcpauth/auth">
          {packageJSON.version}
        </CustomLink>
      </div>
    </footer>
  )
}