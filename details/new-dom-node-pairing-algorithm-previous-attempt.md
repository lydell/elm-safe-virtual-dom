# New DOM node pairing algorithm – _previous_ attempt

> [!NOTE]  
> This is a _previous_ attempt at a new DOM node pairing algorithm. This is _not_ what is used in the latest version of my elm/virtual-dom fork. I’ve kept this documentation to showcase how complex it became. The new algorithm is in the [New DOM node pairing algorithm](./new-dom-node-pairing-algorithm.md) document.

I’ll explain the algorithm by starting from a simple conceptual model, building up to the full complexity. A bit like how atoms have multiple, simplified models that are true enough to understand different parts of chemistry.

First, what does the `Html msg` type look like in Elm? It’s actually implemented in JavaScript, but if it were Elm, it would look a bit like this:

```elm
type Html msg
    = Text String
    | Element String (List (Attribute msg)) (List (Html msg))
    | Keyed String (List (Attribute msg)) (List ( String, Html msg ))
    | Map (a -> msg) (Html a)
    | Lazy (b -> Html msg) b
```

(Hand-waving away that the `a` and `b` type variables aren’t declared.)

The first important thing to realize is that `Html.map` does not “do” anything straight away. It is represented as another node in the tree, and your mapping function is applied later. A `Map` node is not associated with any DOM node – it’s a wrapper around another node which in turn might be.

`Html.Lazy` also creates new nodes wrapping other nodes. It isn’t associated with a DOM node either.

But `Text` (`Html.text`), `Element` (for example `Html.div`) and `Keyed` (for example `Html.Keyed.ul`) all _are_ associated with a DOM node. Each one of those are supposed to have (or get) a corresponding DOM node on the page. The idea is to store the DOM on the virtual DOM node itself, so it always has a reference to it.

As I said before, the `Html msg` type isn’t implemented in Elm, but in JavaScript. So an `Element` looks conceptually like this:

```js
var node = {
  $: "Element",
  tag: "div",
  attributes: [],
  children: [],
};
```

The idea is extend that to:

```js
var node = {
  $: "Element",
  tag: "div",
  attributes: [],
  children: [],
  domNode: undefined,
};
```

Then, when we diff the old and new virtual DOM, we would diff these two:

```js
var oldVirtualNode = {
  $: "Element",
  tag: "div",
  attributes: [],
  children: [],
  domNode: div, // Reference to a div on the page.
};

var newVirtualNode = {
  $: "Element",
  tag: "div",
  attributes: [{ name: "id", value: "my-id" }],
  children: [],
  domNode: undefined,
};
```

The diffing algorithm is basically unchanged in my fork. It will detect that in this case, we should set the `id` attribute to `my-id`. The original elm/virtual-dom then creates a patch object describing this. My fork instead immediately applies the change to the `domNode` reference of the old virtual DOM object. It then sets `newVirtualNode.domNode = oldVirtualNode.domNode`.

This means that my version never needs to walk the DOM to find which DOM node to apply the patch to. It just has a reference to the correct DOM node. Then it doesn’t matter what a browser extension does to the page, we can still perform the mutation.

Now to the first complication of this beautifully simple model. Imagine you making this constant in your Elm code and then rendering that in a bunch of different places:

```elm
editIcon : Html msg
editIcon =
    Html.img [ Html.Attributes.src "/edit.svg" ] []


view : Model -> Html msg
view model =
    Html.div []
        [ editIcon
        , editIcon
        ]
```

In a more realistic example, there’d be something next to the edit icons as well, and they’d be buttons that edit those things, but let's keep it simple. What happens when you refer to `editIcon` multiple times? Well, the above will be represented roughly like this in JavaScript:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],
  domNode: undefined,
};

