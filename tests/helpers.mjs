import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

export function testModules() {
  const root = fileURLToPath(new URL('../.cache/', import.meta.url));
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(path.join(root, 'tests-'));
  return {
    compile(name, source) {
      const file = path.join(directory, name);
      const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText;
      writeFileSync(file, output);
      return pathToFileURL(file).href;
    },
    cleanup() { rmSync(directory, { recursive: true, force: true }); },
  };
}
