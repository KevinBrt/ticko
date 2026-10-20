import type { Violation } from '../repository.ts';
import { relativeImports } from './imports.ts';

/** Where a file sits in an application: its layer, and its feature when it belongs to one. */
export interface Location {
  layer: string;
  feature: string;
}

/** The layers of one application (web or server) and which may import which. */
export interface LayerModel {
  /** Source root, e.g. `apps/server/src/`. */
  src: string;
  locate(relativePath: string): Location;
  mayImport(from: Location, to: Location): boolean;
  /** Explanation shown when a file of this layer imports something it should not. */
  messages: Readonly<Record<string, string>>;
}

const TEST = /\.test\.tsx?$/;

/** Imports crossing a forbidden boundary. Tests are exempt: they assemble the whole app. */
export function layerViolations(
  model: LayerModel,
  rule: string,
  path: string,
  source: string,
): Violation[] {
  if (!path.startsWith(model.src) || TEST.test(path)) {
    return [];
  }
  const from = model.locate(path.slice(model.src.length));
  return relativeImports(path, source).flatMap(({ line, target }) => {
    if (!target.startsWith(model.src)) {
      return [];
    }
    const to = model.locate(target.slice(model.src.length));
    if (model.mayImport(from, to)) {
      return [];
    }
    return [{ rule, file: path, line, message: model.messages[from.layer] ?? 'Layer violation' }];
  });
}

/** `features/session/x.ts` → `{ layer: 'features', feature: 'session' }`. */
export function locateByFolder(relativePath: string, layers: readonly string[]): Location {
  const [first = '', second = ''] = relativePath.split('/');
  if (!(layers.includes(first) && relativePath.includes('/'))) {
    return { layer: 'root', feature: '' };
  }
  return { layer: first, feature: first === 'features' ? second : '' };
}
