const fs = require("fs");
const path = require("path");

// Function to replace ".html" strings in a file
function replaceHtmlStringsInFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let updatedContent;

  if (filePath.endsWith(".html")) {
    // Replace `.html` with `/path` in HTML files
    updatedContent = content.replace(/([\w-]+)\.html/g, "/$1");
  } else if (filePath.endsWith(".js")) {
    // Replace `.html` with `path` (no slash) in JS files
    updatedContent = content.replace(/([\w-]+)\.html/g, "$1");
  }

  fs.writeFileSync(filePath, updatedContent, "utf8");
  console.log(`Processed: ${filePath}`);
}

// Function to process all .js and .html files in a directory recursively
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath); // Recurse into subdirectories
    } else if (file.endsWith(".js") || file.endsWith(".html")) {
      replaceHtmlStringsInFile(filePath);
    }
  });
}

// Define the directory you want to process (e.g., 'dist' or 'src')
const targetDirectory = path.resolve(__dirname, "dist");
processDirectory(targetDirectory);
console.log("Finished processing files.");
