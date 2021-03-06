/* global
  _Json_unwrap,
  _VirtualDom_addClass,
  _VirtualDom_divertHrefToApp,
  _VirtualDom_doc,
  _VirtualDom_makeCallback,
  _VirtualDom_passiveSupported,
  _VirtualDom_weakMap,
  $elm$virtual_dom$VirtualDom$toHandlerInt,
  Map,
*/

// Inspired by:
// https://github.com/jinjor/elm-break-dom/tree/0fef8cea8c57841e32c878febca34cf25af664a2#appendix-hacky-patch-for-browserapplication
// The JavaScript we’re mucking with:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Browser.js
// And:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Debugger.js
// So there should be up to 2 matches for every replacement.
var replacements = [
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
    "var bodyNode = _VirtualDom_doc.body;",
    "var domNodes = [], domNodesToRemove = [], bounds = { lower: 0, upper: 0 };",
  ],
  // `currNode` used to be the virtual DOM node for `bodyNode`. It’s not
  // needed because of the above. Remove it and instead introduce a mutation
  // observer (see the `observe` function) and a `nodeIndex` helper function.
  [
    "var currNode = _VirtualDom_virtualize(bodyNode);",
    "var mutationObserver = new MutationObserver(function (records) { observe(records, domNodesToRemove, bounds); });",
  ],
  // On rerender, instead of patching the whole `<body>` element, instead patch
  // every Elm element inside `<body>`.
  [
    /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(((?:[^)]|\)(?!;))+)\);\n.+\n.+\n[ \t]*currNode = nextNode;/,
    "patcher($1, sendToApp, mutationObserver, domNodes, domNodesToRemove, bounds);",
  ],
  [
    /function _VirtualDom_organizeFacts\(factList\)\r?\n\{(\r?\n([\t ][^\n]+)?)+\r?\n\}/,
    _VirtualDom_organizeFacts.toString(),
  ],
  [
    "function _VirtualDom_makeCallback(eventNode, initialHandler)",
    "function _VirtualDom_makeCallback(initialEventNode, initialHandler)",
  ],
  [
    "var handler = callback.q;",
    "var handler = callback.q; var eventNode = callback.r;",
  ],
  [
    "callback.q = initialHandler;",
    "callback.q = initialHandler; callback.r = initialEventNode;",
  ],
  [
    /var tagger;\s+var i;\s+while \(tagger = currentEventNode.j\)(\s+)\{(\r?\n|\1[\t ][^\n]+)+\1\}/,
    "",
  ],
  [
    "var _VirtualDom_divertHrefToApp;",
    [
      "var _VirtualDom_divertHrefToApp;",
      "var _VirtualDom_weakMap = new WeakMap();",
      patcher,
      observe,
      nodeIndex,
      morph,
      emptyState,
      morphChildren,
      morphChildrenKeyed,
      morphFacts,
    ]
      .map(function (i) {
        return i.toString();
      })
      .join("\n\n"),
  ],
  // https://github.com/elm/virtual-dom/issues/168
  [
    /var _VirtualDom_nodeNS = F2\(function\(namespace, tag\)\r?\n\{/,
    "$& tag = _VirtualDom_noScript(tag);",
  ],
];

function patcher(
  body,
  sendToApp,
  mutationObserver,
  domNodes,
  domNodesToRemove,
  bounds
) {
  var //
    domNode,
    exists,
    index,
    length,
    nextDomNode,
    nextVNode,
    previousDomNode;

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
  // eslint-disable-next-line no-restricted-syntax
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
    nextDomNode = morph(domNode, nextVNode, sendToApp);

    if (
      domNode !== undefined &&
      domNode !== nextDomNode &&
      domNode.parentNode === _VirtualDom_doc.body
    ) {
      _VirtualDom_weakMap.delete(domNode);
      domNode.parentNode.removeChild(domNode);
      exists = false;
    }

    if (!exists) {
      // Insert the new element into the page.
      // If this is the first of Elm’s elements, add it at the start of
      // `<body>`. Otherwise, put it after the element we worked on in the
      // previous loop iteration. Note: If `nextDomNode.nextSibling` is
      // `null` it means that `nextDomNode` is the last child of `<body>`.
      // `insertBefore` inserts the element last when the second argument
      // is `null`.
      _VirtualDom_doc.body.insertBefore(
        nextDomNode,
        previousDomNode === undefined
          ? _VirtualDom_doc.body.firstChild
          : previousDomNode.nextSibling
      );
    }

    // patches = _VirtualDom_diff(vNode, nextVNode);
    // nextDomNode = _VirtualDom_applyPatches(nextDomNode, vNode, patches, sendToApp);
    domNodes[index] = nextDomNode;
    previousDomNode = nextDomNode;

    if (index === 0) {
      bounds.lower = nodeIndex(nextDomNode);
    }
  }

  bounds.upper = nodeIndex(nextDomNode);

  // If the previous render had more children in `<body>` than now, remove the
  // excess elements.
  if (index < domNodes.length) {
    length = index;
    for (; index < domNodes.length; index++) {
      domNode = domNodes[index];
      if (domNode.parentNode !== null) {
        _VirtualDom_weakMap.delete(domNode);
        domNode.parentNode.removeChild(domNode);
      }
    }
    domNodes.length = length;
  }

  // Enable the mutation observer again. It listens for node additions and
  // removals directly inside `<body>`.
  mutationObserver.observe(_VirtualDom_doc.body, { childList: true });
}

