// Lets `node --test` run the kit's extensionless TypeScript imports ('./text-scale-core'), the form the apps'
// bundlers (Next, Metro, Vite) and tsc expect. Use: node --import ./design/text-size/test-resolve.mjs --test design/text-size/
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\\.[cm]?[jt]sx?$/.test(spec) && ctx.parentURL && ctx.parentURL.startsWith('file:')) {
    for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
      const u = new URL(spec + ext, ctx.parentURL);
      if (existsSync(fileURLToPath(u))) return next(u.href, ctx);
    }
  }
  return next(spec, ctx);
}`));
