const fs = require("fs");

const file = "index.html";

fs.writeFileSync(file, patch(fs.readFileSync(file, "utf8")));

function patch(code) {
  return code
    .replace(`var bodyNode = _VirtualDom_doc.body;`, `var nodes = [];`)
    .replace(`var currNode = _VirtualDom_virtualize(bodyNode);`, ``)
    .replace(`var doc = view(model);`, `$& console.log(doc);`)
    .replace(
      /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(([^()]+)\).+\n.+\n.+\n[ \t]*currNode = nextNode;/,
      `(${patcher.toString()})($1);`
    );
}

function patcher(body) {
  for (
    var index = 0;
    body.b;
    body = body.b, index++ // WHILE_CONS
  ) {
    var domNode, currNode;
    if (index < nodes.length) {
      domNode = nodes[index][0];
      currNode = nodes[index][1];
    } else {
      domNode = document.createElement("div");
      currNode = _VirtualDom_virtualize(domNode);
      _VirtualDom_doc.body.appendChild(domNode);
    }
    var patches = _VirtualDom_diff(currNode, body.a);
    var nextDomNode = _VirtualDom_applyPatches(
      domNode,
      currNode,
      patches,
      sendToApp
    );
    nodes[index] = [nextDomNode, body.a];
  }
  if (index < nodes.length) {
    for (; index < nodes.length; index++) {
      var domNode = nodes[index][0];
      if (domNode.parentNode !== null) {
        domNode.parentNode.removeChild(domNode);
      }
    }
    nodes.splice(index);
  }
}
