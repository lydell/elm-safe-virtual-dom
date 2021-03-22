const fs = require("fs");
const path = require("path");
const { replacements, debuggerReplacements } = require("./patch");

function runReplacements(code) {
  if (!/^function _Browser_/m.test(code)) {
    throw new Error(
      `
Could not find \`function _Browser_\`.

Make sure that:,

- The Elm code has \`import Browser\`.
- The JavaScript code is NOT minified.
`.trim()
    );
  }

  const newCode = replacements.reduce(strictReplace, code);

  return code.includes("Compiled in DEBUG mode")
    ? debuggerReplacements.reduce(strictReplace, newCode)
    : newCode;
}

function strictReplace(code, [search, replacement, allow0matches = false]) {
  const parts = code.split(search);

  if (!allow0matches && parts.length <= 1) {
    const filePath = path.resolve("elm-virtual-dom-patch-error.txt");
    const content = replaceErrorMessage(search, replacement, code);
    try {
      fs.writeFileSync(filePath, content);
    } catch (error) {
      throw new Error(
        `Elm Virtual DOM patch: Code to replace was not found! Tried to write more info to ${filePath}, but got this error: ${error.message}`
      );
    }
    throw new Error(
      `Elm Virtual DOM patch: Code to replace was not found! More info written to ${filePath}`
    );
  }

  return typeof search === "string"
    ? parts.join(replacement)
    : code.replace(search, replacement);
}

function replaceErrorMessage(search, replacement, code) {
  return `
Patching Elm’s JS output to avoid virtual DOM errors caused by browser extensions failed!
This message is defined in the app/patches/ folder.

### Code to replace (not found!):
${search}

### Replacement:
${replacement}

### Input code:
${code}
`.trimStart();
}

module.exports = runReplacements;
