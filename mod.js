/* global
  _Json_unwrap,
  _Morph_weakMap,
  _VirtualDom_addClass,
  _VirtualDom_divertHrefToApp,
  _VirtualDom_doc,
  _VirtualDom_makeCallback,
  _VirtualDom_passiveSupported,
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
    // ### _Browser_document
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
      "var domNodes = [], domNodesToRemove = [], bounds = { lower: 0, upper: 0 }, handleNonElmChild = args && args.handleNonElmChild || _Morph_defaultHandleNonElmChild;",
    ],
    // `currNode` used to be the virtual DOM node for `bodyNode`. It’s not
    // needed because of the above. Remove it and instead introduce a mutation
    // observer (see the `_Morph_observe` function) and a `_Morph_nodeIndex` helper function.
    [
      "var currNode = _VirtualDom_virtualize(bodyNode);",
      "var mutationObserver = new MutationObserver(function (records) { _Morph_observe(records, domNodesToRemove, bounds); });",
    ],
    // On rerender, instead of patching the whole `<body>` element, instead patch
    // every Elm element inside `<body>`.
    [
      /var nextNode = _VirtualDom_node\('body'\)\(_List_Nil\)\(((?:[^)]|\)(?!;))+)\);\n.+\n.+\n[ \t]*currNode = nextNode;/,
      "_Morph_morphBody($1, sendToApp, handleNonElmChild, mutationObserver, domNodes, domNodesToRemove, bounds);",
    ],

    // ### _Browser_element
    [
      "var currNode = _VirtualDom_virtualize(domNode);",
      "var handleNonElmChild = args && args.handleNonElmChild || _Morph_defaultHandleNonElmChild;",
    ],
    ["var patches = _VirtualDom_diff(currNode, nextNode);", ""],
    [
      "domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp);",
      "domNode = _Morph_morphRootNode(domNode, nextNode, sendToApp, handleNonElmChild);",
    ],
    ["currNode = nextNode;", ""],

    // ### _VirtualDom_organizeFacts
    [
      /function _VirtualDom_organizeFacts\(factList\)\r?\n\{(\r?\n([\t ][^\n]+)?)+\r?\n\}/,
      _VirtualDom_organizeFacts.toString(),
    ],

    // ### _VirtualDom_makeCallback
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

    // ### _VirtualDom_nodeNS
    [
      "for (var kids = [], descendantsCount = 0; kidList.b; kidList = kidList.b)",
      "for (var kids = [], descendantsCount = 0, index = 0; kidList.b; kidList = kidList.b, index++)",
    ],
    [
      "descendantsCount += (kid.b || 0);",
      "descendantsCount += (kid.b || 0); kid.key = '_Morph_default_key_' + index;",
    ],

    // ### _VirtualDom_keyedNodeNS
    [
      /(descendantsCount \+= \(kid\.b\.b \|\| 0\));\s+kids\.push\(kid\);/,
      "$1; kid.b.key = kid.a; kids.push(kid.b);",
    ],

    // ### Insert functions
    [
      "var _VirtualDom_divertHrefToApp;",
      [
        "var _VirtualDom_divertHrefToApp;",
        "var _Morph_weakMap = new WeakMap();",
        _Morph_observe,
        _Morph_nodeIndex,
        _Morph_defaultHandleNonElmChild,
        _Morph_morphRootNode,
        _Morph_morphBody,
        _Morph_morphNode,
        _Morph_morphText,
        _Morph_morphElement,
        _Morph_morphChildrenKeyed,
        _Morph_morphCustom,
        _Morph_morphLazy,
        _Morph_morphFacts,
        _Morph_morphEvents,
        _Morph_morphStyles,
        _Morph_morphProperties,
        _Morph_morphAttributes,
        _Morph_morphNamespacedAttributes,
      ]
        .map(function (i) {
          return i.toString();
        })
        .join("\n\n"),
    ],

    // ### https://github.com/elm/virtual-dom/issues/168
    [
      /var _VirtualDom_nodeNS = F2\(function\(namespace, tag\)\r?\n\{/,
      "$& tag = _VirtualDom_noScript(tag);",
    ],
  ],
  debuggerReplacements = [
    ["var currPopout;", ""],
    ["var cornerCurr = _VirtualDom_virtualize(cornerNode);", ""],
    ["var cornerPatches = _VirtualDom_diff(cornerCurr, cornerNext);", ""],
    [
      "cornerNode = _VirtualDom_applyPatches(cornerNode, cornerCurr, cornerPatches, sendToApp);",
      "cornerNode = _Morph_morphRootNode(cornerNode, cornerNext, sendToApp, handleNonElmChild);",
    ],
    ["cornerCurr = cornerNext;", ""],
    ["currPopout = undefined;", ""],
    [
      "currPopout || (currPopout = _VirtualDom_virtualize(model.popout.b));",
      "",
    ],
    ["var popoutPatches = _VirtualDom_diff(currPopout, nextPopout);", ""],
    [
      "_VirtualDom_applyPatches(model.popout.b.body, currPopout, popoutPatches, sendToApp);",
      "_Morph_morphRootNode(model.popout.b.body, nextPopout, sendToApp, handleNonElmChild);",
    ],
    ["currPopout = nextPopout;", ""],
  ];

function _Morph_morphRootNode(domNode, nextNode, sendToApp, handleNonElmChild) {
  var newNode = _Morph_morphNode(
    domNode,
    nextNode,
    sendToApp,
    handleNonElmChild
  );
  if (newNode !== domNode && domNode.parentNode !== null) {
    _Morph_weakMap.delete(domNode);
    domNode.parentNode.replaceChild(newNode, domNode);
  }
  return newNode;
}

function _Morph_morphBody(
  body,
  sendToApp,
  handleNonElmChild,
  mutationObserver,
  domNodes,
  domNodesToRemove,
  bounds
) {
  var //
    domNode,
    exists,
    i,
    length,
    nextDomNode,
    nextVNode,
    previousDomNode;

  // We don’t want to be notified about changes to the DOM we make ourselves.
  mutationObserver.disconnect();

  // Remove elements that have replaced Elm elements. (See the `observe`
  // function.)
  for (i = 0; i < domNodesToRemove.length; i++) {
    domNode = domNodesToRemove[i];
    if (domNode.parentNode === _VirtualDom_doc.body) {
      domNode.parentNode.removeChild(domNode);
    }
  }
  domNodesToRemove.length = 0;

  // This kind of loop is common in Elm Kernel code and usually marked with
  // “WHILE_CONS”. `body` is a linked list – it’s from `Browser.Document`:
  // `{ title = "Title", body = [ Html.div [] [], Html.text "Hello!" ] }`
  // eslint-disable-next-line no-restricted-syntax
  for (i = 0; body.b; body = body.b, i++) {
    nextVNode = body.a;

    // When we’ve rendered `body` before, we might have DOM and Virtual DOM
    // nodes from before that should be patched rather than creating stuff from
    // scratch. The first render `domNodes` and `vNodes` are going to be empty,
    // so then we _only_ create new stuff.
    exists = i < domNodes.length;
    domNode = undefined;
    if (exists) {
      domNode = domNodes[i];
      if (domNode.parentNode !== _VirtualDom_doc.body) {
        // Some script has (re-)moved/replaced our DOM node, so we need to make
        // one from scratch after all.
        exists = false;
      }
    }

    // Patch and update state.
    nextDomNode = _Morph_morphNode(
      domNode,
      nextVNode,
      sendToApp,
      handleNonElmChild
    );

    if (
      domNode !== undefined &&
      domNode !== nextDomNode &&
      domNode.parentNode === _VirtualDom_doc.body
    ) {
      _Morph_weakMap.delete(domNode);
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

    domNodes[i] = nextDomNode;
    previousDomNode = nextDomNode;

    if (i === 0) {
      bounds.lower = _Morph_nodeIndex(nextDomNode);
    }
  }

  bounds.upper = _Morph_nodeIndex(nextDomNode);

  // If the previous render had more children in `<body>` than now, remove the
  // excess elements.
  if (i < domNodes.length) {
    length = i;
    for (; i < domNodes.length; i++) {
      domNode = domNodes[i];
      if (domNode.parentNode !== null) {
        _Morph_weakMap.delete(domNode);
        domNode.parentNode.removeChild(domNode);
      }
    }
    domNodes.length = length;
  }

  // Enable the mutation observer again. It listens for node additions and
  // removals directly inside `<body>`.
  mutationObserver.observe(_VirtualDom_doc.body, { childList: true });
}

function _Morph_observe(records, domNodesToRemove, bounds) {
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
      if (_Morph_weakMap.has(node)) {
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
        if (_Morph_weakMap.has(node)) {
          domNodesToRemove.push(node);
        } else {
          // But don’t apply this to nodes before or after Elm’s range of nodes.
          // This way we don’t remove the two `<div>`s inserted by Google
          // Translate. This is why we track `lower` and `upper`.
          index = _Morph_nodeIndex(node);
          if (index >= bounds.lower && index <= bounds.upper) {
            domNodesToRemove.push(node);
          }
        }
      }
    }
  }
}

function _Morph_nodeIndex(node) {
  // https://stackoverflow.com/a/5913984/2010616
  for (var i = 0; (node = node.previousSibling) !== null; i++);
  return i;
}

function _Morph_defaultHandleNonElmChild(child) {
  if (child.nodeName === "FONT") {
    child.parentNode.removeChild(child);
  }
}

function _Morph_morphNode(domNode, vNode, sendToApp, handleNonElmChild) {
  switch (vNode.$) {
    // Html.text
    case 0:
      return _Morph_morphText(domNode, vNode);

    // Html.div etc
    case 1:
    case 2:
      return _Morph_morphElement(domNode, vNode, sendToApp, handleNonElmChild);

    // Markdown.toHtml etc
    case 3:
      return _Morph_morphCustom(domNode, vNode, sendToApp);

    // Html.map
    case 4: {
      var tagger = vNode.j,
        actualVNode = vNode.k;
      return _Morph_morphNode(
        domNode,
        actualVNode,
        function (message, stopPropagation) {
          return sendToApp(tagger(message), stopPropagation);
        }
      );
    }

    // Html.Lazy.lazy etc
    case 5:
      return _Morph_morphLazy(domNode, vNode, sendToApp, handleNonElmChild);

    default:
      throw new Error("Unknown vNode.$: " + vNode.$);
  }
}

function _Morph_morphText(domNode, vNode) {
  var //
    text = vNode.a,
    newNode;
  if (
    domNode !== undefined &&
    domNode.nodeType === 3 &&
    _Morph_weakMap.has(domNode)
  ) {
    if (domNode.data !== text) {
      domNode.data = text;
    }
    return domNode;
  }
  newNode = _VirtualDom_doc.createTextNode(text);
  _Morph_weakMap.set(newNode, vNode);
  return newNode;
}

function _Morph_morphElement(domNode, vNode, sendToApp, handleNonElmChild) {
  var //
    nodeName = vNode.c,
    namespaceURI =
      vNode.f === undefined ? "http://www.w3.org/1999/xhtml" : vNode.f,
    facts = vNode.d,
    children = vNode.e,
    newNode,
    state;

  if (
    domNode !== undefined &&
    domNode.namespaceURI === namespaceURI &&
    domNode.localName === nodeName &&
    (state = _Morph_weakMap.get(domNode)) !== undefined
  ) {
    _Morph_morphFacts(domNode, state, facts, sendToApp);
    _Morph_morphChildrenKeyed(domNode, children, sendToApp, handleNonElmChild);
    _Morph_weakMap.set(domNode, vNode);
    return domNode;
  }

  newNode = _VirtualDom_doc.createElementNS(namespaceURI, nodeName);
  state = vNode;
  _Morph_weakMap.set(newNode, state);

  if (_VirtualDom_divertHrefToApp && nodeName === "a") {
    newNode.addEventListener("click", _VirtualDom_divertHrefToApp(newNode));
  }

  _Morph_morphFacts(newNode, state, facts, sendToApp);
  _Morph_morphChildrenKeyed(newNode, children, sendToApp, handleNonElmChild);

  return newNode;
}

function _Morph_morphChildrenKeyed(
  parent,
  children,
  sendToApp,
  handleNonElmChild
) {
  var //
    map = new Map(),
    refDomNode = null,
    child,
    domNode,
    i,
    newNode,
    state;

  for (i = parent.childNodes.length - 1; i >= 0; i--) {
    child = parent.childNodes[i];
    state = _Morph_weakMap.get(child);
    if (state === undefined) {
      handleNonElmChild(child);
    } else if (map.has(state.key)) {
      _Morph_weakMap.delete(child);
      parent.removeChild(child);
    } else {
      map.set(state.key, child);
    }
  }

  refDomNode = parent.firstChild;
  while (refDomNode !== null && !_Morph_weakMap.has(refDomNode)) {
    refDomNode = refDomNode.nextSibling;
  }

  for (i = 0; i < children.length; i++) {
    child = children[i];
    domNode = map.get(child.key);
    if (domNode !== undefined) {
      map.delete(child.key);
      newNode = _Morph_morphNode(domNode, child, sendToApp, handleNonElmChild);
      if (domNode !== newNode) {
        _Morph_weakMap.delete(domNode);
        if (domNode === refDomNode) {
          parent.replaceChild(newNode, domNode);
        } else {
          parent.removeChild(domNode);
          parent.insertBefore(newNode, refDomNode);
        }
      } else if (newNode !== refDomNode && newNode.nextSibling !== refDomNode) {
        parent.insertBefore(newNode, refDomNode);
      }
    } else {
      newNode = _Morph_morphNode(
        undefined,
        child,
        sendToApp,
        handleNonElmChild
      );
      parent.insertBefore(newNode, refDomNode);
    }
    refDomNode = newNode.nextSibling;
  }

  map.forEach(function (child) {
    _Morph_weakMap.delete(child);
    parent.removeChild(child);
  });
}

function _Morph_morphCustom(domNode, vNode, sendToApp) {
  var //
    facts = vNode.d,
    model = vNode.g,
    render = vNode.h,
    diff = vNode.i,
    newNode,
    patch,
    state;

  if (
    domNode !== undefined &&
    (state = _Morph_weakMap.get(domNode)) !== undefined &&
    state !== undefined &&
    state.$ === 3 &&
    state.h === render
  ) {
    patch = diff(state.g, model);
    newNode = patch === false ? domNode : patch(domNode);
  } else {
    newNode = render(model);
    state = vNode;
  }

  _Morph_weakMap.set(newNode, state);
  _Morph_morphFacts(newNode, state, facts, sendToApp);
  return newNode;
}

function _Morph_morphLazy(domNode, vNode, sendToApp, handleNonElmChild) {
  var //
    refs = vNode.l,
    thunk = vNode.m,
    same = false,
    i,
    lazyRefs,
    state;

  if (
    domNode !== undefined &&
    (state = _Morph_weakMap.get(domNode)) !== undefined &&
    state.lazy !== undefined
  ) {
    lazyRefs = state.lazy.l;
    i = lazyRefs.length;
    same = i === refs.length;
    while (same && --i >= 0) {
      same = lazyRefs[i] === refs[i];
    }
  }

  state = same ? vNode : thunk();
  state.lazy = vNode;
  return _Morph_morphNode(domNode, state, sendToApp, handleNonElmChild);
}

function _Morph_morphFacts(domNode, state, facts, sendToApp) {
  _Morph_morphEvents(domNode, state, facts, sendToApp);
  _Morph_morphStyles(domNode, state, facts.a1);
  _Morph_morphProperties(domNode, state, facts.a2);
  _Morph_morphAttributes(domNode, state, facts.a3);
  _Morph_morphNamespacedAttributes(domNode, state, facts.a4);
}

function _Morph_morphEvents(domNode, state, facts, sendToApp) {
  var //
    events = facts.a0,
    previousCallbacks = state.d.fns,
    callback,
    eventName,
    handler,
    oldCallback,
    oldHandler;

  for (eventName in events) {
    handler = events[eventName];
    oldCallback = previousCallbacks[eventName];

    if (oldCallback !== undefined) {
      oldHandler = oldCallback.q;
      if (oldHandler.$ === handler.$) {
        oldCallback.q = handler;
        oldCallback.r = sendToApp;
        facts.fns[eventName] = oldCallback;
        continue;
      }
      domNode.removeEventListener(eventName, oldCallback);
    }

    callback = _VirtualDom_makeCallback(sendToApp, handler);

    domNode.addEventListener(
      eventName,
      callback,
      _VirtualDom_passiveSupported && {
        passive: $elm$virtual_dom$VirtualDom$toHandlerInt(handler) < 2,
      }
    );

    facts.fns[eventName] = callback;
  }

  for (eventName in previousCallbacks) {
    if (!(eventName in events)) {
      domNode.removeEventListener(eventName, previousCallbacks[eventName]);
    }
  }
}

function _Morph_morphStyles(domNode, state, styles) {
  var //
    previousStyles = state.d.a1,
    key,
    value;

  for (key in styles) {
    value = styles[key];
    if (
      domNode.style.getPropertyValue(key) !== value ||
      domNode.style.getPropertyPriority(key) !== ""
    ) {
      domNode.style.setProperty(key, value);
    }
  }

  for (key in previousStyles) {
    if (!(key in styles)) {
      domNode.style.removeProperty(key);
    }
  }

  return value !== undefined;
}

function _Morph_morphProperties(domNode, state, properties) {
  var //
    previousProperties = state.d.a2,
    defaultDomNode,
    key,
    value;

  for (key in properties) {
    value = properties[key];
    if (domNode[key] !== value) {
      domNode[key] = value;
    }
  }

  for (key in previousProperties) {
    if (!(key in properties)) {
      if (defaultDomNode === undefined) {
        defaultDomNode = _VirtualDom_doc.createElementNS(
          domNode.namespaceURI,
          domNode.nodeName
        );
      }
      domNode[key] = defaultDomNode[key];
    }
  }
}

function _Morph_morphAttributes(domNode, state, attributes) {
  var //
    previousAttributes = state.d.a3,
    key,
    value;

  for (key in attributes) {
    value = attributes[key];
    if (domNode.getAttribute(key) !== value) {
      domNode.setAttribute(key, value);
    }
  }

  for (key in previousAttributes) {
    if (!(key in attributes)) {
      domNode.removeAttribute(key);
    }
  }
}

function _Morph_morphNamespacedAttributes(
  domNode,
  state,
  namespacedAttributes
) {
  var //
    previousNamespacedAttributes = state.d.a4,
    key,
    namespace,
    pair,
    previousNamespace,
    value;

  for (key in namespacedAttributes) {
    pair = namespacedAttributes[key];
    namespace = pair.f;
    value = pair.o;
    previousNamespace = previousNamespacedAttributes[key];
    if (previousNamespace !== undefined && previousNamespace !== namespace) {
      domNode.removeAttributeNS(previousNamespace, key);
    }
    if (domNode.getAttributeNS(namespace, key) !== value) {
      domNode.setAttributeNS(namespace, key, value);
    }
  }

  for (key in previousNamespacedAttributes) {
    if (!(key in namespacedAttributes)) {
      domNode.removeAttributeNS(namespace, key);
    }
  }
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
    facts = { a0: {}, a1: {}, a2: {}, a3: {}, a4: {}, fns: {} };
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

function runReplacements(code) {
  var newCode = replacements.reduce(strictReplace, code);
  return code.includes("Compiled in DEBUG mode")
    ? debuggerReplacements.reduce(strictReplace, newCode)
    : newCode;
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

overwrite(process.argv[2], runReplacements);
