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

function initElementChange() {
  return {
    addedNodes: [],
    removedNodes: [],
    addedAttributes: [],
    removedAttributes: [],
    changedAttributes: [],
  };
}

function stringify(node, records) {
  switch (node.nodeType) {
    // Text.
    case 3: {
      const change = records.get(node);
      return change === undefined
        ? JSON.stringify(node.data)
        : `${JSON.stringify(change.oldValue)}🔀${JSON.stringify(node.data)}`;
    }

    // Element.
    case 1: {
      const change = records.get(node) || initElementChange();
      return node.firstChild === null && change.removedNodes.length === 0
        ? `<${node.localName}${stringifyAttributes(node, change)}/>`
        : `<${node.localName}${stringifyAttributes(
            node,
            change
          )}>\n${stringifyChildren(node, change, records)}\n</${
            node.localName
          }>`;
    }

    // Other.
    default:
      return `${node.nodeName} ${JSON.stringify(node.data)}`;
  }
}

function stringifyAttributes(element, change) {
  const items = [
    ...Array.from(element.attributes, (attr) => {
      const changed = change.changedAttributes.find(
        (attr2) =>
          attr2.name === attr.name && attr2.namespaceURI === attr.namespaceURI
      );

      if (changed !== undefined) {
        return `${attrName(attr)}=${JSON.stringify(
          changed.oldValue
        )}🔀${JSON.stringify(attr.value)}`;
      }

      const string = `${attrName(attr)}=${JSON.stringify(attr.value)}`;
      const inserted = change.addedAttributes.some(
        (attr2) =>
          (attr2.name === attr.namattr2.name) === attr.name &&
          attr2.namespaceURI === attr.namespaceURIe
      );
      return inserted ? added(string) : string;
    }),
    ...change.removedAttributes.map((attr) =>
      removed(`${attrName(attr)}=${JSON.stringify(attr.oldValue)}`)
    ),
  ].map(indent);

  return items.length === 0 ? "" : `\n${items.join("\n")}\n`;
}

function attrName(attr) {
  return attr.namespaceURI === null
    ? attr.localName
    : `${attr.namespaceURI}:${attr.localName}`;
}

function stringifyChildren(element, change, records) {
  return [
    ...Array.from(element.childNodes, (node) =>
      change.addedNodes.includes(node)
        ? added(stringify(node, records))
        : stringify(node, records)
    ),
    ...change.removedNodes.map((node) => removed(stringify(node, records))),
  ]
    .map(indent)
    .join("\n");
}

function indent(string) {
  return string.replace(/^/gm, "  ");
}

function added(string) {
  return string.replace(/^/gm, "➕");
}

function removed(string) {
  return string.replace(/^/gm, "➖");
}

class BrowserBase {
  constructor() {
    this._records = new Map();
  }

  _setupMutationObserver(node) {
    this._mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        switch (record.type) {
          case "characterData":
            this._records.set(record.target, { oldValue: record.oldValue });
            break;

          case "attributes": {
            const prev =
              this._records.get(record.target) || initElementChange();
            const attr = {
              name: record.attributeName,
              namespaceURI: record.attributeNamespace,
              oldValue: record.oldValue,
            };
            const value = record.target.getAttributeNS(
              record.attributeNamespace,
              record.attributeName
            );
            if (record.oldValue === null) {
              prev.addedAttributes.push(attr);
            } else if (value === null) {
              prev.removedAttributes.push(attr);
            } else {
              prev.changedAttributes.push(attr);
            }
            this._records.set(record.target, prev);
            break;
          }

          case "childList": {
            const prev =
              this._records.get(record.target) || initElementChange();
            prev.addedNodes.push(...record.addedNodes);
            prev.removedNodes.push(...record.removedNodes);
            this._records.set(record.target, prev);
            break;
          }
        }
      }
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

  querySelector(selector) {
    return this._getRoot().firstChild.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._getRoot().firstChild.querySelectorAll(selector);
  }

  serialize() {
    const string = stringify(this._getRoot(), this._records);
    this._records.clear();
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

  _getRoot() {
    return this._wrapper;
  }
}

class BrowserDocument extends BrowserBase {
  constructor(elmModule, options = undefined) {
    super();
    this._setupMutationObserver(document.body);
    elmModule.init(options);
  }

  _getRoot() {
    return document.body;
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
    <div>
      <div>
        ➕"modelInitialValue2"
        ➕<button>
        ➕  "Next"
        ➕</button>
      </div>
    </div>
  `);

  b.querySelector("button").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    <div>
      <div>
        "modelInitialValue2"🔀"Updated"
        <button>
          "Next"
        </button>
      </div>
    </div>
  `);
});

test("Browser.document", async () => {
  const b = new BrowserDocument(Elm.App);

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/
    Application Title

    <body>
      ➕<div>
      ➕  "http://localhost/"
      ➕  <a
      ➕    href="/test"
      ➕  >
      ➕    "link"
      ➕  </a>
      ➕</div>
    </body>
  `);

  b.querySelector("a").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/test
    Application Title

    <body>
      <div>
        "http://localhost/"🔀"http://localhost/test"
        <a
          href="/test"🔀"/test"
        >
          "link"
        </a>
      </div>
    </body>
  `);
});
