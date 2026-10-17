// Node resolve hooks so `node --test` can load the app's source as-is:
// maps the "@/..." alias (jsconfig.json) to src/ and resolves the
// extensionless / directory imports that Next.js allows.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

const withExtension = (file) => {
  for (const candidate of [file, `${file}.js`, path.join(file, 'index.js')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  let target = null;
  if (specifier.startsWith('@/')) {
    target = withExtension(path.join(SRC, specifier.slice(2)));
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(SRC)) target = withExtension(path.resolve(path.dirname(parent), specifier));
  }
  if (target) return nextResolve(pathToFileURL(target).href, context);
  return nextResolve(specifier, context);
}
