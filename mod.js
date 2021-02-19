const fs = require("fs");

const file = process.argv[2];

fs.writeFileSync(file, patch(fs.readFileSync(file, "utf8")));

function patch(code) {
  return code
    .replace(
      `var bodyNode = _VirtualDom_doc.body;`,
      `var domNodes = [], vNodes = [];`
    )
    .replace(`var currNode = _VirtualDom_virtualize(bodyNode);`, ``)
    .replace(`var doc = view(model);`, `$& console.log(doc);`)
    .replace(
      /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(([^()]+)\).+\n.+\n.+\n[ \t]*currNode = nextNode;/,
      `(${patcher.toString()})($1);`
    );
}

function patcher(body) {
  var domNode, index, length, nextDomNode, patches, vNode;
  for (
    index = 0;
    body.b;
    body = body.b, index++ // WHILE_CONS
  ) {
    if (index < domNodes.length) {
      domNode = domNodes[index];
      vNode = vNodes[index];
    } else {
      domNode = document.createElement("div");
      vNode = _VirtualDom_virtualize(domNode);
      _VirtualDom_doc.body.insertBefore(
        domNode,
        nextDomNode === undefined ? null : nextDomNode.nextSibling
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
}
