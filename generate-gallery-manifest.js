// One-off/rerunnable script: scans gallery/<subitemFolder>/<groupFolder>/*
// and writes gallery-manifest.json describing, per subitem folder, the
// ordered list of group folders (title = folder name minus its leading
// "NN " index) and the image filenames inside each group.
//
// Run with: node generate-gallery-manifest.js

const fs = require("fs");
const path = require("path");

const galleryDir = path.join(__dirname, "gallery");
const outFile = path.join(__dirname, "gallery-manifest.json");

const IMAGE_EXT = /\.(png|jpe?g|gif|mp4)$/i;

function isVisible(name) {
  return !name.startsWith(".");
}

const manifest = {};

const subitemFolders = fs
  .readdirSync(galleryDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && isVisible(d.name))
  .map((d) => d.name)
  .sort();

for (const subitemFolder of subitemFolders) {
  const subitemPath = path.join(galleryDir, subitemFolder);

  const groupFolders = fs
    .readdirSync(subitemPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isVisible(d.name))
    .map((d) => d.name)
    .sort();

  const groups = groupFolders.map((groupFolder) => {
    const title = groupFolder.replace(/^\d+\s+/, "");
    const groupPath = path.join(subitemPath, groupFolder);
    const images = fs
      .readdirSync(groupPath, { withFileTypes: true })
      .filter((f) => f.isFile() && isVisible(f.name) && IMAGE_EXT.test(f.name))
      .map((f) => f.name)
      .sort();

    return { folder: groupFolder, title, images };
  });

  manifest[subitemFolder] = groups;
}

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${outFile} (${subitemFolders.length} subitem folders)`);
