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

(And, on the lowest level, an event handler is just a pair of an event name and a _decoder_ (that results in a message). So when the original elm/virtual-dom compares your event handlers, it actually has to compare _decoders._ elm/json contains a hidden `_Json_equality` only for this reason. My fork does not need that function.)

Then we need to introduce `Html.map` to the mix as well. The original elm/virtual-dom assigns `domNode.elm_event_node_ref = eventNode`, where `eventNode` is an object with a clever system of references, where different layers of `Html.map` can mutate chains of objects that eventually results in that—when an event is triggered—all mapping functions can be applied. This system is pretty difficult to grasp, and can only be fully understood for a couple of seconds at a time. It also hides the infamous `Html.map` bug. All in all, this system avoids (at least theoretically) updating event listeners on every render. It also avoids having to recurse into lazy virtual nodes when they haven’t changed.

My fork takes a much simpler approach. As mentioned in [New DOM node pairing algorithm](./new-dom-node-pairing-algorithm.md), my fork needs to recurse into _all_ virtual DOM nodes anyway, even into lazy nodes. And the diffing of event decoders often doesn’t work anyway, due to passing extra data in messages (that feels pretty common). So my fork simply updates all event listeners every render.

What does “update an event listener” mean? The naive implementation would be to do `domNode.removeEventListener(eventName, oldListener); domNode.addEventListener(eventName, newListener)` on every render. That would be a bit slow, though. So the original elm/virtual-dom has always had a trick up its sleeve: It keeps the same event listener as before, and just mutates a reference to the latest event decoder. That’s much cheaper, and also what my fork does.

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