function observe(records, domNodesToRemove, bounds) {
  var //
    found = false,
    i,
    index,
    j,
    node,
    record;

  // See if any of Elm’s elements have been removed by some script or extension.
  for (i = 0; i < records.length; i++) {
    record = records[i];
    for (j = 0; j < record.removedNodes.length; j++) {
      node = record.removedNodes[j];
      if (_VirtualDom_weakMap.has(node)) {
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
        if (_VirtualDom_weakMap.has(node)) {
          domNodesToRemove.push(node);
        } else {
          // But don’t apply this to nodes before or after Elm’s range of nodes.
          // This way we don’t remove the two `<div>`s inserted by Google
          // Translate. This is why we track `lower` and `upper`.
          index = nodeIndex(node);
          if (index >= bounds.lower && index <= bounds.upper) {
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

function morph(domNode, vNode, eventNode) {
  var //
    actualVNode,
    childMorpher,
    children,
    diff,
    state,
    facts,
    i,
    lazyRefs,
    model,
    namespaceURI,
    newNode,
    nodeName,
    patch,
    refs,
    render,
    same,
    tagger,
    text,
    thunk;

  console.log("MORPH", vNode);

  switch (vNode.$) {
    // Html.text
    case 0: {
      text = vNode.a;
      if (
        domNode !== undefined &&
        domNode.nodeType === 3 &&
        _VirtualDom_weakMap.has(domNode)
      ) {
        if (domNode.data !== text) {
          domNode.data = text;
        }
        return domNode;
      }
      newNode = _VirtualDom_doc.createTextNode(text);
      _VirtualDom_weakMap.set(newNode, { key: undefined });
      return newNode;
    }

    // Html.div etc
    case 1:
    case 2: {
      childMorpher = vNode.$ === 1 ? morphChildren : morphChildrenKeyed;
      nodeName = vNode.c;
      namespaceURI =
        vNode.f === undefined ? "http://www.w3.org/1999/xhtml" : vNode.f;
      facts = vNode.d;
      children = vNode.e;

      if (
        domNode !== undefined &&
        domNode.namespaceURI === namespaceURI &&
        domNode.nodeName === nodeName &&
        _VirtualDom_weakMap.has(domNode)
      ) {
        morphFacts(domNode, eventNode, facts);
        childMorpher(domNode, children);
        return domNode;
      }

      newNode = _VirtualDom_doc.createElementNS(namespaceURI, nodeName);
      _VirtualDom_weakMap.set(newNode, emptyState());

      if (_VirtualDom_divertHrefToApp && nodeName === "a") {
        newNode.addEventListener("click", _VirtualDom_divertHrefToApp(newNode));
      }

      morphFacts(newNode, eventNode, facts);
      childMorpher(newNode, children);

      return newNode;
    }

    // Markdown.toHtml etc
    case 3: {
      facts = vNode.d;
      model = vNode.g;
      render = vNode.h;
      diff = vNode.i;
      newNode;

      if (
        domNode !== undefined &&
        (state = _VirtualDom_weakMap.get(domNode)) !== undefined &&
        state !== undefined &&
        state.custom !== undefined &&
        state.custom.render === render
      ) {
        patch = diff(state.custom.model, model);
        newNode = patch === false ? domNode : patch(domNode);
      } else {
        newNode = render(model);
        state = emptyState();
      }

      state.custom = {
        render: render,
        model: model,
      };
      _VirtualDom_weakMap.set(newNode, state);
      morphFacts(newNode, eventNode, facts);
      return newNode;
    }

    // Html.map
    case 4: {
      tagger = vNode.j;
      actualVNode = vNode.k;
      return morph(domNode, actualVNode, function (message, stopPropagation) {
        return eventNode(tagger(message), stopPropagation);
      });
    }

    // Html.Lazy.lazy etc
    case 5: {
      refs = vNode.l;
      thunk = vNode.m;
      same = false;

      if (
        domNode !== undefined &&
        (state = _VirtualDom_weakMap.get(domNode)) !== undefined &&
        state.lazy !== undefined
      ) {
        lazyRefs = state.lazy.refs;
        i = lazyRefs.length;
        same = i === refs.length;
        while (same && i-- > 0) {
          same = lazyRefs[i] === refs[i];
        }
      }

      actualVNode = same ? state.lazy.vNode : thunk();
      newNode = morph(domNode, actualVNode, eventNode);
      _VirtualDom_weakMap.get(newNode).lazy = {
        refs: refs,
        vNode: actualVNode,
      };
      return newNode;
    }

    default:
      throw new Error("Unknown vNode.$: " + vNode.$);
  }
}

function emptyState() {
  return {
    key: undefined,
    eventFunctions: new Map(),
    style: new Map(),
    properties: new Map(),
    custom: undefined,
    lazy: undefined,
  };
}

function morphChildren(domNode, children) {
  var //
    numChildNodes = domNode.childNodes.length,
    i,
    j,
    next,
    previous;

  for (i = 0; i < children.length; i++) {
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
  for (j = numChildNodes - i; j > 0; j--) {
    _VirtualDom_weakMap.delete(domNode.lastChild);
    domNode.removeChild(domNode.lastChild);
  }
}

function morphChildrenKeyed(domNode, children) {
  var //
    map = new Map(),
    previousDomNode = null,
    child,
    state,
    i,
    key,
    next,
    node,
    previous;

  for (i = domNode.childNodes.length - 1; i >= 0; i--) {
    child = domNode.childNodes[i];
    state = _VirtualDom_weakMap.get(child);
    key = state !== undefined ? state.key : undefined;
    if (typeof key === "string" && !map.has(key)) {
      map.set(key, child);
    } else {
      _VirtualDom_weakMap.delete(child);
      domNode.removeChild(child);
    }
  }

  for (i = 0; i < children.length; i++) {
    child = children[i];
    key = child.a;
    node = child.b;
    previous = map.get(key);
    if (previous !== undefined) {
      next = morph(previous, node);
      map.delete(key);
      if (previous !== next) {
        _VirtualDom_weakMap.get(next).key = key;
        _VirtualDom_weakMap.delete(previous);
        domNode.removeChild(previous);
        domNode.insertBefore(next, previousDomNode);
      } else if (next.previousSibling !== previousDomNode) {
        domNode.insertBefore(next, previousDomNode);
      }
    } else {
      next = morph(undefined, node);
      _VirtualDom_weakMap.get(next).key = key;
      domNode.insertBefore(next, previousDomNode);
    }
    previousDomNode = previous;
  }

  map.forEach(function (child) {
    _VirtualDom_weakMap.delete(child);
    domNode.removeChild(child);
  });
}

function morphFacts(domNode, eventNode, facts) {
  var //
    events = facts.a0,
    styles = facts.a1,
    properties = facts.a2,
    attributes = facts.a3,
    namespacedAttributes = facts.a4,
    state = _VirtualDom_weakMap.get(domNode),
    attr,
    callback,
    domNodeStyle,
    eventName,
    handler,
    i,
    key,
    namespace,
    oldCallback,
    oldHandler,
    pair,
    saved,
    value;

  saved = state.eventFunctions;
  for (eventName in events) {
    handler = events[eventName];
    oldCallback = state.eventFunctions.get(eventName);
    if (oldCallback !== undefined) {
      oldHandler = oldCallback.q;
      if (oldHandler.$ === handler.$) {
        oldCallback.q = handler;
        oldCallback.r = eventNode;
        continue;
      }
      domNode.removeEventListener(eventName, oldCallback);
    }
    callback = _VirtualDom_makeCallback(eventNode, handler);
    domNode.addEventListener(
      eventName,
      callback,
      _VirtualDom_passiveSupported && {
        passive: $elm$virtual_dom$VirtualDom$toHandlerInt(handler) < 2,
      }
    );
    saved.set(eventName, callback);
  }
  saved.forEach(function (oldCallback, eventName) {
    if (!(eventName in events)) {
      domNode.removeEventListener(eventName, oldCallback);
      saved.delete(key);
    }
  });

  domNodeStyle = domNode.style;
  saved = state.style;
  for (key in styles) {
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

  for (key in attributes) {
    value = attributes[key];
    if (domNode.getAttribute(key) !== value) {
      domNode.setAttribute(key, value);
    }
  }
  for (key in namespacedAttributes) {
    pair = namespacedAttributes[key];
    namespace = pair.f;
    value = pair.o;
    if (domNode.getAttributeNS(namespace, key) !== value) {
      domNode.setAttributeNS(namespace, key, value);
    }
  }
  for (i = 0; i < domNode.attributes.length; i++) {
    attr = domNode.attributes[i];
    if (attr.namespaceURI === null) {
      if (!(attr.name in attributes)) {
        domNode.removeAttribute(attr.name);
      }
    } else {
      if (!(attr.name in namespacedAttributes)) {
        domNode.removeAttributeNS(attr.namespaceURI, attr.name);
      }
    }
  }

  saved = state.properties;
  for (key in properties) {
    value = properties[key];
    if (domNode[key] !== value) {
      if (!saved.has(key)) {
        saved.set(key, domNode[key]);
      }
      domNode[key] = value;
    }
  }
  saved.forEach(function (defaultValue, key) {
    if (!(key in properties)) {
      domNode[key] = defaultValue;
      saved.delete(key);
    }
  });
}

function _VirtualDom_organizeFacts(factList) {
  var //
    entry,
    facts,
    key,
    subFacts,
    tag,
    value;

  for (
    facts = { a0: {}, a1: {}, a2: {}, a3: {}, a4: {} };
    factList.b;
    factList = factList.b // WHILE_CONS
  ) {
    entry = factList.a;
    tag = entry.$;
    key = entry.n;
    value = tag === "a2" ? _Json_unwrap(entry.o) : entry.o;
    subFacts = facts[tag];
    if (
      (tag === "a2" && key === "className") ||
      (tag === "a3" && key === "class")
    ) {
      _VirtualDom_addClass(subFacts, key, value);
    } else {
      subFacts[key] = value;
    }
  }
  return facts;
}

// RUN

var fs = require("fs"),
  path = require("path");

function patch(code) {
  return replacements.reduce(strictReplace, code);
}

function strictReplace(code, tuple) {
  var //
    search = tuple[0],
    replacement = tuple[1],
    parts = code.split(search),
    content,
    filePath;

  if (parts.length <= 1) {
    filePath = path.resolve("elm-virtual-dom-patch-error.txt");
    content = [
      "Patching Elm’s JS output to avoid virtual DOM errors caused by browser extensions failed!",
      "This message is defined in the app/patches/ folder.",
      "",
      "### Code to replace (not found!):",
      search,
      "",
      "### Replacement:",
      replacement,
      "",
      "### Input code:",
      code,
    ].join("\n");
    try {
      fs.writeFileSync(filePath, content);
    } catch (error) {
      throw new Error(
        "Elm Virtual DOM patch: Code to replace was not found! Tried to write more info to " +
          filePath +
          ", but got this error: " +
          error.message
      );
    }
    throw new Error(
      "Elm Virtual DOM patch: Code to replace was not found! More info written to " +
        filePath
    );
  }
  return typeof search === "string"
    ? parts.join(replacement)
    : code.replace(search, replacement);
}

function overwrite(file, transform) {
  fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")));
}

overwrite(process.argv[2], patch);
