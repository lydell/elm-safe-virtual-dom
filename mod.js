const fs = require("fs");

// Inspired by:
// https://github.com/jinjor/elm-break-dom/tree/0fef8cea8c57841e32c878febca34cf25af664a2#appendix-hacky-patch-for-browserapplication
// The JavaScript we’re mucking with:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Browser.js
// And:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Debugger.js
// So there should be up to 2 matches for every replacement.
const replacements = [
  // Instead of keeping track of only the `<body>` element, keep track of all
  // elements directly inside `<body>` that Elm renders. `domNodes` and
  // `vNodes` (virtual DOM nodes) are parallel lists: They always have the
  // same length and items at the same index correspond to each other.
  // `domNodesToRemove` is a list of elements that have replaced Elm elements.
  // Google Translate does this – it replaces text nodes with `<font>`
  // elements. If you have text nodes directly in `<body>` this is needed.
  // `lower` is the index of the first Elm element inside `<body>`.
  // `upper` is the index of the last Elm element inside `<body>`.
  [
    `var bodyNode = _VirtualDom_doc.body;`,
    `var domNodes = [], domNodesToRemove = [], lower = 0, upper = 0;`,
  ],
  // `currNode` used to be the virtual DOM node for `bodyNode`. It’s not
  // needed because of the above. Remove it and instead introduce a mutation
  // observer (see the `observe` function) and a `nodeIndex` helper function.
  [
    `var currNode = _VirtualDom_virtualize(bodyNode);`,
    `var mutationObserver = new MutationObserver(${observe.toString()}); ${nodeIndex.toString()}; ${morph.toString()}; ${morphChildren.toString()}; ${applyFacts.toString()};`,
  ],
  // On rerender, instead of patching the whole `<body>` element, instead patch
  // every Elm element inside `<body>`.
  [
    /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(((?:[^)]|\)(?!;))+)\);\n.+\n.+\n[ \t]*currNode = nextNode;/,
    `(${patcher.toString()})($1);`,
  ],
];

function patcher(body) {
  var domNode, exists, index, length, nextVNode, previousDomNode;

  // We don’t want to be notified about changes to the DOM we make ourselves.
  mutationObserver.disconnect();

  // Remove elements that have replaced Elm elements. (See the `observe`
  // function.)
  for (index = 0; index < domNodesToRemove.length; index++) {
    domNode = domNodesToRemove[index];
    if (domNode.parentNode === _VirtualDom_doc.body) {
      domNode.parentNode.removeChild(domNode);
    }
  }
  domNodesToRemove.length = 0;

  // This kind of loop is common in Elm Kernel code and usually marked with
  // “WHILE_CONS”. `body` is a linked list – it’s from `Browser.Document`:
  // `{ title = "Title", body = [ Html.div [] [], Html.text "Hello!" ] }`
  for (index = 0; body.b; body = body.b, index++) {
    nextVNode = body.a;

    // When we’ve rendered `body` before, we might have DOM and Virtual DOM
    // nodes from before that should be patched rather than creating stuff from
    // scratch. The first render `domNodes` and `vNodes` are going to be empty,
    // so then we _only_ create new stuff.
    exists = index < domNodes.length;
    domNode = undefined;
    if (exists) {
      domNode = domNodes[index];
      if (domNode.parentNode !== _VirtualDom_doc.body) {
        // Some script has (re-)moved/replaced our DOM node, so we need to make
        // one from scratch after all.
        exists = false;
      }
    }

    // Patch and update state.
    domNode = morph(domNode, nextVNode);

    if (!exists) {
      // Insert the new element into the page.
      // If this is the first of Elm’s elements, add it at the start of
      // `<body>`. Otherwise, put it after the element we worked on in the
      // previous loop iteration. Note: If `nextDomNode.nextSibling` is
      // `null` it means that `nextDomNode` is the last child of `<body>`.
      // `insertBefore` inserts the element last when the second argument
      // is `null`.
      _VirtualDom_doc.body.insertBefore(
        domNode,
        previousDomNode === undefined
          ? _VirtualDom_doc.body.firstChild
          : previousDomNode.nextSibling
      );
    }

    // patches = _VirtualDom_diff(vNode, nextVNode);
    // nextDomNode = _VirtualDom_applyPatches(domNode, vNode, patches, sendToApp);
    domNodes[index] = domNode;
    previousDomNode = domNode;

    if (index === 0) {
      lower = nodeIndex(domNode);
    }
  }

  upper = nodeIndex(domNode);

  // If the previous render had more children in `<body>` than now, remove the
  // excess elements.
  if (index < domNodes.length) {
    length = index;
    for (; index < domNodes.length; index++) {
      domNode = domNodes[index];
      if (domNode.parentNode !== null) {
        domNode.parentNode.removeChild(domNode);
      }
    }
    domNodes.length = length;
  }

  // Enable the mutation observer again. It listens for node additions and
  // removals directly inside `<body>`.
  mutationObserver.observe(_VirtualDom_doc.body, { childList: true });
}

