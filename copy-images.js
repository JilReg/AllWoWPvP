const fs = require("fs");
const path = require("path");

// Define source directories and corresponding dist folders
const directories = [
  { src: "images/blizzard/class-icons", dest: "dist/images/blizzard/class-icons" },
  { src: "images/blizzard/content", dest: "dist/images/blizzard/content" },
  { src: "images/blizzard/spell-category-icons", dest: "dist/images/blizzard/spell-category-icons" },
  { src: "images/blizzard/spell-icons", dest: "dist/images/blizzard/spell-icons" },
  { src: "images/blizzard/spell-screenshots", dest: "dist/images/blizzard/spell-screenshots" },
  { src: "images/google", dest: "dist/images/google" },
  { src: "images/meta", dest: "dist/images/meta" },
  { src: "images/misc", dest: "dist/images/misc" },
];

// Function to copy files only if they are new or updated
function copyIfUpdated(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  let copied = 0,
    skipped = 0,
    updated = 0;

  files.forEach((file) => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    // Only process files, not subdirectories
    if (fs.statSync(srcFile).isFile()) {
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied: ${srcFile} → ${destFile}`);
        copied++;
      } else if (fs.statSync(srcFile).mtime > fs.statSync(destFile).mtime) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Updated: ${srcFile} → ${destFile}`);
        updated++;
      } else {
        console.log(`Skipped (up-to-date): ${destFile}`);
        skipped++;
      }
    }
  });

  return { copied, skipped, updated };
}

// Process each directory and summarize results
let grandTotal = { copied: 0, skipped: 0, updated: 0 };

directories.forEach((dir) => {
  console.log(`\nProcessing directory: ${dir.src}`);
  const result = copyIfUpdated(dir.src, dir.dest);
  console.log(`Summary for ${dir.src}:`);
  console.log(`- Files Copied: ${result.copied}`);
  console.log(`- Files Updated: ${result.updated}`);
  console.log(`- Files Skipped: ${result.skipped}`);

  // Accumulate totals
  grandTotal.copied += result.copied;
  grandTotal.skipped += result.skipped;
  grandTotal.updated += result.updated;
});

// Print grand total summary
console.log("\n==== Overall Summary ====");
console.log(`Total Files Copied: ${grandTotal.copied}`);
console.log(`Total Files Updated: ${grandTotal.updated}`);
console.log(`Total Files Skipped: ${grandTotal.skipped}`);
console.log("Image copying complete!");
