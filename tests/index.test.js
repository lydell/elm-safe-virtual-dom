/* global Elm */

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const runReplacements = require("..");

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

function nodeId(node) {
  return node.localName !== undefined
    ? `<${node.localName}>`
    : `${node.nodeName} ${JSON.stringify(node.data)}`;
}

function recordToString(record) {
  const id = nodeId(record.target);

  switch (record.type) {
    case "attributes": {
      const name =
        record.attributeNamespace === null
          ? record.attributeName
          : `${record.attributeNamespace}:${record.attributeName}`;
      const value = record.target.getAttributeNS(
        record.attributeNamespace,
        record.attributeName
      );
      return [
        record.oldValue === null
          ? `AttrAdded ${id} ${name} ${JSON.stringify(value)}`
          : value === null
          ? `AttrRemoved ${id} ${name} ${JSON.stringify(record.oldValue)}`
          : `AttrChanged ${id} ${name} ${JSON.stringify(
              record.oldValue
            )} 🔀 ${JSON.stringify(value)}`,
      ];
    }

    case "characterData":
      return [
        `TextUpdated ${JSON.stringify(record.oldValue)} 🔀️ ${JSON.stringify(
          record.target.data
        )}`,
      ];

    case "childList":
      return [
        ...Array.from(
          record.addedNodes,
          (node) => `NodeAdded ${id} ⤵️ ${nodeId(node)}`
        ),
        ...Array.from(
          record.removedNodes,
          (node) => `NodeRemoved ${id} ⤵️ ${nodeId(node)}`
        ),
      ];
  }
}

class BrowserBase {
  constructor() {
    this._records = [];
  }

  _setupMutationObserver(node) {
    this._mutationObserver = new MutationObserver((records) => {
      this._records.push(...records.flatMap(recordToString));
    });
    this._mutationObserver.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  serialize() {
    const string =
      this._records.length === 0
        ? this.html()
        : this._records.concat("", this.html()).join("\n");

    this._records.length = 0;

    return string;
  }
}

class BrowserElement extends BrowserBase {
  constructor(elmModule, options) {
    super();
    this._wrapper = document.createElement("div");
    this._wrapper.append(options.node);
    this._setupMutationObserver(this._wrapper);
    elmModule.init(options);
  }

  html() {
    return this._wrapper.innerHTML;
  }

  querySelector(selector) {
    return this._wrapper.firstChild.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._wrapper.firstChild.querySelectorAll(selector);
  }
}

class BrowserDocument extends BrowserBase {
  constructor(elmModule, options = undefined) {
    super();
    this._setupMutationObserver(document.body);
    elmModule.init(options);
  }

  html() {
    return document.body.outerHTML;
  }

  querySelector(selector) {
    return document.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return document.body.querySelectorAll(selector);
  }

  serialize() {
    return [window.location.href, document.title, "", super.serialize()].join(
      "\n"
    );
  }
}

expect.addSnapshotSerializer({
  test: (value) => value instanceof BrowserBase,
  print: (value) => value.serialize(),
});

beforeAll(() => {
  const baseDir = path.dirname(__dirname);
  const elmDir = path.join(baseDir, "tests", "elm");
  const files = fs.readdirSync(elmDir).map((file) => path.join(elmDir, file));
  const output = path.join(baseDir, "tests", "elm.js");
  const result = childProcess.spawnSync(
    "npx",
    ["elm", "make", ...files, "--output", output],
    {
      shell: true,
      cwd: baseDir,
      stdio: ["ignore", "ignore", "inherit"],
    }
  );
  if (result.status !== 0) {
    process.exit(result.status);
  }
  const code = fs.readFileSync(output, "utf8");
  const newCode = code
    .replace(/\(this\)\);\s*$/, "(window));")
    .replace(/console.warn\('[^']+'\);/, "");
  fs.writeFileSync(output, runReplacements(newCode));
  require(output);
}, 60 * 1000);

beforeEach(() => {
  while (document.body.firstChild) {
    document.body.firstChild.remove();
  }
  document.title = "";
  window.location.pathname = "/";
});

test("Browser.sandbox", async () => {
  const b = new BrowserElement(Elm.KitchenSink, {
    node: document.createElement("div"),
  });

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    NodeAdded <div> ⤵️ #text "modelInitialValue2"
    NodeAdded <div> ⤵️ <button>

    <div>modelInitialValue2<button>Next</button></div>
  `);

  b.querySelector("button").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    TextUpdated "modelInitialValue2" 🔀️ "Updated"

    <div>Updated<button>Next</button></div>
  `);
});

test("Browser.document", async () => {
  const b = new BrowserDocument(Elm.App);

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/
    Application Title

    NodeAdded <body> ⤵️ <div>

    <body><div>http://localhost/<a href="/test">link</a></div></body>
  `);

  b.querySelector("a").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/test
    Application Title

    TextUpdated "http://localhost/" 🔀️ "http://localhost/test"

    <body><div>http://localhost/test<a href="/test">link</a></div></body>
  `);
});