function observe(records) {
  var found, i, index, j, node, record;

  found = false;

  // See if any of Elm’s elements have been removed by some script or extension.
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

  // If one of Elm’s DOM nodes were removed, don’t trust any nodes added at the
  // same time. Some of them might have replaced Elm’s elements.
  // For Google Translate, the `<font>` tags appear as additions _before_ Elm’s
  // text nodes appear as removals.
  if (found) {
    for (i = 0; i < records.length; i++) {
      record = records[i];
      for (j = 0; j < record.addedNodes.length; j++) {
        node = record.addedNodes[j];
        // If one of Elm’s elements has been inserted, redraw it completely to
        // protect against reordering done by a script or extension.
        if (domNodes.indexOf(node) !== -1) {
          domNodesToRemove.push(node);
        } else {
          // But don’t apply this to nodes before or after Elm’s range of nodes.
          // This way we don’t remove the two `<div>`s inserted by Google
          // Translate. This is why we track `lower` and `upper`.
          index = nodeIndex(node);
          if (index >= lower && index <= upper) {
            domNodesToRemove.push(node);
          }
        }
      }
    }
  }
}

function nodeIndex(node) {
  // https://stackoverflow.com/a/5913984/2010616
  for (var index = 0; (node = node.previousSibling) !== null; index++);
  return index;
}

function morph(domNode, vNode) {
  console.log("MORPH", vNode);

  switch (vNode.$) {
    case 0: {
      // Html.text
      var text = vNode.a;
      if (domNode !== undefined && domNode.nodeType === 3) {
        domNode.data = text;
        return domNode;
      }
      return _VirtualDom_doc.createTextNode(text);
    }

    case 1: {
      var nodeName = vNode.c;
      var namespaceURI =
        vNode.f === undefined ? "http://www.w3.org/1999/xhtml" : vNode.f;
      var facts = vNode.d;
      var children = vNode.e;

      if (
        domNode !== undefined &&
        domNode.namespaceURI === namespaceURI &&
        domNode.nodeName === nodeName
      ) {
        applyFacts(domNode, undefined, facts);
        morphChildren(domNode, children);
        return domNode;
      }

      var newNode = _VirtualDom_doc.createElementNS(namespaceURI, nodeName);
      applyFacts(newNode, facts);
      morphChildren(newNode, children);

      // TODO: Does this need to run even if `domNode` was of the correct type?
      if (_VirtualDom_divertHrefToApp && nodeName === "a") {
        newNode.addEventListener("click", _VirtualDom_divertHrefToApp(newNode));
      }

      return newNode;
    }

    default: {
      var div = _VirtualDom_doc.createElement("div");
      div.dataset.dollar = vNode.$;
      return div;
    }
  }
}

function morphChildren(domNode, children) {
  var numChildNodes = domNode.childNodes.length;
  for (var i = 0; i < children.length; i++) {
    if (i < numChildNodes) {
      morph(domNode.childNodes[i], children[i]);
    } else {
      domNode.appendChild(morph(undefined, children[i]));
    }
  }
  for (var j = numChildNodes - i; j > 0; j--) {
    domNode.removeChild(domNode.lastChild);
  }
}

// TODO: Does this remove old attributes correctly?
function applyFacts(domNode, eventNode, facts) {
  for (var key in facts) {
    var fact = facts[key];

    switch (key) {
      case "a1": {
        var domNodeStyle = domNode.style;
        for (var key in fact) {
          domNodeStyle[key] = fact[key];
        }
        break;
      }
      case "a0":
        // TODO!
        _VirtualDom_applyEvents(domNode, eventNode, value);
        break;
      case "a3": {
        for (var key in fact) {
          var value = fact[key];
          typeof value !== "undefined"
            ? domNode.setAttribute(key, value)
            : domNode.removeAttribute(key);
        }
        break;
      }
      case "a4":
        for (var key in fact) {
          var pair = fact[key];
          var namespace = pair.__namespace;
          var value = pair.__value;

          typeof value !== "undefined"
            ? domNode.setAttributeNS(namespace, key, value)
            : domNode.removeAttributeNS(namespace, key);
        }
        break;
      default:
        if ((key !== "value" && key !== "checked") || domNode[key] !== fact) {
          domNode[key] = fact;
        }
    }
  }
}

function patch(code) {
  return replacements.reduce(strictReplace, code);
}

function strictReplace(code, [search, replacement]) {
  const parts = code.split(search);
  if (parts.length <= 1) {
    const filePath = path.resolve("elm-virtual-dom-patch-error.txt");
    const content = `
Patching Elm’s JS output to avoid virtual DOM errors caused by browser extensions failed!
This message is defined in the app/patches/ folder.

### Code to replace (not found!):
${search}

### Replacement:
${replacement}

### Input code:
${code}
`.trimStart();
    try {
      fs.writeFileSync(filePath, content);
    } catch (error) {
      throw new Error(
        `Elm Virtual DOM patch: Code to replace was not found! Tried to write more info to ${filePath}, but got this error: ${error.message}`
      );
    }
    throw new Error(
      `Elm Virtual DOM patch: Code to replace was not found! More info written to ${filePath}`
    );
  }
  return typeof search === "string"
    ? parts.join(replacement)
    : code.replace(search, replacement);
}

const file = process.argv[2];
fs.writeFileSync(file, patch(fs.readFileSync(file, "utf8")));
