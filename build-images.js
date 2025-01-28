const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const baseDir = "images";

async function processImages() {
  const originalDirs = findOriginalDirectories(baseDir);

  let totalTasks = 0;
  let completedTasks = 0;
  const taskQueue = [];

  // Queue tasks only for images that need to be processed
  for (const dir of originalDirs) {
    const files = fs.readdirSync(dir).filter((file) => /\.(jpg|jpeg)$/i.test(file));

    for (const file of files) {
      const baseName = path.parse(file).name;
      const inputFile = path.join(dir, file);
      const inputStats = fs.statSync(inputFile);

      const outputDir = path.dirname(dir);
      const { resolutions, qualities, resizeByWidth } = getSettings(dir, file);

      for (const [i, resolution] of resolutions.entries()) {
        const suffix = `@${i + 1}x`;
        const outputFileJpg = path.join(outputDir, `${baseName}-${suffix}.jpg`);
        const outputFileWebp = path.join(outputDir, `${baseName}-${suffix}.webp`);

        if (!fs.existsSync(outputFileJpg) || fs.statSync(outputFileJpg).mtime < inputStats.mtime) {
          taskQueue.push({
            inputFile,
            outputFile: outputFileJpg,
            format: "jpeg",
            resolution,
            resizeByWidth,
            quality: qualities.jpgQuality,
          });
        }

        if (!fs.existsSync(outputFileWebp) || fs.statSync(outputFileWebp).mtime < inputStats.mtime) {
          taskQueue.push({
            inputFile,
            outputFile: outputFileWebp,
            format: "webp",
            resolution,
            resizeByWidth,
            quality: qualities.webpQuality,
          });
        }
      }
    }
  }

  totalTasks = taskQueue.length;

  for (const task of taskQueue) {
    const resizeOptions = getResizeOptions(task.resolution, task.resizeByWidth);

    if (task.format === "jpeg") {
      await sharp(task.inputFile).resize(resizeOptions).jpeg({ quality: task.quality }).toFile(task.outputFile);
    } else if (task.format === "webp") {
      await sharp(task.inputFile).resize(resizeOptions).webp({ quality: task.quality }).toFile(task.outputFile);
    }

    completedTasks++;
    logProgress(completedTasks, totalTasks, task.outputFile);
  }

  console.log("Image processing complete!");
}

function findOriginalDirectories(baseDir) {
  const result = [];

  function searchDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "original") {
          result.push(fullPath);
        } else {
          searchDirectory(fullPath);
        }
      }
    }
  }

  searchDirectory(baseDir);
  return result;
}

function getSettings(originalDir, fileName) {
  if (fileName === "wow-gladiator-achievement.jpg") {
    return {
      resolutions: [450, 900, 1350, 1800],
      qualities: { jpgQuality: 60, webpQuality: 60 },
      resizeByWidth: true,
    };
  } else if (originalDir.includes("spell-screenshots")) {
    return {
      resolutions: [300, 600, 900, 1200],
      qualities: { jpgQuality: 40, webpQuality: 40 },
      resizeByWidth: true,
    };
  } else if (originalDir.includes("content")) {
    return {
      resolutions: [250, 500, 750, 1000],
      qualities: { jpgQuality: 60, webpQuality: 60 },
      resizeByWidth: false,
    };
  } else {
    throw new Error(`Unknown settings for directory or file: ${originalDir}, ${fileName}`);
  }
}

function getResizeOptions(resolution, resizeByWidth) {
  return resizeByWidth ? { width: resolution } : { height: resolution };
}

function logProgress(completed, total, filePath) {
  const percentage = ((completed / total) * 100).toFixed(2);
  console.log(`[${percentage}%] Generated ${filePath}`);
}

processImages().catch((err) => console.error(err));
