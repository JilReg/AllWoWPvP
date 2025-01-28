const fs = require("fs");

// Define the input and output files for each HTML file
const files = [
  { inputFile: "src/index.html", outputFile: "dist/index.html" },
  { inputFile: "src/learn.html", outputFile: "dist/learn.html" },
  { inputFile: "src/legal.html", outputFile: "dist/legal.html" },
  { inputFile: "src/spells.html", outputFile: "dist/spells.html" },
];

files.forEach(({ inputFile, outputFile }) => {
  try {
    // Read the HTML file
    let html = fs.readFileSync(inputFile, "utf-8");

    // Replace non-minified paths with minified ones
    html = html.replace("style.css", "style.min.css");
    html = html.replace("main.js", "main.min.js");

    // Write the updated HTML to the output file
    fs.writeFileSync(outputFile, html, "utf-8");
    console.log(`Updated ${outputFile} for production.`);
  } catch (error) {
    console.error(`Failed to process ${inputFile}:`, error);
  }
});
