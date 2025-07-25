# Virtualization

Virtualization in elm/virtual-dom has a bunch of problems:

- It basically breaks down as soon as you use `Html.map` or `Html.Lazy`. It is _very_ common to have `Html.map` near the top of your Elm application, so this effectively results in most server-side rendered applications having no use of the virtualization at all – it’s just going to re-render the entire page. This is because `Html.map` and `Html.Lazy` are nodes in the _virtual_ DOM tree, but not in the actual DOM tree. When just seeing the HTML, the virtualize function can’t know where the map and lazy nodes should be. The original elm/virtual-dom bails diffing if it tries to diff two virtual DOM nodes of different types (such as an `Element` node vs a `Map` node). My version instead consumes all map and lazy nodes from each side until we get to text and element nodes – then the actual diffing starts.

- It does not support textarea. Textarea elements are weird. You are supposed to add default text as _children_ of `<textarea>` in HTML, but in JavaScript (and therefore Elm), you are supposed to set `textarea.value` instead (updating the children does nothing). My fork handles this “children to value” conversion.

- Attributes vs properties. It virtualizes all attributes on the element as attributes in Elm (`Html.Attributes.attribute`), but most string attributes are actually implemented as _properties_ in Elm (`Html.Attributes.property`). I’ve fixed this by changing elm/html to mostly use attributes instead (read more about it in the elm/html section below).

- Functions in `Html.Attributes` that take a `Bool` still need to be implemented as _properties._ However, some of them have different casing as an attribute vs an a property, such as `readonly` vs `readOnly`. I’ve went through all boolean attributes and added a lookup object of the non-esoteric ones with different casing.

- The `style` attribute needs to be turned back to each `Html.Attribute.style` call, and not be a single `style` attribute. My fork solves this.

- It doesn’t virtualize namespaced elements and attributes correctly (needed for SVG).

- It does not add click listeners on `<a>` elements for `Browser.application`.

- My fork only virtualizes text nodes, and elements with the `data-elm` attribute. This allows third-party scripts to add elements to (for example) `<body>` before Elm initializing, with having Elm remove them during initialization.
