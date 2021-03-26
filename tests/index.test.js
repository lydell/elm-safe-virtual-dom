/* global Elm */

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const runReplacements = require("..");
const {
  BrowserDocument,
  BrowserElement,
  cleanupDocument,
  domSnapshotSerializer,
  nextFrame,
} = require("./helpers");

expect.addSnapshotSerializer(domSnapshotSerializer);

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
  cleanupDocument();
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
        ➕<button
        ➕  ➕on:click:passive
        ➕>
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
        <button
          on:click:passive
        >
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
    "Application Title"

    <body>
      ➕<div>
      ➕  "http://localhost/"
      ➕  <a
      ➕    href="/test"
      ➕    ➕on:click
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
    "Application Title"

    <body>
      <div>
        "http://localhost/"🔀"http://localhost/test"
        <a
          href="/test"
          on:click
        >
          "link"
        </a>
      </div>
    </body>
  `);
});

describe("virtualize", () => {
  const html = `<div>http://localhost/<a href="/test">link</a></div><script></script>`;
  const virtualize = (node) => node.localName !== "script";

  test("with virtualization", async () => {
    document.body.innerHTML = html;
    const b = new BrowserDocument(Elm.App, { virtualize });

    await nextFrame();

    expect(b).toMatchInlineSnapshot(`
      http://localhost/
      "Application Title"

      <body>
        <div>
          "http://localhost/"
          <a
            href="/test"
            ➕on:click
          >
            "link"
          </a>
        </div>
        <script/>
      </body>
    `);

    b.querySelector("a").click();

    await nextFrame();

    expect(b).toMatchInlineSnapshot(`
      http://localhost/test
      "Application Title"

      <body>
        <div>
          "http://localhost/"🔀"http://localhost/test"
          <a
            href="/test"
            on:click
          >
            "link"
          </a>
        </div>
        <script/>
      </body>
    `);
  });
});
