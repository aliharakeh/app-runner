import Handlebars from "handlebars"
import Prism from "prismjs"
import "prismjs/themes/prism-tomorrow.css"

import { getErrorMessage } from "@/components/workspace-dialogs"
import type { AppTemplateConfig } from "@/components/app-config/types"

(globalThis as typeof globalThis & { Prism?: typeof Prism }).Prism = Prism
await import("prismjs/components/prism-bash")
await import("prismjs/components/prism-json")
await import("prismjs/components/prism-yaml")
await import("prismjs/components/prism-jsx")
await import("prismjs/components/prism-typescript")
await import("prismjs/components/prism-tsx")

export function highlightTemplateContent(content: string, language: string) {
  const grammar = Prism.languages[language] ?? Prism.languages.markup
  return Prism.highlight(content, grammar, language)
}

export function renderGeneratedTemplate(
  template: AppTemplateConfig,
  values: Record<string, string>
) {
  try {
    const renderFilePath = Handlebars.compile(template.filePath, {
      noEscape: true,
    })
    const renderContent = Handlebars.compile(template.templateContent, {
      noEscape: true,
    })

    return {
      id: template.id,
      filePath: renderFilePath(values),
      content: renderContent(values),
      error: "",
    }
  } catch (error) {
    return {
      id: template.id,
      filePath: template.filePath,
      content: "",
      error: getErrorMessage(error),
    }
  }
}

export function getTemplateLanguage(name: string, content: string) {
  const normalizedName = name.toLowerCase()
  const trimmedContent = content.trimStart()

  if (normalizedName.endsWith(".tsx")) {
    return "tsx"
  }

  if (normalizedName.endsWith(".ts")) {
    return "typescript"
  }

  if (normalizedName.endsWith(".jsx")) {
    return "jsx"
  }

  if (normalizedName.endsWith(".js")) {
    return "javascript"
  }

  if (
    normalizedName.endsWith(".json") ||
    (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
    (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))
  ) {
    return "json"
  }

  if (normalizedName.endsWith(".yaml") || normalizedName.endsWith(".yml")) {
    return "yaml"
  }

  if (normalizedName.endsWith(".css")) {
    return "css"
  }

  if (
    normalizedName.endsWith(".html") ||
    normalizedName.endsWith(".xml") ||
    trimmedContent.startsWith("<")
  ) {
    return "markup"
  }

  return "bash"
}
