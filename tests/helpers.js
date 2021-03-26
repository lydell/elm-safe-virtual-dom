const EVENTS = new Map();
const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function addEventListener(
  eventName,
  f,
  options
) {
  const normalized = normalizeEventListenerOptions(options);
  const elementListeners = EVENTS.get(this) || new Map();
  EVENTS.set(this, elementListeners);
  const eventListeners = elementListeners.get(eventName) || {
    capture: new Map(),
    bubble: new Map(),
  };
  elementListeners.set(eventName, eventListeners);
  const map = normalized.capture
    ? eventListeners.capture
    : eventListeners.bubble;
  const saved = map.get(f);
  if (saved !== undefined) {
    const same = Object.entries(normalized).every(
      ([key, value]) => saved[key] === value
    );
    if (same) {
      normalized.status = "unnecessary";
    } else {
      normalized.status = "changed";
      normalized.previous = saved;
    }
  } else {
    normalized.status = "added";
  }
  map.set(f, normalized);
  return originalAddEventListener.call(this, eventName, f, options);
};

EventTarget.prototype.removeEventListener = function addEventListener(
  eventName,
  f,
  options
) {
  const normalized = normalizeEventListenerOptions(options);
  const elementListeners = EVENTS.get(this);
  if (elementListeners !== undefined) {
    const eventListeners = elementListeners.get(eventName);
    if (eventListeners !== undefined) {
      const map = normalized.capture
        ? eventListeners.capture
        : eventListeners.bubble;
      const saved = map.get(f);
      if (saved !== undefined) {
        saved.status = "removed";
      }
    }
  }
  return originalRemoveEventListener.call(this, eventName, f, options);
};

