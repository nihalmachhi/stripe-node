import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {expect} from 'chai';

// Every source map shipped in the npm package has to point at sources that
// are also in the package (or embed them). Otherwise tools like webpack's
// source-map-loader warn that the original files can't be found.

type SourceMap = {
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: Array<string | null>;
};

// Paths (relative to the repo root, using "/") that `npm pack` would publish.
const listPackedFiles = (): string[] => {
  const output = childProcess.execSync(
    'npm pack --dry-run --json --ignore-scripts',
    {cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}
  );
  const [pack] = JSON.parse(output) as Array<{files: Array<{path: string}>}>;
  return pack.files.map((file) => file.path);
};

// Sources a map refers to, as repo-root-relative paths, skipping any source
// the map embeds in `sourcesContent`.
const referencedSources = (mapFile: string): string[] => {
  const map: SourceMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const mapDir = path.posix.dirname(mapFile);

  return map.sources
    .filter((_, i) => !(map.sourcesContent && map.sourcesContent[i] != null))
    .map((source) =>
      path.posix.normalize(
        path.posix.join(mapDir, map.sourceRoot || '', source)
      )
    );
};

describe('package source maps', function() {
  // `npm pack --dry-run` takes a few seconds.
  this.timeout(30000);

  it('only reference sources that are included in the package', () => {
    const packedFiles = listPackedFiles();
    const mapFiles = packedFiles.filter((file) => file.endsWith('.map'));
    expect(mapFiles, 'no source maps found; was the package built?').to.not.be
      .empty;

    const packed = new Set(packedFiles);
    const missing: string[] = [];
    for (const mapFile of mapFiles) {
      for (const source of referencedSources(mapFile)) {
        if (!packed.has(source)) {
          missing.push(`${mapFile} -> ${source}`);
        }
      }
    }

    expect(
      missing,
      `source maps reference files that are not in the package:\n${missing
        .slice(0, 10)
        .join('\n')}`
    ).to.be.empty;
  });
});