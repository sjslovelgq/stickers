import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.env.STICKER_REPO_ROOT || process.cwd());
const STICKER_DIR = path.join(ROOT, 'stickers');
const CATALOG_PATH = path.join(ROOT, 'sticker-catalog.json');
const CATEGORY_PATH = path.join(ROOT, 'categories.json');
const IMAGE_BASE = process.env.IMAGE_BASE || '';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

async function readJson(file, fallback) {
  try {
    const content = (await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function walk(directory) {
  const result = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walk(absolute));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      result.push(absolute);
    }
  }
  return result;
}

function isAsciiId(value) {
  return /^[a-z0-9][a-z0-9_-]*$/i.test(value);
}

function parseFilename(filename, previous) {
  if (previous) {
    return {
      id: previous.id,
      name: previous.name
    };
  }

  const stem = path.basename(filename, path.extname(filename));
  const parts = stem.split('__').map((part) => part.trim()).filter(Boolean);

  // Both id__中文名.png and 中文名__id.png are supported.
  if (parts.length >= 2) {
    if (isAsciiId(parts[0])) {
      return { id: parts[0], name: parts.slice(1).join(' ') };
    }
    if (isAsciiId(parts[parts.length - 1])) {
      return {
        id: parts[parts.length - 1],
        name: parts.slice(0, -1).join(' ')
      };
    }
  }

  return { id: stem, name: stem };
}

function categoryInfo(relativeFile, previous, categoryConfig) {
  const segments = relativeFile.split('/');
  const folder = segments.length > 1 ? segments[0] : '';
  const id = folder || previous?.category || 'misc';
  const config = categoryConfig[id] || {};
  return {
    id,
    name: config.name || previous?.categoryName || id,
    order: Number.isFinite(config.order) ? config.order : 9999
  };
}

async function main() {
  const previousCatalog = await readJson(CATALOG_PATH, {
    imageBase: '',
    stickers: []
  });
  const categoryConfig = await readJson(CATEGORY_PATH, {});
  const previousRows = Array.isArray(previousCatalog.stickers)
    ? previousCatalog.stickers
    : [];
  const previousByFile = new Map(
    previousRows
      .filter((item) => item.file)
      .map((item) => [item.file, item])
  );
  const previousById = new Map(
    previousRows
      .filter((item) => item.id)
      .map((item) => [item.id, item])
  );

  const files = await walk(STICKER_DIR);
  const rows = files.map((absoluteFile) => {
    const relativeFile = toPosix(path.relative(STICKER_DIR, absoluteFile));
    const stem = path.basename(relativeFile, path.extname(relativeFile));
    const previous = previousByFile.get(relativeFile) || previousById.get(stem);
    const parsed = parseFilename(relativeFile, previous);
    const category = categoryInfo(relativeFile, previous, categoryConfig);

    return {
      id: parsed.id,
      name: parsed.name,
      category: category.id,
      categoryName: category.name,
      file: relativeFile,
      oldSort: Number.isFinite(previous?.sort) ? previous.sort : 999999,
      categoryOrder: category.order
    };
  });

  const duplicateIds = rows
    .map((item) => item.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length) {
    throw new Error(`Duplicate sticker ids: ${[...new Set(duplicateIds)].join(', ')}`);
  }

  rows.sort((a, b) => (
    a.categoryOrder - b.categoryOrder ||
    a.category.localeCompare(b.category, 'en') ||
    a.oldSort - b.oldSort ||
    a.file.localeCompare(b.file, 'zh-CN')
  ));

  const stickers = rows.map((item, sort) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    categoryName: item.categoryName,
    file: item.file,
    sort
  }));

  const catalog = {
    imageBase: IMAGE_BASE || previousCatalog.imageBase || '',
    updatedAt: new Date().toISOString(),
    stickers
  };

  await fs.writeFile(
    CATALOG_PATH,
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf8'
  );

  console.log(`Generated ${stickers.length} stickers from ${files.length} image files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
