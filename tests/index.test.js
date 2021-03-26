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

test("All virtual DOM node types", async () => {
  const b = new BrowserElement(Elm.KitchenSink, {
    node: document.createElement("div"),
  });

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    <div>
      ➕"Text: 0"
      ➕<div
      ➕  class="class"
      ➕>
      ➕  "Element: 0"
      ➕</div>
      ➕<keygen/>
      ➕"Lazy (every other): 0"
      ➕<button
      ➕  id="num"
      ➕  ➕on:click:passive
      ➕>
      ➕  "map: 0"
      ➕</button>
      ➕<div
      ➕  id="markdown"
      ➕>
      ➕  <p>
      ➕    <em>
      ➕      "Markdown:"
      ➕    </em>
      ➕    " 0"
      ➕  </p>
      ➕  "\\n"
      ➕</div>
      ➕<http://www.w3.org/2000/svg:svg
      ➕  http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      ➕/>
      ➕<button
      ➕  style="outline: 1px solid red;"
      ➕  id="next"
      ➕  type="button"
      ➕  tabindex="1"
      ➕  ➕on:click:passive
      ➕>
      ➕  "Next"
      ➕</button>
    </div>
  `);

  b.querySelector("#next").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    <div>
      "Text: 0"🔀"Text: 1"
      <div
        class="class"
      >
        "Element: 0"🔀"Element: 1"
      </div>
      <keygen/>
      "Lazy (every other): 0"
      <button
        id="num"
        on:click:passive
      >
        "map: 0"🔀"map: 1"
      </button>
      <div
        id="markdown"
      >
        ➕<p>
        ➕  <em>
        ➕    "Markdown:"
        ➕  </em>
        ➕  " 1"
        ➕</p>
        ➕"\\n"
        ➖<p>
        ➖  <em>
        ➖    "Markdown:"
        ➖  </em>
        ➖  " 0"
        ➖</p>
        ➖"\\n"
      </div>
      <http://www.w3.org/2000/svg:svg
        http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      />
      <button
        style="outline: 1px solid red;"
        id="next"
        type="button"
        tabindex="1"
        on:click:passive
      >
        "Next"
      </button>
    </div>
  `);

  b.querySelector("#next").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    <div>
      "Text: 1"🔀"Text: 2"
      <div
        class="class"
      >
        "Element: 1"🔀"Element: 2"
      </div>
      <keygen/>
      "Lazy (every other): 0"🔀"Lazy (every other): 1"
      <button
        id="num"
        on:click:passive
      >
        "map: 1"🔀"map: 2"
      </button>
      <div
        id="markdown"
      >
        ➕<p>
        ➕  <em>
        ➕    "Markdown:"
        ➕  </em>
        ➕  " 2"
        ➕</p>
        ➕"\\n"
        ➖<p>
        ➖  <em>
        ➖    "Markdown:"
        ➖  </em>
        ➖  " 1"
        ➖</p>
        ➖"\\n"
      </div>
      <http://www.w3.org/2000/svg:svg
        http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      />
      <button
        style="outline: 1px solid red;"
        id="next"
        type="button"
        tabindex="1"
        on:click:passive
      >
        "Next"
      </button>
    </div>
  `);

  b.querySelector("#num").click();

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    <div>
      "Text: 2"🔀"Text: 101"
      <div
        class="class"
      >
        "Element: 2"🔀"Element: 101"
      </div>
      <keygen/>
      "Lazy (every other): 1"🔀"Lazy (every other): 50"
      <button
        id="num"
        on:click:passive
      >
        "map: 2"🔀"map: 101"
      </button>
      <div
        id="markdown"
      >
        ➕<p>
        ➕  <em>
        ➕    "Markdown:"
        ➕  </em>
        ➕  " 101"
        ➕</p>
        ➕"\\n"
        ➖<p>
        ➖  <em>
        ➖    "Markdown:"
        ➖  </em>
        ➖  " 2"
        ➖</p>
        ➖"\\n"
      </div>
      <http://www.w3.org/2000/svg:svg
        http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      />
      <button
        style="outline: 1px solid red;"
        id="next"
        type="button"
        tabindex="1"
        on:click:passive
      >
        "Next"
      </button>
    </div>
  `);
});

test("Browser.application", async () => {
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

  test("without virtualization", async () => {
    document.body.innerHTML = html;
    const b = new BrowserDocument(Elm.App);

    await nextFrame();

    expect(b).toMatchInlineSnapshot(`
      http://localhost/
      "Application Title"

      <body>
        <div>
          "http://localhost/"
          <a
            href="/test"
          >
            "link"
          </a>
        </div>
        <script/>
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

    b.querySelectorAll("a")[1].click();

    await nextFrame();

    expect(b).toMatchInlineSnapshot(`
      http://localhost/test
      "Application Title"

      <body>
        <div>
          "http://localhost/"
          <a
            href="/test"
          >
            "link"
          </a>
        </div>
        <script/>
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
});
