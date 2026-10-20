import { posix } from 'node:path';
import type { Violation } from '../repository.ts';
import { type FeatureLayout, featureLayoutProblem } from './feature-layout.ts';
import { type LayerModel, layerViolations, locateByFolder } from './layers.ts';

/**
 * What a non-component front-end file holds, written in its name: `session.api.ts`.
 * Components (`.tsx`) keep a plain name: `login-form.tsx`.
 */
export const FRONT_FILE_KINDS = [
  'api', // server calls, as an object: Session.signIn()
  'queries', // TanStack Query options and cache keys
  'model', // types, form schemas and mappings of a feature
  'util', // pure helpers
  'types', // type-only modules
  'constants', // static data
  'client', // configured clients: HTTP, query client
  'messages', // translation catalogs
] as const;

/**
 * Layout of a web feature: one folder per kind, nothing at the root but tests.
 * `component` stands for a plain `.tsx` file.
 */
export const WEB_FEATURE_LAYOUT: FeatureLayout = {
  api: ['api'],
  queries: ['queries'],
  components: ['component'],
  models: ['model'],
  utils: ['util'],
  constants: ['constants'],
};

const WEB_SRC = 'apps/web/src/';
const FRONT_SRC = /^(apps\/web|packages\/ui)\/src\//;
const TEST = /\.test\.tsx?$/;
/** Files allowed at the root of apps/web/src. */
const WEB_ROOT_FILES = new Set(['main.tsx', 'router.tsx', 'test-helpers.tsx', 'test-setup.ts']);
/** Package entry points and test setup keep their conventional names. */
const ENTRY_FILES = new Set(['index.ts', 'test-setup.ts']);

export function isFrontSource(path: string): boolean {
  return FRONT_SRC.test(path) && /\.tsx?$/.test(path);
}

/** Where a file belongs and how it is named; `null` when it follows the conventions. */
export function frontNamingProblem(path: string): string | null {
  const relative = path.replace(FRONT_SRC, '');
  const fileName = posix.basename(path);
  if (path.startsWith(WEB_SRC)) {
    const placement = webPlacementProblem(relative, fileName);
    if (placement !== undefined) {
      return placement;
    }
  }
  return kindProblem(fileName);
}

/** `undefined` when placement says nothing and the file kind decides. */
function webPlacementProblem(relative: string, fileName: string): string | null | undefined {
  if (!relative.includes('/')) {
    return WEB_ROOT_FILES.has(fileName)
      ? null
      : 'Put code in routes/, features/<feature>/ or shared/<area>/, not at the root of apps/web/src';
  }
  if (relative.startsWith('routes/')) {
    return routeProblem(relative, fileName);
  }
  if (!/^(features|shared)\/[^/]+\//.test(relative)) {
    return 'apps/web/src is organized in routes/, features/<feature>/ and shared/<area>/';
  }
  if (relative.startsWith('features/') && !TEST.test(fileName)) {
    return featureLayoutProblem(WEB_FEATURE_LAYOUT, relative.split('/').slice(2), kindOf(fileName));
  }
  return undefined;
}

/** `login-form.tsx` → `component`, `session.api.ts` → `api`, `x.route.tsx` → `route`. */
function kindOf(fileName: string): string {
  if (fileName.endsWith('.tsx')) {
    return /\.([a-z]+)\.tsx$/.exec(fileName)?.[1] ?? 'component';
  }
  return /\.([a-z]+)\.ts$/.exec(fileName)?.[1] ?? '';
}

/** The folder of a screen says whether it needs a session. */
function routeProblem(relative: string, fileName: string): string | null {
  if (relative === 'routes/root.route.tsx') {
    return null;
  }
  if (!/^routes\/(public|protected)\//.test(relative)) {
    return 'Screens live in routes/public/ (no session needed) or routes/protected/ (signed in)';
  }
  return TEST.test(fileName) || fileName.endsWith('.route.tsx')
    ? null
    : 'Screens in routes/ are named <screen>.route.tsx';
}

function kindProblem(fileName: string): string | null {
  if (TEST.test(fileName) || ENTRY_FILES.has(fileName) || fileName.endsWith('.tsx')) {
    return null;
  }
  const kind = /\.([a-z]+)\.ts$/.exec(fileName)?.[1] ?? '';
  return (FRONT_FILE_KINDS as readonly string[]).includes(kind)
    ? null
    : `Name non-component files <name>.<kind>.ts, with kind among: ${FRONT_FILE_KINDS.join(', ')}`;
}

/**
 * Screens compose features and shared code; `shared` never depends on features or screens;
 * a feature depends on `shared` and itself only.
 */
const WEB_LAYERS: LayerModel = {
  src: WEB_SRC,
  locate: (relativePath) => locateByFolder(relativePath, ['routes', 'features', 'shared']),
  mayImport(from, to) {
    switch (from.layer) {
      case 'routes':
        return to.layer !== 'root';
      case 'shared':
        return to.layer === 'shared';
      case 'features':
        return to.layer === 'shared' || (to.layer === 'features' && to.feature === from.feature);
      default:
        return true;
    }
  },
  messages: {
    routes: 'Screens cannot import the router or the entry point',
    shared: 'shared/ cannot import features or screens; pass them in as props instead',
    features: 'A feature imports shared/ and its own files only; move common code to shared/',
  },
};

export function frontLayerViolations(rule: string, path: string, source: string): Violation[] {
  return layerViolations(WEB_LAYERS, rule, path, source);
}
