#!/usr/bin/env node
const fs = require("fs");
const runReplacements = require(".");

function run(argv) {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(help());
    process.exit(0);
  }

  if (argv.length > 1) {
    console.error(`Expected one argument, but got ${argv.length}.`);
    process.exit(1);
  }

  const [file] = argv;

  try {
    overwrite(file, runReplacements);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log("Success!");
}

function overwrite(file, transform) {
  fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}

function help() {
  return `
Usage: elm-safe-virtual-dom path/to/elm/output.js

path/to/elm/output.js:

- Should contain the output of \`elm make\`.
- Should NOT be minified.
- The Elm code should use \`import Browser\`.

This tool overwrites the file, changing parts of the JavaScript code.
`.trimStart();
}

run(process.argv.slice(2));
