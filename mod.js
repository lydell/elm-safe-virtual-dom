const fs = require("fs");

const file = process.argv[2];

fs.writeFileSync(file, patch(fs.readFileSync(file, "utf8")));

function patch(code) {
  return code
    .replace(
      `var bodyNode = _VirtualDom_doc.body;`,
      `var domNodes = [], vNodes = [], domNodesToRemove = [];`
    )
    .replace(
      `var currNode = _VirtualDom_virtualize(bodyNode);`,
      `var mutationObserver = new MutationObserver(${observe.toString()});`
    )
    .replace(`var doc = view(model);`, `$& console.log(doc);`)
    .replace(
      /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(([^()]+)\).+\n.+\n.+\n[ \t]*currNode = nextNode;/,
      `(${patcher.toString()})($1);`
    );
}

function patcher(body) {
  var domNode, exists, index, length, nextDomNode, patches, vNode;
  mutationObserver.disconnect();
  console.log(domNodesToRemove);
  for (index = 0; index < domNodesToRemove.length; index++) {
    domNode = domNodesToRemove[index];
    if (domNode.parentNode === _VirtualDom_doc.body) {
      domNode.parentNode.removeChild(domNode);
    }
  }
  domNodesToRemove.length = 0;
  for (
    index = 0;
    body.b;
    body = body.b, index++ // WHILE_CONS
  ) {
    exists = index < domNodes.length;
    if (exists) {
      domNode = domNodes[index];
      vNode = vNodes[index];
      if (domNode.parentNode !== _VirtualDom_doc.body) {
        exists = false;
      }
    }
    if (!exists) {
      domNode = document.createElement("div");
      vNode = _VirtualDom_virtualize(domNode);
      _VirtualDom_doc.body.insertBefore(
        domNode,
        nextDomNode === undefined
          ? _VirtualDom_doc.body.firstChild
          : nextDomNode.nextSibling
      );
    }
    patches = _VirtualDom_diff(vNode, body.a);
    nextDomNode = _VirtualDom_applyPatches(domNode, vNode, patches, sendToApp);
    domNodes[index] = nextDomNode;
    vNodes[index] = body.a;
  }
  if (index < domNodes.length) {
    length = index;
    for (; index < domNodes.length; index++) {
      domNode = domNodes[index];
      if (domNode.parentNode !== null) {
        domNode.parentNode.removeChild(domNode);
      }
    }
    domNodes.length = length;
    vNodes.length = length;
  }
  mutationObserver.observe(_VirtualDom_doc.body, { childList: true });
}

function observe(records) {
  var found, i, j, node, record;
  found = false;
  for (i = 0; i < records.length; i++) {
    record = records[i];
    for (j = 0; j < record.removedNodes.length; j++) {
      node = record.removedNodes[j];
      if (domNodes.indexOf(node) !== -1) {
        found = true;
        break;
      }
    }
  }
  // If one of our DOM nodes were removed, don’t trust any nodes added at the
  // same time. Some of them might have replaced our ones.
  // For Google Translate, the `<font>` tags appear as additions _before_ our
  // text nodes appear as removals. Unfortunately this also removes two `<div>`s
  // inserted by Google Translate, but the translation seems to work anyway.
  if (found) {
    for (i = 0; i < records.length; i++) {
      record = records[i];
      for (j = 0; j < record.addedNodes.length; j++) {
        domNodesToRemove.push(record.addedNodes[j]);
      }
    }
  }
}
