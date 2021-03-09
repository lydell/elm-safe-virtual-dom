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

// The JavaScript we’re mucking with:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Browser.js
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Debugger.js
// https://github.com/elm/virtual-dom/blob/5a5bcf48720bc7d53461b3cd42a9f19f119c5503/src/Elm/Kernel/VirtualDom.js
var replacements = [
    // ### _Browser_element / _Browser_document
    [
      /var currNode = _VirtualDom_virtualize\((dom|body)Node\);/g,
      "var handleNonElmChild = args && args.handleNonElmChild || _Morph_defaultHandleNonElmChild;",
    ],
    ["var patches = _VirtualDom_diff(currNode, nextNode);", ""],
    [
      "domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp);",
      "domNode = _Morph_morphRootNode(domNode, nextNode, sendToApp, handleNonElmChild);",
    ],
    [
      "bodyNode = _VirtualDom_applyPatches(bodyNode, currNode, patches, sendToApp);",
      "bodyNode = _Morph_morphRootNode(bodyNode, nextNode, sendToApp, handleNonElmChild);",
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
        _Morph_defaultHandleNonElmChild,
        _Morph_morphRootNode,
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
  _Morph_weakMap.set(domNode, nextNode);
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
      actualVNode.key = vNode.key;
      return _Morph_morphNode(
        domNode,
        actualVNode,
        function (message, stopPropagation) {
          return sendToApp(tagger(message), stopPropagation);
        },
        handleNonElmChild
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
    _Morph_weakMap.set(domNode, vNode);
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

  state = same ? state : thunk();
  state.key = vNode.key;
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
