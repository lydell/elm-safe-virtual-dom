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
    `var mutationObserver = new MutationObserver(${observe.toString()}); ${nodeIndex.toString()}; ${morph.toString()}; ${morphChildren.toString()}; ${morphChildrenKeyed.toString()}; ${morphFacts.toString()};`,
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
      if (
        domNode !== undefined &&
        domNode.elm !== undefined &&
        domNode.nodeType === 3
      ) {
        if (domNode.data !== text) {
          domNode.data = text;
        }
        return domNode;
      }
      var newNode = _VirtualDom_doc.createTextNode(text);
      newNode.elm = { key: undefined };
      return newNode;
    }

    case 1:
    case 2: {
      var childMorpher = vNode.$ === 1 ? morphChildren : morphChildrenKeyed;
      var nodeName = vNode.c;
      var namespaceURI =
        vNode.f === undefined ? "http://www.w3.org/1999/xhtml" : vNode.f;
      var facts = vNode.d;
      var children = vNode.e;

      if (
        domNode !== undefined &&
        domNode.elm !== undefined &&
        domNode.namespaceURI === namespaceURI &&
        domNode.nodeName === nodeName
      ) {
        morphFacts(domNode, undefined, facts);
        childMorpher(domNode, children);
        return domNode;
      }

      var newNode = _VirtualDom_doc.createElementNS(namespaceURI, nodeName);
      newNode.elm = {
        key: undefined,
        eventFunctions: new Map(),
        style: new Map(),
        properties: new Map(),
      };

      if (_VirtualDom_divertHrefToApp && nodeName === "a") {
        newNode.addEventListener("click", _VirtualDom_divertHrefToApp(newNode));
      }

      morphFacts(newNode, undefined, facts);
      childMorpher(newNode, children);

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
  var previous, next;
  for (var i = 0; i < children.length; i++) {
    if (i < numChildNodes) {
      previous = domNode.childNodes[i];
      next = morph(previous, children[i]);
      if (previous !== next) {
        domNode.replaceChild(next, previous);
      }
    } else {
      domNode.appendChild(morph(undefined, children[i]));
    }
  }
  for (var j = numChildNodes - i; j > 0; j--) {
    domNode.removeChild(domNode.lastChild);
  }
}

function morphChildrenKeyed(domNode, children) {
  var map = new Map();

  for (var i = domNode.childNodes.length - 1; i >= 0; i++) {
    var child = domNode.childNodes[i];
    var key = child.elm != null ? child.elm.key : undefined;
    if (typeof key === "string" && !map.has(key)) {
      map.set(key, child);
    } else {
      domNode.removeChild(child);
    }
  }

  var previousDomNode = null;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var key = child.a;
    var node = child.b;
    var previous = map.get(key);
    var next;
    if (previous !== undefined) {
      next = morph(previous, node);
      map.delete(key);
      if (previous !== next) {
        next.elm.key = key;
        domNode.removeChild(previous);
        domNode.insertBefore(next, previousDomNode);
      } else if (next.previousSibling !== previousDomNode) {
        domNode.insertBefore(next, previousDomNode);
      }
    } else {
      next = morph(undefined, node);
      next.elm.key = key;
      domNode.insertBefore(next, previousDomNode);
    }
    previousDomNode = previous;
  }

  map.forEach(function (child) {
    domNode.removeChild(child);
  });
}

function morphFacts(domNode, eventNode, facts) {
  var events = facts.a0;
  delete facts.a0;
  var styles = facts.a1;
  delete facts.a1;
  var attributes = facts.a3;
  delete facts.a3;
  var namespacedAttributes = facts.a4;
  delete facts.a4;

  if (events !== undefined) {
    // TODO!
    // Also needs to _remove_ listeners.
    _VirtualDom_applyEvents(domNode, eventNode, events);
  }

  if (styles !== undefined) {
    var domNodeStyle = domNode.style;
    var saved = domNode.elm.style;
    for (var key in styles) {
      value = styles[key];
      if (domNodeStyle[key] !== value) {
        if (!saved.has(key)) {
          saved.set(key, domNodeStyle.getPropertyValue(key));
        }
        domNodeStyle.setProperty(key, value);
      }
    }
    saved.forEach(function (defaultValue, key) {
      if (!(key in styles)) {
        domNodeStyle.setProperty(key, defaultValue);
        saved.delete(key);
      }
    });
  }

  if (attributes !== undefined) {
    for (var key in attributes) {
      var value = attributes[key];
      if (domNode.getAttribute(key) !== value) {
        domNode.setAttribute(key, value);
      }
    }
  }
  if (namespacedAttributes !== undefined) {
    for (var key in namespacedAttributes) {
      var pair = namespacedAttributes[key];
      var namespace = pair.f;
      var value = pair.o;
      if (domNode.getAttributeNS(namespace, key) !== value) {
        domNode.setAttributeNS(namespace, key, value);
      }
    }
  }
  for (var i = 0; i < domNode.attributes.length; i++) {
    var attr = domNode.attributes[i];
    if (attributes !== undefined && attr.name in attributes) {
      if (attr.namespaceURI !== null) {
        // TODO: Is this able to remove when the namespaceURI differs?
        // Do we need to check .prefix too?
        domNode.removeAttribute(attr.name);
      }
    } else if (
      namespacedAttributes !== undefined &&
      attr.name in namespacedAttributes
    ) {
      if (attr.namespaceURI !== namespacedAttributes[attr.name].f) {
        // TODO: Here too.
        domNode.removeAttribute(attr.name);
      }
    } else {
      // TODO: And here.
      domNode.removeAttribute(attr.name);
    }
  }

  var saved = domNode.elm.properties;
  for (var key in facts) {
    value = facts[key];
    if (domNode[key] !== value) {
      if (!saved.has(key)) {
        saved.set(key, domNode[key]);
      }
      domNode[key] = value;
    }
  }
  saved.forEach(function (defaultValue, key) {
    if (!(key in facts)) {
      domNode[key] = defaultValue;
      saved.delete(key);
    }
  });
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
