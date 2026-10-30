import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const script = await Bun.file("scripts/generate-qwen-variants.ts").text()

describe("generate-qwen-variants script", () => {
  test("defines all four reasoning levels", () => {
    expect(script).toContain('["none", "low", "medium", "xhigh"]')
  })

  test("supports in-place and force modes", () => {
    expect(script).toContain('"in-place"')
    expect(script).toContain('"force"')
  })

  test("updates explicit modelID values", () => {
    expect(script).toContain("entry.modelID = id")
  })

  test("recognizes the legacy renderer model", () => {
    expect(script).toContain(
      'return /^qwen3\\.8(?::|-legacy-renderer:)/i.test(modelId)',
    )
  })
    test("generates all four variants for the legacy renderer model", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "qwen-variants-test-"))
    const inputPath = join(tempDir, "opencode.json")
    const outputPath = join(tempDir, "opencode.generated.json")

    try {
      const config = {
        provider: {
          ollama: {
            models: {
              "qwen3.8-legacy-renderer:27b": {
                name: "Qwen3.8 Legacy Renderer 27B",
              },
            },
          },
        },
      }

      writeFileSync(inputPath, JSON.stringify(config, null, 2))

      const result = Bun.spawnSync(
        [
          "bun",
          "run",
          "scripts/generate-qwen-variants.ts",
          "--input",
          inputPath,
          "--output",
          outputPath,
          "--model",
          "qwen3.8-legacy-renderer:27b",
        ],
        {
          cwd: process.cwd(),
          stdout: "pipe",
          stderr: "pipe",
        },
      )

      expect(result.exitCode).toBe(0)

      const generated = JSON.parse(readFileSync(outputPath, "utf8"))
      const models = generated.provider.ollama.models

      for (const effort of ["none", "low", "medium", "xhigh"]) {
        const id = `qwen3.8-legacy-renderer:27b-effort-${effort}`

        expect(models[id]).toBeDefined()
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
