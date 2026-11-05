# Event listeners and Html.map

Consider the following code:

```elm
type Msg
    = ButtonClicked
    | GotSearchInput String
    | GotCommentInput Int String


view model =
    Html.div [ Html.Attributes.id "main" ]
        [ Html.button [ Html.Events.onClick ButtonClicked ]
            [ Html.text "Click me" ]
        , Html.input [ Html.Events.onInput GotSearchInput ] []
        , Html.div []
            (List.range 1 5
                |> List.map
                    (\i ->
                        Html.input [ Html.Events.onInput (GotCommentInput i) ] []
                    )
            )
        ]
```

`Html.Attributes.id "main"` is easy to diff. If both the old and new virtual DOM have the `id` attribute, check if they are both set to the same string. If not, update it.

`Html.Events.onClick ButtonClicked` is also easy to diff. `ButtonClicked` is just a value, so it can be compared, to know if the event listener needs to change.

What about `Html.Events.onInput GotSearchInput` then? `GotSearchInput` is a _function._ Functions cannot be compared in general. But this happens to be the _same function reference_ every time. So we can check for `===` reference equality in JavaScript to know if the event listener needs to change.

`Html.Events.onInput (GotCommentInput i)` is problematic, though. It returns a _new_ function every time due to the partial application. (A literal lambda function would also be a _new_ function every time.) We simply can’t know when it changes, so the event listener needs to change every time.

(And, on the lowest level, an event handler is just a pair of an event name and a _decoder_ (that results in a message). So when the original elm/virtual-dom compares your event handlers, it actually has to compare _decoders._ elm/json contains a hidden `_Json_equality` only for this reason. My fork does not need that function. Which is good, because it was buggy when it comes to comparing `Json.Decode.oneOf` for equality.)

Then we need to introduce `Html.map` to the mix as well. The original elm/virtual-dom assigns `domNode.elm_event_node_ref = eventNode`, where `eventNode` is an object with a clever system of references, where different layers of `Html.map` can mutate chains of objects that eventually results in that—when an event is triggered—all mapping functions can be applied. This system is pretty difficult to grasp, and can only be fully understood for a couple of seconds at a time. It also hides the infamous `Html.map` bug. All in all, this system avoids (at least theoretically) updating event listeners on every render. It also avoids having to recurse into lazy virtual nodes when they haven’t changed.

My fork takes a much simpler approach. Since properties like `value` and `checked` can be mutated by the web page user just by interacting with the page, we need to recurse into _all_ virtual DOM nodes (even if they are reference equal), to make sure that all properties match the virtual DOM. So my fork simply updates all event listeners every render. The diffing of event decoders (that the current elm/virtual-dom performs) often doesn’t work anyway, due to passing extra data in messages (which feels pretty common). But there is one case we’d want to avoid recursing deeply, for performance: `lazy`. So there are two tricks for `lazy` – we’ll come back to that.

What does “update an event listener” mean? The naive implementation would be to do `domNode.removeEventListener(eventName, oldListener); domNode.addEventListener(eventName, newListener)` on every render. That would be a bit slow, though. So the original elm/virtual-dom has always had a trick up its sleeve: It keeps the same event listener as before, and just mutates a reference to the latest event decoder. That’s much cheaper, and also what my fork does.

Let’s expand a bit about `lazy` nodes. The first thing `lazy` does is that your Elm function won’t be called unless the arguments change. The second thing is the virtual DOM diffing. If the arguments haven’t changed, then we’ll use the same virtual DOM as last time, which then by definition is unchanged. The original elm/virtual-dom then doesn’t look through that virtual DOM node at all, and just moves on to the next. My fork still needs to do _some_ work:

- `Html.map`: The basic rule is that event listeners need to be updated on every render, so they are run with the correct mapping functions. To avoid having to visit every node in a lazy subtree, my fork uses one clever mutation trick inspired by the original elm/virtual-dom. More on that at the end of this document. This trick isn’t used on _all_ nodes (only lazy nodes), because normally we visit all nodes anyway and can just update the event listeners normally.
- Properties like `value` and `checked` need to be made up-to-date, as mentioned above. Thanks to the above mutation trick for `Html.map`, we can use a specialized tree traversal that only updates properties. And it caches if there are any properties used at all to avoid as much work as possible. Remember, my fork of elm/html uses primarily _attributes,_ so if you used no properties at all in a lazy subtree, we can skip visiting altogether.

Then finally, how does `Html.map` work in my fork? Internally, Elm has a `sendToApp` function, which is used to dispatch a message, which will call `update` and `subscriptions` and then render. Well, this is what an event listener looks like:

```js
function callback(event) {
  var decoder = callback.decoder;
  var sendToApp = callback.sendToApp;
  var result = Json_runDecoder(decoder, event);
  if (!Result_isOk(result)) {
    return;
  }
  sendToApp(result.value);
}

domNode.addEventListener(eventName, callback);
```

You can see how it runs the event decoder, and if it succeeds calls `sendToApp` with the resulting message. Also notice how it reads `decoder` and `sendToApp` from properties on the function itself – these are the mutable references I mentioned before.

In the whole diffing and rendering process, we pass that `sendToApp` function down, so that it can eventually be used by an element with an event listener. All `Html.map` then needs to do is to wrap that `sendToApp` function to also apply the mapping function. A bit like this:

```js
function render(virtualDomNode, sendToApp) {
  if (virtualDomNode.$ === "Map") {
    return render(virtualDomNode.node, function (msg) {
      return sendToApp(virtualDomNode.f(msg));
    });
  }

  // Then handle all other virtual DOM node variants.
}
```

As mentioned above, `Html.map` wraps the `sendToApp` function in a lambda also calling the mapping function. When we reach a lazy node, `sendToApp` might be a function wrapped by `Html.map` multiple times. If only we could mutate the `sendToApp` function given to us last render (that the elements with event listeners use) … turns out we can! And it’s the same trick as I showed above: Create a function that just calls another function at a mutable property. Then we can mutate that property later.

Where to store a reference to the function, though (so we can mutate it later)? The first thought might be to store it on the virtual node. But it can be used in multiple spots in the tree, which all have different `Html.map` parents. The solution is to store it on the [`tNode`](./new-dom-node-pairing-algorithm.md), since it corresponds to one single spot in the tree. There’s just one wrinkle: We don’t create a `tNode` for every virtual node. Only for the ones that result in a DOM element. Lazy nodes and `Html.map` don’t. That means that for `lazy > map > lazy` we’re still at the same `tNode` when we come to the second lazy node. Both lazy nodes want to store their wrapped `sendToApp` in the same spot. We could use an array. But then we have to allocate an array for every `tNode`, even though nested lazy nodes in this way are uncommon. Instead, we pass down the _outer_ wrapped `sendToApp` until we reach an element node. So in `lazy > map > lazy`, the second lazy gets the wrapped `sendToApp` from the first lazy, and stores its own wrapped `sendToApp` on the first one: On another property on the function itself. It’s like a little linked list, optimized for the common case of having just one lazy node per `tNode`. When _calling_ the wrapped `sendToApp`s we don’t care about that property – that’s just a hacky way of storing them, so we can mutate them when diffing.
