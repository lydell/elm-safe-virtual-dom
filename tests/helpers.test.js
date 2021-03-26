const {
  BrowserDocument,
  cleanupDocument,
  domSnapshotSerializer,
  nextFrame,
} = require("./helpers");

class FakeElmModule {
  constructor() {
    this.f1 = () => {};
    this.f2 = () => {};
  }

  init() {
    // Text node.
    this.text1 = document.createTextNode(
      'Some "cool" text with trailing spaces   '
    );
    document.body.append(this.text1);

    // Another text node in a row.
    this.text2 = document.createTextNode("text2");
    document.body.append(this.text2);

    // Element, with attributes and event listeners.
    this.div = document.createElement("div");
    this.div.id = "container";
    this.div.className = "mb4";
    this.div.setAttribute("data-value", "some value");
    this.div.addEventListener("click", this.f1);
    this.div.addEventListener("click", this.f2);
    this.div.addEventListener("click", this.f1, true);
    this.div.addEventListener("scroll", this.f1, {
      capture: true,
      passive: true,
      once: true,
    });
    document.body.append(this.div);

    // Empty element.
    document.body.append(document.createElement("input"));

    // Comment node.
    this.comment = document.createComment("comment");
    document.body.append(this.comment);

    // Other namespace.
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const svgText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    svgText.setAttributeNS(
      "http://www.w3.org/XML/1998/namespace",
      "xml:lang",
      "en-US"
    );
    svgText.append(document.createTextNode("Some English text."));
    this.svg.append(svgText);
    document.body.append(this.svg);
  }

  next() {
    // Change text.
    this.text1.data = "Some new text";

    // Unnecessary text change.
    this.text2.data = "text2";

    // Remove attribute.
    this.div.removeAttribute("id");

    // Change attribute.
    this.div.className += " pb8";

    // Unnecessary attribute change.
    this.div.setAttribute("data-value", "some value");

    // Add attribute.
    this.div.setAttribute("title", "Title text");

    // Remove event listener.
    this.div.removeEventListener("click", this.f1, { capture: false });

    // Change event listener.
    this.div.addEventListener("scroll", this.f1, {
      capture: true,
      passive: false,
    });

    // Unnecessary add event listener.
    this.div.addEventListener("click", this.f2, false);

    // Remove comment.
    this.comment.remove();

    // Remove element.
    this.svg.remove();

    // Add element.
    const span = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = "Text";
    span.append(b);
    this.div.append(span);
  }
}

expect.addSnapshotSerializer(domSnapshotSerializer);

beforeEach(() => {
  cleanupDocument();
});

test("all the things", async () => {
  const m = new FakeElmModule();
  const b = new BrowserDocument(m);

  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/
    ""

    <body>
      ➕"Some \\"cool\\" text with trailing spaces   "
      ➕"text2"
      ➕<div
      ➕  id="container"
      ➕  class="mb4"
      ➕  data-value="some value"
      ➕  ➕on:click:capture
      ➕  ➕on:click
      ➕  ➕on:click
      ➕  ➕on:scroll:capture:once:passive
      ➕/>
      ➕<input/>
      ➕#comment "comment"
      ➕<http://www.w3.org/2000/svg:svg>
      ➕  <http://www.w3.org/2000/svg:text
      ➕    http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      ➕  >
      ➕    "Some English text."
      ➕  </text>
      ➕</svg>
    </body>
  `);

  m.next();
  await nextFrame();

  expect(b).toMatchInlineSnapshot(`
    http://localhost/
    ""

    <body>
      "Some \\"cool\\" text with trailing spaces   "🔀"Some new text"
      ️🚨"text2"🔀"text2"
      <div
        class="mb4"🔀"mb4 pb8"
        ️🚨data-value="some value"🔀"some value"
        ➕title="Title text"
        ➖id="container"
        on:click:capture
        ➖on:click
        ️🚨on:click
        on:scroll:capture:once:passive🔀on:scroll:capture
      >
        ➕<span>
        ➕  <b>
        ➕    "Text"
        ➕  </b>
        ➕</span>
      </div>
      <input/>
      ➖#comment "comment"
      ➖<http://www.w3.org/2000/svg:svg>
      ➖  <http://www.w3.org/2000/svg:text
      ➖    http://www.w3.org/XML/1998/namespace:xml:lang="en-US"
      ➖  >
      ➖    "Some English text."
      ➖  </text>
      ➖</svg>
    </body>
  `);

  await nextFrame();

  // No changes.
  expect(b).toMatchInlineSnapshot(`
    http://localhost/
    ""

    <body>
      "Some new text"
      "text2"
      <div
        class="mb4 pb8"
        data-value="some value"
        title="Title text"
        on:click:capture
        on:click
        on:scroll:capture
      >
        <span>
          <b>
            "Text"
          </b>
        </span>
      </div>
      <input/>
    </body>
  `);
});
