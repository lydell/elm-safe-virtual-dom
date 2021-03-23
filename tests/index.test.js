/* global Elm */
require("./compiled/KitchenSink.js");

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

class BrowserElement {
  constructor(elmModule, options) {
    this._records = [];

    this._wrapper = document.createElement("div");
    this._wrapper.append(options.node);

    this._mutationObserver = new MutationObserver((records) => {
      this._records.push(...records.flatMap(recordToString));
    });
    this._mutationObserver.observe(this._wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });

    elmModule.init(options);
  }

  querySelector(selector) {
    return this._wrapper.firstChild.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._wrapper.firstChild.querySelectorAll(selector);
  }

  serialize() {
    const string =
      this._records.length === 0
        ? this._wrapper.innerHTML
        : this._records.concat("", this._wrapper.innerHTML).join("\n");

    this._records.length = 0;

    return string;
  }
}

expect.addSnapshotSerializer({
  test: (value) => value instanceof BrowserElement,
  print: (value) => value.serialize(),
});

test("first", async () => {
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