var view = function (model) {
  return {
    $: "Element",
    tag: "div",
    attributes: [],
    children: [editIcon, editIcon],
    domNode: undefined,
  };
};
```

`editIcon` is represented by a JavaScript object. In `view` we point to it twice. The `children` array in `view` contains the same `editIcon` object twice. And they are not just _equal,_ they are _the same reference._

But in the actual DOM, they need one unique DOM node each. The exact same DOM node cannot be inserted at multiple places in the DOM. If you try to insert the same DOM node twice, it _moves_ the DOM node there.

That’s a problem because when we render the first `editIcon` for the first time, we create an `img` DOM node, and then store it on the virtual DOM node itself. So the `editIcon` object would mutate to:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],
  domNode: img, // Reference to the `img` DOM node we just made.
};
```

But then we go and render `editIcon` the _second_ time (remember, `view` refers to it twice). Then we create a new `img` DOM node again, and then _overwrite_ `editIcon.domNode` with the new one, losing the other one. Oops!

The way I solved this is by having an _array_ of DOM nodes on the virtual DOM node instead. So `editIcon` would start out like this:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],
  domNodes: [],
};
```

And after the first render it would become:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],
  domNodes: [img1, img2], // References to the two DOM nodes on the page.
};
```

This `editIcon` constant has one more quirk to it. While most virtual DOM nodes are created during each `view` and then garbage collected, the `editIcon` constant is … constant. It’s the same virtual DOM node reference, render after render. That means that when we diff, `oldVirtualDomNode === newVirtualDomNode`. The old and new virtual DOM node are … the exact same object. Which means that the `domNodes` array is the same array too – mutating one mutates the other. For this reason, I add more than just `domNodes` to the virtual nodes:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],

  // We only read from `x.oldDomNodes`. Uses `i`. Is set to `newDomNodes` at each render.
  oldDomNodes: [],
  // This is set to a new, empty array on each render. We push to `y.newDomNodes`.
  newDomNodes: [],
  // We have a global render counter. By comparing it with this number, we know if we have encountered a virtual DOM node for the first time during a render.
  renderedAt: 0,
  // The index of the next DOM node in `oldDomNodes` to use.
  i: 0,
};
```

So, we keep track of both the old DOM nodes and the new DOM nodes, and have an index `i` which points to how far into `oldDomNodes` we have gotten. `renderedAt` is used to “reset” between renders. At the end of a render, `i` will be at least `1` for all virtual DOM nodes, and `newDomNodes` will contain at least one DOM node. We _could_ then go through the entire virtual DOM again, to reset `i` back to 0, move `newDomNodes` to `oldDomNodes`, and set `newDomNodes` to a new empty array. But that would require us to traverse the whole thing one additional time. Instead, we increment a global counter right before render. If `renderedAt !== globalRenderCount`, it means that we should reset and set `renderedAt = globalRenderCount` before incrementing `i` etc.

This design imposes a rule: On each render, we always have to recurse through the _entire_ old virtual DOM – in depth first order – to “discover” all uses of each virtual DOM node, and increase that `i` counter each time. This is a difference compared to the original elm/virtual-dom package, that is worth mentioning from a performance perspective:

- A common case is that both the old and new virtual DOM are _very_ similar. There might be just a single change in one place, maybe just a text change or an attribute change. In this case, the diffing algorithm will naturally visit _every_ virtual DOM node to find this.

- When a virtual DOM node is only present in the _old_ virtual DOM, it means that it was removed. The original elm/virtual-dom then has no need to recurse through all the children of that virtual DOM node. My fork still needs to do that though, to increment the `i` counter of every virtual DOM node inside the removed one, in case one of them is used again later. Note that this doesn’t use the regular diffing recursive function, it uses a special function that recurses the virtual DOM just for this use case as quickly as possible.

- When a virtual DOM node is only present in the _new_ virtual DOM, it means that it was inserted. Both implementations then need to recurse through all the children of the new virtual DOM node, to render all of the elements, of course. No change there.

- When two virtual DOM nodes are for different elements (one is a `<div>`, the other is a `<p>`), both implementations bail out, by removing the old DOM node completely and then rendering the new one fresh. This is just like a removal followed by an insertion, so my fork needs to recurse through the old virtual DOM node here too, while the original elm/virtual-dom does not need that.

- Finally, lazy nodes. The first thing `lazy` does is that your Elm function won’t be called unless the arguments change. The second thing is the virtual DOM diffing. If the arguments haven’t changed, then we’ll use the same virtual DOM as last time, which then by definition is unchanged. The original elm/virtual-dom then doesn’t need to look through that virtual DOM node at all, it you can just move on to the next. My fork still needs to recurse through it, for two reasons. The first one is similar to node removals: To increment the `i` counter in case a virtual DOM node used inside the lazy node is used again later. The second reason is due to `Html.map` – see the section about `Html.map`. Just like when recursing removed virtual DOM nodes, recursing lazy nodes also has a fast path function that only increments the `i` counter and makes sure event listeners are up-to-date. This means that `lazy` is slightly less lazy with my fork.

The shape closest to reality of virtual DOM nodes is actually this:

```js
var editIcon = {
  $: "Element",
  tag: "img",
  attributes: [{ name: "src", value: "/edit.svg" }],
  children: [],
  _1: {
    oldDomNodes: [],
    newDomNodes: [],
    renderedAt: 0,
    i: 0,
  },
};
```

It’s the same as before, except that I’ve put all the extra DOM node bookkeeping properties in an object inside the `_1` field. This is done for two reasons:

1. I can make the `_1` field _non-enumerable._ That means it won’t appear in a `for (key in object)` loop. Elm uses such a loop in its equality function (used by `(==)`). You are not supposed to use `(==)` on `Html msg` values, but in case someone is, by making my additions to the virtual DOM node non-enumerable I haven’t changed the behavior of `(==)`.

2. The field is called `_1`, but there can also be `_2` and `_3` etc. This is because if you define a constant like `none = Html.text ""` and use it in _multiple app instances,_ each app instance needs its own set of DOM bookkeeping. Each app instance needs to reference different DOM nodes.

   To be clear, having multiple app instances means initializing the same app more than once (like calling `window.Elm.MyProgram.init({ node: node1 })` and `window.Elm.MyProgram.init({ node: node2 })`, or compiling multiple apps into one JavaScript file (`elm make src/Program1.elm src/Program2.elm --output bundle.js`) and initializing both.

   App instances are kept track of by setting `rootDomNode.elmInstance` to a number. It is set during virtualization, by incrementing a “global” counter and setting the field. When rendering, use the number at `rootDomNode.elmInstance`. (There’s also a field called `rootDomNode.elmRenderCount` which is initialized the same way.)

In summary, we started at the beautifully simple idea: “What if virtual DOM nodes simply had a reference to their real DOM node?” Then we learned that since virtual DOM nodes can be used more than once it’s not that simple.

- `let separator = Html.hr [] [] in List.repeat 5 separator` results in `separator` being used 5 times. This requires us to store an _array_ of DOM nodes on the `separator` virtual DOM node value.
- A _top-level_ `separator = Html.hr [] []` also requires us to have _two_ arrays of DOM nodes (old and new), since the `separator` value won’t be a “freshly made” value for just one render – it’s the exact same object reference forever.
- A top-level constant used by _multiple app instances_ requires us to have _app instance specific_ DOM node arrays, so each app instance can keep track of their own DOM nodes.

In addition to the DOM node arrays, we have an `i` index that keeps track of how far into the DOM node arrays we are. And we have `renderedAt` which avoids having to reset `i` and “move new to old” in a separate tree traversal after each render (it’s instead done during the _next_ render).

So, why did I abandon this approach in the end, after putting this much effort in it? Well, I ran into a problem that was the straw the broke the camel’s back, and then was lucky to think of a much simpler and more robust solution.

Earlier in this document, I mentioned how on each render, we always have to recurse through the _entire_ old virtual DOM **– in depth first order –** to “discover” all uses of each virtual DOM node, and increase that `i` counter each time. Turns out that’s really bad for `Keyed` nodes, because there you _don’t_ want to visit everything in order! Many times we need to jump around among the children, to match re-ordered elements with the same key. I had implemented [a nice keyed algorithm](./html-keyed.md), not realizing it wouldn’t quite work since it didn’t visit everything in the correct order. This was the final issue before I figured out the new way of doing things.
