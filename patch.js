/* global
  _Json_unwrap,
  _List_Cons,
  _List_Nil,
  _Morph_vNodes,
  _Morph_keys,
  _Morph_emptyFacts,
  _Morph_eventListeners,
  _VirtualDom_addClass,
  _VirtualDom_attribute,
  _VirtualDom_attributeNS,
  _VirtualDom_divertHrefToApp,
  _VirtualDom_doc,
  _VirtualDom_makeCallback,
  _VirtualDom_nodeNS,
  _VirtualDom_passiveSupported,
  _VirtualDom_text,
  $elm$virtual_dom$VirtualDom$toHandlerInt,
  A2,
  A3,
  A4,
  exports,
  F2,
  Map,
  Set,
*/

// The JavaScript we’re mucking with:
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Browser.js
// https://github.com/elm/browser/blob/1d28cd625b3ce07be6dfad51660bea6de2c905f2/src/Elm/Kernel/Debugger.js
// https://github.com/elm/virtual-dom/blob/5a5bcf48720bc7d53461b3cd42a9f19f119c5503/src/Elm/Kernel/VirtualDom.js
exports.replacements = [
  // ### _Browser_element / _Browser_document
  [
    /([ \t]*)var currNode = _VirtualDom_virtualize\((domNode|bodyNode)\);/g,
    [
      "$1var handleNonElmChild = args && args.handleNonElmChild || _Morph_defaultHandleNonElmChild;",
      "$1var timeLabel = args && args.time;",
      "$1_Morph_virtualize(document.createTreeWalker($2), args && args.virtualize || _Morph_defaultShouldVirtualize, typeof divertHrefToApp !== 'undefined' && divertHrefToApp);",
    ].join("\n"),
  ],
  ["var patches = _VirtualDom_diff(currNode, nextNode);", ""],
  [
    "domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp);",
    "domNode = _Morph_morphRootNode(domNode, nextNode, sendToApp, handleNonElmChild, timeLabel);",
  ],
  [
    "bodyNode = _VirtualDom_applyPatches(bodyNode, currNode, patches, sendToApp);",
    "bodyNode = _Morph_morphRootNode(bodyNode, nextNode, sendToApp, handleNonElmChild, timeLabel);",
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

  // ### _VirtualDom_keyedNodeNS
  [
    /var _VirtualDom_keyedNodeNS = F2\(function\(namespace, tag\)\r?\n\{(\r?\n([\t ][^\n]+)?)+\r?\n\}\);/,
    "var _VirtualDom_keyedNodeNS = " +
      _VirtualDom_keyedNodeNS.toString() +
      "();",
  ],

  // ### Insert functions
  [
    "var _VirtualDom_divertHrefToApp;",
    [
      "var _VirtualDom_divertHrefToApp;",
      "var _Morph_vNodes = _Morph_fakeWeakMap('__elmVNodes');",
      "var _Morph_keys = _Morph_fakeWeakMap('__elmKeys');",
      "var _Morph_eventListeners = _Morph_fakeWeakMap('__elmEventListeners');",
      "var _Morph_emptyFacts = { a0: undefined, a1: undefined, a2: undefined, a3: undefined, a4: undefined };",
      _Morph_fakeWeakMap,
      _Morph_defaultShouldVirtualize,
      _Morph_defaultHandleNonElmChild,
      _Morph_morphRootNode,
      _Morph_morphNode,
      _Morph_morphText,
      _Morph_morphElement,
      _Morph_addChildren,
      _Morph_addChildrenKeyed,
      _Morph_morphChildren,
      _Morph_morphChildrenKeyed,
      _Morph_morphChildrenKeyedMapped,
      _Morph_morphCustom,
      _Morph_morphMap,
      _Morph_morphLazy,
      _Morph_morphFacts,
      _Morph_morphEvents,
      _Morph_morphStyles,
      _Morph_morphProperties,
      _Morph_morphAttributes,
      _Morph_morphNamespacedAttributes,
      _Morph_virtualize,
      _Morph_virtualizeElement,
    ]
      .map(function (i) {
        return i.toString();
      })
      .join("\n\n"),
  ],

  // ### Don’t loop on errors during DOM diffing/patching.
  [
    "( _Browser_requestAnimationFrame(updateIfNeeded), draw(model), 1 )",
    "( state = 0, draw(model), _Browser_requestAnimationFrame(updateIfNeeded), 1 )",
  ],

  // ### https://github.com/elm/virtual-dom/issues/168
  [
    /var _VirtualDom_nodeNS = F2\(function\(namespace, tag\)\r?\n\{/,
    "$& tag = _VirtualDom_noScript(tag);",
  ],

  // ### https://github.com/elm/browser/issues/34
  [
    "!domNode.hasAttribute('download')",
    "!domNode.hasAttribute('download') && domNode.hasAttribute('href')",
  ],

  // ### https://github.com/elm/html/issues/228
  // Judging by how React does things, everything using `stringProperty` should use `attribute` instead.
  // https://github.com/facebook/react/blob/9198a5cec0936a21a5ba194a22fcbac03eba5d1d/packages/react-dom/src/shared/DOMProperty.js#L360-L383
  // Some property names and attribute names differ.
  // https://github.com/facebook/react/blob/9198a5cec0936a21a5ba194a22fcbac03eba5d1d/packages/react-dom/src/shared/DOMProperty.js#L265-L272
  [
    "$elm$html$Html$Attributes$stringProperty('acceptCharset')",
    "_VirtualDom_attribute('accept-charset')",
    true,
  ],
  [
    "$elm$html$Html$Attributes$stringProperty('className')",
    "_VirtualDom_attribute('class')",
    true,
  ],
  [
    "$elm$html$Html$Attributes$stringProperty('htmlFor')",
    "_VirtualDom_attribute('for')",
    true,
  ],
  // The rest should work fine as-is.
  // Except `value`. Typing into an input updates `.value`, but not the
  // attribute. Same thing if you alter `.value` with code.
  // (`.setAttribute("value", "x")` _only_ sets the attribute, not `.value`.)
  // See also:
  // https://github.com/facebook/react/issues/13525
  // https://github.com/facebook/react/issues/11896
  [
    /\$elm\$html\$Html\$Attributes\$stringProperty(,|\('(?!value)\w+'\))/g,
    "_VirtualDom_attribute$1",
    true,
  ],
];

exports.debuggerReplacements = [
  ["var currPopout;", ""],
  ["var cornerCurr = _VirtualDom_virtualize(cornerNode);", ""],
  ["var cornerPatches = _VirtualDom_diff(cornerCurr, cornerNext);", ""],
  [
    "cornerNode = _VirtualDom_applyPatches(cornerNode, cornerCurr, cornerPatches, sendToApp);",
    "cornerNode = _Morph_morphRootNode(cornerNode, cornerNext, sendToApp, handleNonElmChild);",
  ],
  ["cornerCurr = cornerNext;", ""],
  ["currPopout = undefined;", ""],
  ["currPopout || (currPopout = _VirtualDom_virtualize(model.popout.b));", ""],
  ["var popoutPatches = _VirtualDom_diff(currPopout, nextPopout);", ""],
  [
    "_VirtualDom_applyPatches(model.popout.b.body, currPopout, popoutPatches, sendToApp);",
    "_Morph_morphRootNode(model.popout.b.body, nextPopout, sendToApp, handleNonElmChild);",
  ],
  ["currPopout = nextPopout;", ""],
];

// This is like a `WeakMap`, but faster (at the time of writing).
// `x = fakeWeakMap('x')` can be replaced with `new WeakMap()` with no further changes.
function _Morph_fakeWeakMap(property) {
  return {
    has: function has(key) {
      return key[property] !== undefined;
    },
    get: function get(key) {
      return key[property];
    },
    set: function set(key, value) {
      key[property] = value;
    },
    delete: function delete_(key) {
      delete key[property];
    },
  };
}

function _Morph_defaultShouldVirtualize(node) {
  switch (node.nodeName) {
    case "SCRIPT":
    case "NOSCRIPT":
      return false;
    default:
      return true;
  }
}

function _Morph_defaultHandleNonElmChild(child, vNode, prevNode) {
  if (child.nodeName === "FONT") {
    if (
      vNode !== undefined &&
      prevNode !== undefined &&
      vNode.$ === 0 &&
      prevNode.$ === 0 &&
      vNode.a === prevNode.a
    ) {
      return vNode;
    }
    child.parentNode.removeChild(child);
  }
}

function _Morph_morphRootNode(
  domNode,
  nextNode,
  sendToApp,
  handleNonElmChild,
  timeLabel
) {
  if (timeLabel !== undefined) {
    console.time(timeLabel);
  }

  var newDomNode = _Morph_morphNode(
    document.createTreeWalker(domNode),
    nextNode,
    sendToApp,
    handleNonElmChild
  );

  if (newDomNode !== domNode && domNode.parentNode !== null) {
    domNode.parentNode.replaceChild(newDomNode, domNode);
  }

  if (timeLabel !== undefined) {
    console.timeEnd(timeLabel);
  }

  return newDomNode;
}

function _Morph_morphNode(treeWalker, vNode, sendToApp, handleNonElmChild) {
  switch (vNode.$) {
    // Html.text
    case 0:
      return _Morph_morphText(treeWalker, vNode);

    // Html.div etc
    case 1:
      return _Morph_morphElement(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild,
        _Morph_addChildren,
        _Morph_morphChildren
      );

    // Html.Keyed.node etc
    case 2:
      return _Morph_morphElement(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild,
        _Morph_addChildrenKeyed,
        _Morph_morphChildrenKeyed
      );

    // Markdown.toHtml etc
    case 3:
      return _Morph_morphCustom(treeWalker, vNode, sendToApp);

    // Html.map
    case 4:
      return _Morph_morphMap(treeWalker, vNode, sendToApp, handleNonElmChild);

    // Html.Lazy.lazy etc
    case 5:
      return _Morph_morphLazy(treeWalker, vNode, sendToApp, handleNonElmChild);

    default:
      throw new Error("Unknown vNode.$: " + vNode.$);
  }
}

function _Morph_morphText(treeWalker, vNode) {
  var //
    text = vNode.a,
    domNode = treeWalker !== undefined ? treeWalker.currentNode : undefined,
    prevNode;

  if (
    domNode !== undefined &&
    (prevNode = _Morph_vNodes.get(domNode)) !== undefined &&
    prevNode.$ === vNode.$
  ) {
    if (domNode.data !== text) {
      domNode.data = text;
    }
    _Morph_vNodes.set(domNode, vNode);
    return domNode;
  }

  domNode = _VirtualDom_doc.createTextNode(text);
  _Morph_vNodes.set(domNode, vNode);
  return domNode;
}

function _Morph_morphElement(
  treeWalker,
  vNode,
  sendToApp,
  handleNonElmChild,
  addChildren,
  morphChildren
) {
  var //
    nodeName = vNode.c,
    namespaceURI = vNode.f,
    facts = vNode.d,
    children = vNode.e,
    domNode = treeWalker !== undefined ? treeWalker.currentNode : undefined,
    prevNode;

  if (
    domNode !== undefined &&
    (prevNode = _Morph_vNodes.get(domNode)) !== undefined &&
    prevNode.$ === vNode.$ &&
    // It’s slower to compare to `domNode.localName` and `domNode.namespaceURI`.
    // Those are immutable so it’s fine to compare the vdom.
    prevNode.c === nodeName &&
    prevNode.f === namespaceURI
  ) {
    _Morph_morphFacts(domNode, prevNode, facts, sendToApp);
    if (treeWalker.firstChild() === null) {
      addChildren(domNode, children, sendToApp, handleNonElmChild);
    } else {
      morphChildren(
        treeWalker,
        domNode,
        vNode,
        prevNode,
        sendToApp,
        handleNonElmChild
      );
    }
    _Morph_vNodes.set(domNode, vNode);
    return domNode;
  }

  domNode =
    namespaceURI === undefined
      ? _VirtualDom_doc.createElement(nodeName)
      : _VirtualDom_doc.createElementNS(namespaceURI, nodeName);
  _Morph_vNodes.set(domNode, vNode);

  if (_VirtualDom_divertHrefToApp && nodeName === "a") {
    domNode.addEventListener("click", _VirtualDom_divertHrefToApp(domNode));
  }

  _Morph_morphFacts(domNode, undefined, facts, sendToApp);
  addChildren(domNode, children, sendToApp, handleNonElmChild);

  return domNode;
}

function _Morph_addChildren(parent, children, sendToApp, handleNonElmChild) {
  for (var i = 0; i < children.length; i++) {
    parent.appendChild(
      _Morph_morphNode(undefined, children[i], sendToApp, handleNonElmChild)
    );
  }
}

function _Morph_addChildrenKeyed(
  parent,
  children,
  sendToApp,
  handleNonElmChild
) {
  var //
    child,
    i,
    key,
    newDomNode,
    vNode;
  for (i = 0; i < children.length; i++) {
    child = children[i];
    key = child.a;
    vNode = child.b;
    newDomNode = _Morph_morphNode(
      undefined,
      vNode,
      sendToApp,
      handleNonElmChild
    );
    parent.appendChild(newDomNode);
    _Morph_keys.set(newDomNode, key);
  }
}

function _Morph_morphChildren(
  treeWalker,
  parent,
  parentVNode,
  parentPrevNode,
  sendToApp,
  handleNonElmChild
) {
  var //
    children = parentVNode.e,
    childrenLength = children.length,
    prevChildren = parentPrevNode.e,
    prevChildrenLength = prevChildren.length,
    j = 0,
    domNode,
    nextDomNode = treeWalker.currentNode,
    newDomNode,
    prevNode,
    returned,
    vNode;

  while (nextDomNode !== null) {
    domNode = nextDomNode;
    vNode = j < childrenLength ? children[j] : undefined;
    prevNode = _Morph_vNodes.get(domNode);
    if (prevNode === undefined) {
      nextDomNode = treeWalker.nextSibling();
      if (vNode !== undefined) {
        prevNode = j < prevChildrenLength ? prevChildren[j] : undefined;
        returned = handleNonElmChild(domNode, vNode, prevNode);
        if (returned === vNode) {
          j++;
        }
      } else {
        handleNonElmChild(domNode);
      }
    } else if (vNode !== undefined) {
      newDomNode = _Morph_morphNode(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild
      );
      nextDomNode = treeWalker.nextSibling();
      if (domNode !== newDomNode) {
        parent.replaceChild(newDomNode, domNode);
      }
      j++;
    } else {
      nextDomNode = treeWalker.nextSibling();
      parent.removeChild(domNode);
    }
  }

  for (; j < childrenLength; j++) {
    parent.appendChild(
      _Morph_morphNode(undefined, children[j], sendToApp, handleNonElmChild)
    );
  }

  treeWalker.parentNode();
}

// This runs from both ends as far as it can: https://neil.fraser.name/writing/diff/
// A swap can get us going again: https://github.com/localvoid/kivi/blob/master/lib/vnode.ts#L1288-L1318
// If we get stuck, use the slower _Morph_morphChildrenKeyedMapped technique for the rest.
function _Morph_morphChildrenKeyed(
  treeWalker,
  parent,
  parentVNode,
  parentPrevNode,
  sendToApp,
  handleNonElmChild
) {
  var //
    children = parentVNode.e,
    prevChildren = parentPrevNode.e,
    prevChildrenLength = prevChildren.length,
    i = 0,
    i2 = parent.childNodes.length - 1,
    j = 0,
    j2 = children.length - 1,
    child,
    domNode,
    domNode2,
    key,
    key2,
    prevKey,
    prevKey2,
    newDomNode,
    nextDomNode,
    prevNode,
    prevNode2,
    returned,
    stuck,
    vNode,
    vNode2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    stuck = false;

    while (i <= i2 && j <= j2) {
      domNode = treeWalker.currentNode;
      child = children[j];
      key = child.a;
      vNode = child.b;
      prevNode = _Morph_vNodes.get(domNode);
      prevKey = _Morph_keys.get(domNode);
      if (prevNode === undefined) {
        treeWalker.nextSibling();
        if (vNode !== undefined) {
          prevNode = j < prevChildrenLength ? prevChildren[j].b : undefined;
          returned = handleNonElmChild(domNode, vNode, prevNode);
          if (returned === vNode) {
            j++;
          }
        } else {
          handleNonElmChild(domNode);
        }
        if (domNode.parentNode === parent) {
          i++;
        } else {
          i2--;
        }
      } else if (key === prevKey) {
        newDomNode = _Morph_morphNode(
          treeWalker,
          vNode,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key);
        treeWalker.nextSibling();
        if (domNode !== newDomNode) {
          parent.replaceChild(newDomNode, domNode);
        }
        i++;
        j++;
      } else if (!parentVNode.keys.has(prevKey)) {
        treeWalker.nextSibling();
        parent.removeChild(domNode);
        i2--;
      } else if (
        parentPrevNode.keys !== undefined &&
        !parentPrevNode.keys.has(key)
      ) {
        newDomNode = _Morph_morphNode(
          undefined,
          vNode,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key);
        parent.insertBefore(newDomNode, domNode);
        i++;
        i2++;
        j++;
      } else {
        stuck = true;
        break;
      }
    }

    if (!stuck) {
      break;
    }

    stuck = false;
    treeWalker.currentNode = parent.childNodes[i2];

    while (i2 > i && j2 > j) {
      domNode2 = treeWalker.currentNode;
      child = children[j2];
      key2 = child.a;
      vNode2 = child.b;
      prevNode2 = _Morph_vNodes.get(domNode2);
      prevKey2 = _Morph_keys.get(domNode2);
      if (prevNode2 === undefined) {
        treeWalker.previousSibling();
        if (vNode !== undefined) {
          prevNode = j2 < prevChildrenLength ? prevChildren[j2].b : undefined;
          returned = handleNonElmChild(domNode, vNode, prevNode);
          if (returned === vNode) {
            j2--;
          }
        } else {
          handleNonElmChild(domNode);
        }
        if (domNode.parentNode === parent) {
          i2--;
        }
      } else if (key2 === prevKey2) {
        newDomNode = _Morph_morphNode(
          treeWalker,
          vNode2,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key);
        treeWalker.previousSibling();
        if (domNode2 !== newDomNode) {
          parent.replaceChild(newDomNode, domNode2);
        }
        i2--;
        j2--;
      } else if (!parentVNode.keys.has(prevKey2)) {
        treeWalker.previousSibling();
        parent.removeChild(domNode2);
        i2--;
      } else if (
        parentPrevNode.keys !== undefined &&
        !parentPrevNode.keys.has(key2)
      ) {
        newDomNode = _Morph_morphNode(
          undefined,
          vNode2,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key);
        parent.insertBefore(newDomNode, domNode2.nextSibling);
        i2--;
        j2--;
      } else {
        stuck = true;
        break;
      }
    }

    if (!stuck) {
      break;
    }

    if (key === prevKey2 && prevKey === key2) {
      // It’s a swap.
      treeWalker.currentNode = domNode2;
      newDomNode = _Morph_morphNode(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild
      );
      _Morph_keys.set(newDomNode, key);
      if (newDomNode === domNode2) {
        nextDomNode = domNode2.nextSibling;
        parent.replaceChild(newDomNode, domNode);
        treeWalker.currentNode = domNode;
        newDomNode = _Morph_morphNode(
          treeWalker,
          vNode2,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key2);
        parent.insertBefore(newDomNode, nextDomNode);
      } else {
        parent.replaceChild(newDomNode, domNode);
        treeWalker.currentNode = domNode;
        newDomNode = _Morph_morphNode(
          treeWalker,
          vNode2,
          sendToApp,
          handleNonElmChild
        );
        _Morph_keys.set(newDomNode, key2);
        parent.replaceChild(newDomNode, domNode2);
      }
      i++;
      j++;
      i2--;
      j2--;
    } else if (key === prevKey2) {
      // A node has been moved up.
      treeWalker.currentNode = domNode2;
      newDomNode = _Morph_morphNode(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild
      );
      _Morph_keys.set(newDomNode, key);
      parent.insertBefore(newDomNode, domNode);
      if (newDomNode !== domNode2) {
        parent.removeChild(domNode2);
      }
      i++;
      j++;
    } else if (prevKey === key2) {
      // A node has been moved down.
      treeWalker.currentNode = domNode;
      newDomNode = _Morph_morphNode(
        treeWalker,
        vNode2,
        sendToApp,
        handleNonElmChild
      );
      _Morph_keys.set(newDomNode, key2);
      parent.insertBefore(newDomNode, domNode2.nextSibling);
      if (newDomNode !== domNode) {
        parent.removeChild(domNode);
      }
      i2--;
      j2--;
    } else {
      _Morph_morphChildrenKeyedMapped(
        parent,
        treeWalker,
        parentVNode,
        children,
        sendToApp,
        handleNonElmChild,
        i,
        i2,
        j,
        j2
      );
      treeWalker.parentNode();
      return;
    }

    treeWalker.currentNode = parent.childNodes[i];
  }

  if (i2 >= 0) {
    treeWalker.currentNode = parent.childNodes[i2];
  }

  for (; i2 >= i; i2--) {
    domNode = treeWalker.currentNode;
    prevNode = _Morph_vNodes.get(domNode);
    treeWalker.previousSibling();
    if (prevNode === undefined) {
      handleNonElmChild(domNode);
    } else {
      parent.removeChild(domNode);
    }
  }

  for (; j2 >= j; j++) {
    child = children[j];
    key = child.a;
    vNode = child.b;
    newDomNode = _Morph_morphNode(
      undefined,
      vNode,
      sendToApp,
      handleNonElmChild
    );
    parent.appendChild(newDomNode);
    _Morph_keys.set(newDomNode, key);
  }

  treeWalker.parentNode();
}

function _Morph_morphChildrenKeyedMapped(
  parent,
  treeWalker,
  parentVNode,
  children,
  sendToApp,
  handleNonElmChild,
  i,
  i2,
  j,
  j2
) {
  var //
    map = new Map(),
    refDomNode = null,
    child,
    domNode,
    k,
    key,
    newDomNode,
    prevKey,
    prevNode,
    vNode;

  treeWalker.currentNode = parent.childNodes[i2];

  for (k = i2; k >= i; k--) {
    child = treeWalker.currentNode;
    prevNode = _Morph_vNodes.get(child);
    prevKey = _Morph_keys.get(child);
    treeWalker.previousSibling();
    if (prevNode === undefined) {
      handleNonElmChild(child);
    } else if (map.has(prevKey) || !parentVNode.keys.has(prevKey)) {
      parent.removeChild(child);
    } else {
      map.set(prevKey, child);
    }
  }

  refDomNode = parent.childNodes[i];

  for (; j <= j2; j++) {
    child = children[j];
    key = child.a;
    vNode = child.b;
    domNode = map.get(key);
    if (domNode !== undefined) {
      treeWalker.currentNode = domNode;
      newDomNode = _Morph_morphNode(
        treeWalker,
        vNode,
        sendToApp,
        handleNonElmChild
      );
      _Morph_keys.set(newDomNode, key);
      if (domNode !== newDomNode) {
        if (domNode === refDomNode) {
          parent.replaceChild(newDomNode, domNode);
        } else {
          parent.removeChild(domNode);
          parent.insertBefore(newDomNode, refDomNode);
        }
      } else if (
        newDomNode !== refDomNode &&
        newDomNode.nextSibling !== refDomNode
      ) {
        parent.insertBefore(newDomNode, refDomNode);
      }
    } else {
      newDomNode = _Morph_morphNode(
        undefined,
        vNode,
        sendToApp,
        handleNonElmChild
      );
      _Morph_keys.set(newDomNode, key);
      parent.insertBefore(newDomNode, refDomNode);
    }
    refDomNode = newDomNode.nextSibling;
  }
}

function _Morph_morphCustom(treeWalker, vNode, sendToApp) {
  var //
    facts = vNode.d,
    model = vNode.g,
    render = vNode.h,
    diff = vNode.i,
    domNode = treeWalker !== undefined ? treeWalker.currentNode : undefined,
    patch,
    prevNode;

  if (
    domNode !== undefined &&
    (prevNode = _Morph_vNodes.get(domNode)) !== undefined &&
    prevNode !== undefined &&
    prevNode.$ === vNode.$ &&
    prevNode.h === render
  ) {
    patch = diff(prevNode.g, model);
    if (patch !== false) {
      domNode = patch(domNode);
    }
    _Morph_morphFacts(domNode, prevNode, facts, sendToApp);
    return domNode;
  }

  domNode = render(model);
  _Morph_vNodes.set(domNode, vNode);
  _Morph_morphFacts(domNode, undefined, facts, sendToApp);
  return domNode;
}

function _Morph_morphMap(treeWalker, vNode, sendToApp, handleNonElmChild) {
  var //
    tagger = vNode.j,
    actualVNode = vNode.k;

  return _Morph_morphNode(
    treeWalker,
    actualVNode,
    function htmlMap(message, stopPropagation) {
      return sendToApp(tagger(message), stopPropagation);
    },
    handleNonElmChild
  );
}

function _Morph_morphLazy(treeWalker, vNode, sendToApp, handleNonElmChild) {
  var //
    refs = vNode.l,
    thunk = vNode.m,
    same,
    i,
    lazyRefs,
    prevNode;

  if (
    treeWalker !== undefined &&
    (prevNode = _Morph_vNodes.get(treeWalker.currentNode)) !== undefined &&
    prevNode.refs !== undefined
  ) {
    lazyRefs = prevNode.refs;
    i = lazyRefs.length;
    same = i === refs.length;
    while (same && --i >= 0) {
      same = lazyRefs[i] === refs[i];
    }
  }

  if (!same) {
    prevNode = thunk();
    prevNode.refs = refs;
  }

  return _Morph_morphNode(treeWalker, prevNode, sendToApp, handleNonElmChild);
}

function _Morph_morphFacts(domNode, prevNode, facts, sendToApp) {
  var prevFacts = prevNode === undefined ? _Morph_emptyFacts : prevNode.d;

  // All of these are diffed against the previous virtual DOM rather than the
  // actual DOM in some cases. This means that:
  // - There might be excess events/styles/properties/attributes set by scripts or extensions.
  // - Events/styles/properties/attributes might be set to something else or be removed by scripts or extensions.
  // - Styles might be changed to `!important`.
  // - Attributes _could_ use `.getAttribute()` to compare to the actual DOM,
  //   but it’s slow.
  // - Properties actually _do_ compare to the actual DOM too – see `_Morph_morphProperties`.

  // It’s not possible to inspect an elements event listeners.
  if (facts.a0 !== undefined || prevFacts.a0 !== undefined) {
    _Morph_morphEvents(domNode, facts.a0 || {}, sendToApp);
  }

  // It’s hard to find which styles have been changed. They are also normalized
  // when set, so `style[key] === domNode.style[key]` might _never_ be true!
  if (facts.a1 !== undefined || prevFacts.a1 !== undefined) {
    _Morph_morphStyles(domNode, prevFacts.a1 || {}, facts.a1 || {});
  }

  // Basically the same as styles, but also see the comment in this function.
  if (facts.a2 !== undefined || prevFacts.a2 !== undefined) {
    _Morph_morphProperties(domNode, prevFacts.a2 || {}, facts.a2 || {});
  }

  // There is a `.attributes` property, but `.type = "email"` adds a
  // `type="email"` attribute that we shouldn’t remove.
  if (facts.a3 !== undefined || prevFacts.a3 !== undefined) {
    _Morph_morphAttributes(domNode, prevFacts.a3 || {}, facts.a3 || {});
  }
  if (facts.a4 !== undefined || prevFacts.a4 !== undefined) {
    _Morph_morphNamespacedAttributes(
      domNode,
      prevFacts.a4 || {},
      facts.a4 || {}
    );
  }
}

function _Morph_morphEvents(domNode, events, sendToApp) {
  var //
    callbacks = _Morph_eventListeners.get(domNode),
    callback,
    eventName,
    handler,
    oldCallback,
    oldHandler;

  if (callbacks === undefined) {
    callbacks = {};
    _Morph_eventListeners.set(domNode, callbacks);
  }

  for (eventName in events) {
    handler = events[eventName];
    oldCallback = callbacks[eventName];

    if (oldCallback !== undefined) {
      oldHandler = oldCallback.q;
      if (oldHandler.$ === handler.$) {
        oldCallback.q = handler;
        oldCallback.r = sendToApp;
        callbacks[eventName] = oldCallback;
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

    callbacks[eventName] = callback;
  }

  for (eventName in callbacks) {
    if (!(eventName in events)) {
      domNode.removeEventListener(eventName, callbacks[eventName]);
    }
  }
}

function _Morph_morphStyles(domNode, previousStyles, styles) {
  var //
    key,
    value;

  for (key in styles) {
    value = styles[key];
    if (value !== previousStyles[key]) {
      // Support `Html.Attributes.style "borderRadius" "5px"`.
      // `.setProperty` requires "border-radius" with a dash.
      if (key in domNode.style) {
        domNode.style[key] = value;
      } else {
        domNode.style.setProperty(key, value);
      }
    }
  }

  for (key in previousStyles) {
    if (!(key in styles)) {
      if (key in domNode.style) {
        domNode.style[key] = "";
      } else {
        domNode.style.removeProperty(key);
      }
    }
  }
}

function _Morph_morphProperties(domNode, previousProperties, properties) {
  var //
    defaultDomNode,
    key,
    value;

  for (key in properties) {
    value = properties[key];
    // `value`, `checked`, `selected` and `selectedIndex` can all change via user
    // interactions, so for those it’s important to compare to the actual DOM
    // value. Other properties, such as `type`, is normalized, so a bad `type`
    // property causes re-assignment every re-render. But that shouldn’t matter
    // much: You should use `attribute` for that property, and if this becomes a
    // performance problem (which I doubt) you could just set the
    // normalized/correct value from the start.
    // As an example, `.type = "foo"` is normalized to `"text"`.
    if (value !== domNode[key]) {
      domNode[key] = value;
    }
  }

  for (key in previousProperties) {
    if (!(key in properties)) {
      if (defaultDomNode === undefined) {
        defaultDomNode = _VirtualDom_doc.createElementNS(
          domNode.namespaceURI,
          domNode.localName
        );
      }
      domNode[key] = defaultDomNode[key];
    }
  }
}

function _Morph_morphAttributes(domNode, previousAttributes, attributes) {
  var //
    key,
    value;

  for (key in attributes) {
    value = attributes[key];
    if (value !== previousAttributes[key]) {
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
  previousNamespacedAttributes,
  namespacedAttributes
) {
  var //
    key,
    namespace,
    pair,
    previous,
    value;

  for (key in namespacedAttributes) {
    pair = namespacedAttributes[key];
    namespace = pair.f;
    value = pair.o;
    previous = previousNamespacedAttributes[key];
    if (previous === undefined) {
      domNode.setAttributeNS(namespace, key, value);
    } else if (previous.f !== namespace) {
      domNode.removeAttributeNS(previous, key);
      domNode.setAttributeNS(namespace, key, value);
    } else if (value !== previous.o) {
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
    facts = {
      a0: undefined,
      a1: undefined,
      a2: undefined,
      a3: undefined,
      a4: undefined,
    };
    factList.b;
    factList = factList.b // WHILE_CONS
  ) {
    entry = factList.a;
    tag = entry.$;
    key = entry.n;
    value = tag === "a2" ? _Json_unwrap(entry.o) : entry.o;
    subFacts = facts[tag];
    if (subFacts === undefined) {
      subFacts = {};
      facts[tag] = subFacts;
    }
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

function _VirtualDom_keyedNodeNS() {
  return F2(function (namespace, tag) {
    return F2(function (factList, kidList) {
      var kid,
        kids = [],
        keys = new Set(),
        descendantsCount = 0;
      for (; kidList.b; kidList = kidList.b) {
        kid = kidList.a;
        descendantsCount += kid.b.b || 0;
        kids.push(kid);
        keys.add(kid.a);
      }
      descendantsCount += kids.length;

      return {
        $: 2,
        c: tag,
        d: _VirtualDom_organizeFacts(factList),
        e: kids,
        f: namespace,
        b: descendantsCount,
        keys: keys,
      };
    });
  });
}

function _Morph_virtualize(treeWalker, shouldVirtualize, divertHrefToApp) {
  var //
    node = treeWalker.currentNode,
    vNode;

  switch (node.nodeType) {
    case 3:
      if (shouldVirtualize(node)) {
        vNode = _VirtualDom_text(node.textContent);
        _Morph_vNodes.set(node, vNode);
        return vNode;
      } else {
        return undefined;
      }

    case 1:
      if (shouldVirtualize(node)) {
        return _Morph_virtualizeElement(
          treeWalker,
          shouldVirtualize,
          divertHrefToApp
        );
      } else {
        return undefined;
      }

    // Skip other types of nodes (comment nodes).
    default:
      return undefined;
  }
}

function _Morph_virtualizeElement(
  treeWalker,
  shouldVirtualize,
  divertHrefToApp
) {
  var //
    attrList = _List_Nil,
    kidList = _List_Nil,
    element = treeWalker.currentNode,
    attr,
    i,
    vNode;

  for (i = element.attributes.length - 1; i >= 0; i--) {
    attr = element.attributes[i];
    attrList = _List_Cons(
      attr.namespaceURI === null
        ? A2(_VirtualDom_attribute, attr.name, attr.value)
        : A3(_VirtualDom_attributeNS, attr.namespaceURI, attr.name, attr.value),
      attrList
    );
  }

  if (treeWalker.lastChild() !== null) {
    do {
      vNode = _Morph_virtualize(treeWalker, shouldVirtualize, divertHrefToApp);
      if (vNode !== undefined) {
        kidList = _List_Cons(vNode, kidList);
      }
    } while (treeWalker.previousSibling() !== null);
    treeWalker.currentNode = element;
  }

  // Fixes https://github.com/elm/browser/issues/105
  if (divertHrefToApp && element.localName === "a") {
    element.addEventListener("click", divertHrefToApp(element));
  }

  vNode = A4(
    _VirtualDom_nodeNS,
    element.namespaceURI === "http://www.w3.org/1999/xhtml"
      ? undefined
      : element.namespaceURI,
    element.localName,
    attrList,
    kidList
  );
  _Morph_vNodes.set(element, vNode);
  return vNode;
}
