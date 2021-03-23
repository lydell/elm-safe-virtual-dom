require("./compiled/KitchenSink.js");

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

function transformRecord(record) {
  const id = record.target.localName;

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
          ? ["AttrAdded", id, name, value]
          : value === null
          ? ["AttrRemoved", id, name, record.oldValue]
          : ["AttrChanged", id, name, record.oldValue, value],
      ];
    }

    case "characterData":
      return [["TextUpdated", record.oldValue, record.target.data]];

    case "childList":
      return [
        ...Array.from(record.addedNodes, (node) => [
          "NodeAdded",
          id,
          node.localName,
        ]),
        ...Array.from(record.removedNodes, (node) => [
          "NodeRemoved",
          id,
          node.localName,
        ]),
      ];
  }
}

class AllRecords {
  constructor() {
    this.records = [];
  }

  serialize() {
    return this.records
      .map(([first, ...rest]) =>
        [first, ...rest.map((item) => JSON.stringify(item))].join(" ")
      )
      .join("\n");
  }
}

expect.addSnapshotSerializer({
  test: (value) => value instanceof AllRecords,
  print: (value) => value.serialize(),
});

test("first", async () => {
  const node = document.createElement("div");
  document.body.appendChild(node);
  window.Elm.KitchenSink.init({ node });
  const allRecords = new AllRecords();
  const mutationObserver = new MutationObserver((records) => {
    allRecords.records.push(...records.flatMap(transformRecord));
  });
  mutationObserver.observe(node, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
  });

  expect(node.outerHTML).toMatchInlineSnapshot(
    `"<div>modelInitialValue2<button>Next</button></div>"`
  );

  document.querySelector("button").click();
  await nextFrame();

  expect(node.outerHTML).toMatchInlineSnapshot(
    `"<div>Updated<button>Next</button></div>"`
  );

  expect(allRecords).toMatchInlineSnapshot(
    `TextUpdated "modelInitialValue2" "Updated"`
  );
});