function normalizeEventListenerOptions(options) {
  return !options || options === true
    ? {
        capture: Boolean(options),
        once: false,
        passive: false,
      }
    : {
        capture: Boolean(options.capture),
        once: Boolean(options.once),
        passive: Boolean(options.passive),
      };
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

function initElementChange() {
  return {
    addedNodes: [],
    removedNodes: [],
    addedAttributes: [],
    removedAttributes: [],
    changedAttributes: [],
  };
}

function stringify(node, records) {
  switch (node.nodeType) {
    // Text.
    case 3: {
      const change = records.get(node);
      if (change === undefined) {
        return JSON.stringify(node.data);
      }

      const string = `${JSON.stringify(change.oldValue)}🔀${JSON.stringify(
        node.data
      )}`;

      return change.oldValue === node.data ? unnecessary(string) : string;
    }

    // Element.
    case 1: {
      const change = records.get(node) || initElementChange();
      const startTag =
        node.namespaceURI === "http://www.w3.org/1999/xhtml"
          ? node.localName
          : `${node.namespaceURI}:${node.localName}`;
      const endTag = node.localName;
      return node.firstChild === null && change.removedNodes.length === 0
        ? `<${startTag}${stringifyAttributes(node, change)}/>`
        : `<${startTag}${stringifyAttributes(
            node,
            change
          )}>\n${stringifyChildren(node, change, records)}\n</${endTag}>`;
    }

    // Other.
    default:
      return `${node.nodeName} ${JSON.stringify(node.data)}`;
  }
}

function stringifyAttributes(element, change) {
  const items = [
    ...Array.from(element.attributes, (attr) => {
      const changed = change.changedAttributes.find(
        (attr2) =>
          attr2.name === attr.name && attr2.namespaceURI === attr.namespaceURI
      );

      if (changed !== undefined) {
        const string = `${attrName(attr)}=${JSON.stringify(
          changed.oldValue
        )}🔀${JSON.stringify(attr.value)}`;
        return changed.oldValue === attr.value ? unnecessary(string) : string;
      }

      const string = `${attrName(attr)}=${JSON.stringify(attr.value)}`;
      const inserted = change.addedAttributes.some(
        (attr2) =>
          attr2.name === attr.name && attr2.namespaceURI === attr.namespaceURI
      );
      return inserted ? added(string) : string;
    }),
    ...change.removedAttributes.map((attr) =>
      removed(`${attrName(attr)}=${JSON.stringify(attr.oldValue)}`)
    ),
    ...eventListenersForElement(element),
  ].map(indent);

  return items.length === 0 ? "" : `\n${items.join("\n")}\n`;
}

function eventListenersForElement(element) {
  const elementListeners = EVENTS.get(element);
  return elementListeners === undefined
    ? []
    : Array.from(
        elementListeners.entries()
      ).flatMap(([eventName, eventListeners]) => [
        ...eventListenersForElementHelper(eventName, eventListeners.capture),
        ...eventListenersForElementHelper(eventName, eventListeners.bubble),
      ]);
}

function eventListenersForElementHelper(eventName, map) {
  return Array.from(map.entries(), ([f, options]) => {
    const name = eventListenerName(eventName, options);

    switch (options.status) {
      case "added":
        options.status = "existing";
        return added(name);
      case "changed":
        options.status = "existing";
        return `${eventListenerName(eventName, options.previous)}🔀${name}`;
      case "unnecessary":
        options.status = "existing";
        return unnecessary(name);
      case "removed":
        map.delete(f);
        return removed(name);
      case "existing":
        return name;
      default:
        throw new Error(`Unknown event listener status: ${options.status}`);
    }
  });
}

function eventListenerName(eventName, options) {
  return [
    "on",
    eventName,
    ...Object.entries(options)
      .filter(([, value]) => value === true)
      .map(([key]) => key),
  ].join(":");
}

function attrName(attr) {
  return attr.namespaceURI === null
    ? attr.name
    : `${attr.namespaceURI}:${attr.name}`;
}

function stringifyChildren(element, change, records) {
  return [
    ...Array.from(element.childNodes, (node) =>
      change.addedNodes.includes(node)
        ? added(stringify(node, records))
        : stringify(node, records)
    ),
    ...change.removedNodes.map((node) => removed(stringify(node, records))),
  ]
    .map(indent)
    .join("\n");
}

function indent(string) {
  return string.replace(/^/gm, "  ");
}

function added(string) {
  return string.replace(/^/gm, "➕");
}

function removed(string) {
  return string.replace(/^/gm, "➖");
}

function unnecessary(string) {
  return string.replace(/^/gm, "️🚨");
}

class BrowserBase {
  constructor() {
    this._records = new Map();
  }

  _setupMutationObserver() {
    this._mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        switch (record.type) {
          case "characterData":
            this._records.set(record.target, { oldValue: record.oldValue });
            break;

          case "attributes": {
            const prev =
              this._records.get(record.target) || initElementChange();
            const attr = {
              name: record.attributeName,
              namespaceURI: record.attributeNamespace,
              oldValue: record.oldValue,
            };
            const value = record.target.getAttributeNS(
              record.attributeNamespace,
              record.attributeName
            );
            if (record.oldValue === null) {
              prev.addedAttributes.push(attr);
            } else if (value === null) {
              prev.removedAttributes.push(attr);
            } else {
              prev.changedAttributes.push(attr);
            }
            this._records.set(record.target, prev);
            break;
          }

          case "childList": {
            const prev =
              this._records.get(record.target) || initElementChange();
            prev.addedNodes.push(...record.addedNodes);
            prev.removedNodes.push(...record.removedNodes);
            this._records.set(record.target, prev);
            break;
          }

          default:
            throw new Error(`Unknown MutationRecord type: ${record.type}`);
        }
      }
    });

    this._mutationObserver.observe(this._getRoot(), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  serialize() {
    const string = stringify(this._getRoot(), this._records);
    this._records.clear();
    return string;
  }
}

class BrowserElement extends BrowserBase {
  constructor(elmModule, options) {
    super();
    this._wrapper = document.createElement("div");
    this._wrapper.append(options.node);
    this._setupMutationObserver();
    elmModule.init(options);
  }

  _getRoot() {
    return this._wrapper;
  }

  querySelector(selector) {
    return this._wrapper.firstChild.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._wrapper.firstChild.querySelectorAll(selector);
  }
}

class BrowserDocument extends BrowserBase {
  constructor(elmModule, options = undefined) {
    super();
    this._setupMutationObserver();
    elmModule.init(options);
  }

  _getRoot() {
    return document.body;
  }

  querySelector(selector) {
    return this._getRoot().querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._getRoot().querySelectorAll(selector);
  }

  serialize() {
    return [
      window.location.href,
      JSON.stringify(document.title),
      "",
      super.serialize(),
    ].join("\n");
  }
}

const domSnapshotSerializer = {
  test: (value) => value instanceof BrowserBase,
  print: (value) => value.serialize(),
};

function cleanupDocument() {
  while (document.body.firstChild) {
    document.body.firstChild.remove();
  }
  document.title = "";
  history.replaceState(null, "", "/");
}

module.exports = {
  BrowserDocument,
  BrowserElement,
  cleanupDocument,
  domSnapshotSerializer,
  nextFrame,
};
