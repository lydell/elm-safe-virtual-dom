# Breaking changes

I haven’t changed the Elm interface at all (no added functions, no changed functions, no removed functions, or types). All behavior _except two details_ should be equivalent, except less buggy.

The goal was to be 100 % backwards compatible. For some people, it is. For others, there are three changes that are in “breaking change territory” which can be summarized as: [Elm no longer empties the mount element](#elm-no-longer-empties-the-mount-element), [Properties are diffed against the _real_ DOM](#properties-are-diffed-against-the-real-dom) and [setters should have getters on custom elements](#setters-should-have-getters-on-custom-elements).

## Elm no longer empties the mount element

To be more compatible with third-party scripts, my fork changes how Elm “virtualizes” elements. My fork only virtualizes elements with the `data-elm` attribute (instead of _all_ child elements), and lets any other elements be. It often felt like Elm would “empty” your element on first render, but that’s not actually the case. It “virtualizes” the element, and then updates it to match your `view` function. That often results in whatever was there already being removed, but if you happened to already have an element of the right type in the right place, it would just be mutated to match `view`.

This results in:

- If you have an element like `<p>Looks like JavaScript hasn’t run?</p>` and expect Elm to remove it, that won’t happen now. To fix, you can put `data-elm` on it: `<p data-elm>`.
- If you use CSS selectors like `body > :first-child`, `body > :last-child` or `h1 + p`, they might not apply, since your `<script>` tags in `<body>` might still be around, and might be mixed with the elements rendered by Elm.
- If you do server-side rendering and expect Elm to hydrate/virtualize/adopt/take charge over the server-side rendered HTML, you need to make sure that all elements (except the root element) has `data-elm`. If you create the HTML with Elm (such as with elm-pages), you’ll get this automatically when you use my forks. But if you create elements some other way, make sure they have `data-elm`.

### Comprehensive `Browser.application` example

Given this HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My app</title>
  </head>
  <body>
    <script src="/elm.js"></script>
    <script>
      Elm.Main.init();
    </script>
  </body>
</html>
```

You’d previously end up with this after Elm initializes:

```html
<body>
  <h1>Welcome to my app!</h1>
  <p>It is a very cool app.</p>
</body>
```

With my forks you end up with:

```html
<body>
  <h1>Welcome to my app!</h1>
  <script src="/elm.js"></script>
  <p>It is a very cool app.</p>
  <script>
    Elm.Main.init();
  </script>
</body>
```

Why are the script tags kept? And why are they mixed with the other elements like that?

The script tags are kept because preserving all elements inside the mount element is the new strategy. You probably don’t care about those script tags (they aren’t needed anymore after their scripts have loaded), but you probably care about elements inserted by third-party scripts. For example, your page might look like this before your Elm application initializes:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My app</title>
    <!-- Inserts the iframe at the bottom. -->
    <script src="https://example.com/chat-widget.js"></script>
  </head>
  <body>
    <script src="/elm.js"></script>
    <script>
      Elm.Main.init();
    </script>
    <iframe src="https://example.com/chat.html"></iframe>
  </body>
</html>
```

Many times, it’s difficult to predict or ensure which order scripts run in. Maybe you’re lucky and 99 % of the time Elm initializes _before_ the chat widget. The remaining 1 % of visitors don’t get any chat. With my forks, it doesn’t matter which order things load. The chat won’t be nuked.

But why do the elements mix with the script tags like that? It’s because of whitespace in HTML. We typically indent our HTML nicely, like we do in most programming languages. However, HTML doesn’t have a concept of whitespace and indentation, really. It just has text content inside elements. If you make a line break and a bunch of spaces for indentation in your HTML, you actually create a text DOM node with just whitespace in it. But typically you can’t see that, due to CSS. By default, whitespace is displayed collapsed as one space, and around block elements you don’t see them at all. It’s just between words and inline elements that they matter. You can control this with the CSS `white-space` property, and the `<pre>` element has `white-space` set to display all newlines and spaces by default.

Anyway, what does all that mean to the HTML in this example? Let’s look at it again:

```html
<body>
  <script src="/elm.js"></script>
  <script>
    Elm.Main.init();
  </script>
</body>
```

That parses to a `body` DOM node with the following children:

1. A text node containing a newline and a bunch of spaces.
2. A script node (with `src`).
3. A text node containing a newline and a bunch of spaces.
4. A script node (with inline JavaScript).
5. A text node containing a newline and a bunch of spaces.

With my fork, only text nodes and elements with `data-elm` are “virtualized”. Virtualization (sometimes called “hydration” in other frontend tech) means that Elm “adopts” the element – turns it into virtual DOM as if it was rendered by your `view` function, diffs it with the first run of `view`, and then updates it to match `view`, or removes it entirely if it shouldn’t be there at all according to `view`. So with my forks, Elm is going to virtualize all the (whitespace only) text nodes in `<body>`. The first one is going to be replaced by the `<h1>` element, the second one by the `<p>` element, and the third one is removed. But the `<script>` tags are left alone where they were. In effect we end up with this:

<!-- prettier-ignore -->
```html
<body><h1>Welcome to my app!</h1><script src="/elm.js"></script><p>It is a very cool app.</p><script>
    Elm.Main.init();
  </script></body>
```

If you really don’t like those script tags being mixed in there, you could add `data-elm` to them:

```html
<body>
  <script data-elm src="/elm.js"></script>
  <script data-elm>
    Elm.Main.init();
  </script>
</body>
```

Then you’d end up with:

<!-- prettier-ignore -->
```html
<body><h1>Welcome to my app!</h1><p>It is a very cool app.</p></body>
```

Or, you could experiment with not having script tags in `<body>` at all, but it’s beyond the scope of this documentation to dive into the pros and cons and differences between different script tag setups.

You can control where your Elm elements end up by:

1. Being careful with whitespace.
2. Adding the `data-elm` attribute to elements that you would like to “adopt”. If you think about it, that often results in them being removed.
3. Render just a single element in your `view`: `{ title = "My app", body = [ justOneItemHere ] }`.

All this `data-elm` business is needed because Elm decided to take control of the whole `<body>` node. In reality, most pages have more scripts that also want their piece of `<body>`. Because of that, Elm can’t know which elements it should care about when it initializes. That’s extra important if you server-side render, such as with elm-pages. The best solution I’ve found to this problem is:

- Assume all text nodes should be virtualized.
- Mark all elements that should be virtualized with `data-elm`.

### Comprehensive `Browser.element` example

Given this HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My app</title>
  </head>
  <body>
    <div id="root">
      <p>Looks like JavaScript hasn’t run?</p>
    </div>
    <script src="/elm.js"></script>
    <script>
      Elm.Main.init({ node: document.getElementById("root") });
    </script>
  </body>
</html>
```

You’d previously end up with this after Elm initializes:

```html
<body>
  <div>
    <h1>Welcome to my app!</h1>
    <p>It is a very cool app.</p>
  </div>
  <script src="/elm.js"></script>
  <script>
    Elm.Main.init({ node: document.getElementById("root") });
  </script>
</body>
```

With my forks you end up with:

```html
<body>
  <div>
    <h1>Welcome to my app!</h1>
    <p>Looks like JavaScript hasn’t run?</p>
    <p>It is a very cool app.</p>
  </div>
  <script src="/elm.js"></script>
  <script>
    Elm.Main.init({ node: document.getElementById("root") });
  </script>
</body>
```

Probably the easiest solution in this case is to slap `data-elm` to that original `<p>` tag:

```html
<body>
  <div id="root">
    <p data-elm>Looks like JavaScript hasn’t run?</p>
  </div>
  <script src="/elm.js"></script>
  <script>
    Elm.Main.init({ node: document.getElementById("root") });
  </script>
</body>
```

Then it’ll work like without my forks. See the “Comprehensive `Browser.application` example” above for why this happens, and why `data-elm` makes a difference.

Finally, if you have a lot of `Browser.element` and it’s too much work adding `data-elm` here and there, there is a workaround. It sort of defeats the purpose of `data-elm`, but you can make sure that all elements have the attribute before initializing the Elm app:

```js
function addDataElm(node) {
  for (const child of node.getElementsByTagName("*")) {
    child.setAttribute("data-elm", "");
  }
  return node;
}

Elm.Main.init({ node: addDataElm(document.getElementById("root")) });
```

It can be fine to use that technique where there is a low chance of third-party scripts or browser extensions having inserted any extra elements. (For that reason, it is not a good idea to use it with `Browser.application`.) If you use this technique, you’re not any worse off than before using my forks, and you can migrate away from it over time if you want.

### Server-side rendering notes

When server-side rendering, make sure that your HTML doesn’t have any extra whitespace, and that all elements have `data-elm`:

<!-- prettier-ignore -->
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My app</title>
  </head>
  <body><h1 data-elm>Welcome to my app!</h1><p data-elm>It’s a <em data-elm>very</em> cool app.</p>
    <script src="/elm.js"></script>
    <script>
      Elm.Main.init();
    </script>
  </body>
</html>
```

Note how there is no line break after `<body>` and how all the elements rendered by Elm are on just one ugly line, and how all of those elements have `data-elm`.

Having no extra whitespace directly after `<body>` is extra important, since it’ll make the first diff with `view` off-by-one and effectively re-render the whole page. This is because my forks assumes that _all_ text nodes should be virtualized. See the “Comprehensive `Browser.application` example” above for more details around this.

It’s OK to have extra elements before or after the Elm elements. It’s also OK to have extra whitespace _after_ all the Elm elements.

`data-elm` should appear automatically on every element rendered by Elm just from using my forks, if your server-side setup works by turning the return value from `view` straight into an HTML string, like elm-pages does. But if you render the HTML via for example JSDOM, they won’t appear. The `data-elm` attribute is only present in the virtual DOM data (causing elm-pages to print it), but is skipped during rendering in my forks, to not clutter the browser devtools.

## Properties are diffed against the _real_ DOM

The DOM has both [attributes and properties](https://github.com/elm/html/blob/master/properties-vs-attributes.md).

As mentioned in the section about changes in [elm/html](../README.md#elmhtml), the functions in the original `Html.Attributes` were mostly implemented as _properties,_ while in my version they are mostly implemented as _attributes._

One reason for the switch to attributes is because many properties can be changed by user actions. For example, `value` can be changed by a user typing in a text field, and `checked` by a user clicking a checkbox. The original elm/virtual-dom special cases those two properties and diffs those against the _real_ DOM node, instead of against the previous virtual DOM node.

But there are more properties that user actions can control. For example, `selected` on `<option>` element can be toggled by the user when they pick an option in a `<select>` element. In my fork of elm/virtual-dom, instead of having a hard coded list of special cases, I simply diff _all_ properties against the _real_ DOM. But remember that I changed most `Html.Attributes` functions to use _attributes_ instead, so in practice there aren’t that many things that use properties and thus are diffed against the _real_ DOM.

In NoRedInk’s blog post about adopting elm-safe-virtual-dom they have a nice example of [some `<select>`s stopped working](https://blog.noredink.com/post/800011916366020608/adopting-elm-safe-virtual-dom#:~:text=Some%20selects%20stopped%20working) for them (due to an oversight in their Elm code that was uncovered by the stricter behavior for properties in my fork).

## Setters should have getters on custom elements

When using [Custom Elements](https://guide.elm-lang.org/interop/custom_elements) with Elm, you can pass data to it using either `Html.Attributes.attribute` or `Html.Attributes.property`. If you use `Html.Attributes.attribute` there shouldn’t be anything you need to think about, but if you use `Html.Attributes.property` you might want to read on.

It’s common to implement custom element properties as setters to get notified as they change:

```js
customElements.define(
  "my-custom-element",
  class extends HTMLElement {
    set myProperty(value) {
      this._myProperty = value;
      this.update();
    }

    update() {
      // Do stuff here.
    }
  }
);
```

The above code works just fine with the original elm/virtual-dom package. With my fork, it still works but is less performant. The fix is easy, though: Add a getter for `myProperty` as well! (Those familiar with classes might already have been screaming “where’s the getter?” for a while, since it’s a common rule that all setters should also have getters, and vice versa.)

```diff
 customElements.define(
   "my-custom-element",
   class extends HTMLElement {
+    get myProperty() {
+      return this._myProperty;
+    }

     set myProperty(value) {
       this._myProperty = value;
       this.update();
     }

     update() {
       // Do stuff here.
     }
   }
 );
```

Without the getter, my fork of elm/virtual-dom is going to set `myProperty` on every render, even if the value for it hasn’t changed on the Elm side! That’s because in my fork, properties are compared to _the actual DOM node_ (while attributes are compared to the previous _virtual_ DOM node). If there’s no getter, trying to read `.myProperty` gives `undefined` back, which is never equal to the value you are trying to set.

So, why this change then? It’s because some properties, like `value` and `checked` (for text inputs and checkboxes, respectively) can be changed by user interactions (typing in fields and toggling checkboxes). So comparing to the previous virtual DOM isn’t enough to make sure a DOM node is up-to-date. The original elm/virtual-dom has special cases for those two properties in two places, to compare them to the actual DOM node instead.

My fork takes a different approach. It _always_ compares _all_ properties to the actual DOM node. This is simpler, and also catches `selectedIndex` (for dropdowns) which also can be modified by the user (by selecting something) – and there are probably more properties like this in the vast DOM interfaces.

(My fork still compares _attributes_ to the previous virtual DOM. It even changes most `Html.Attributes` functions to use attributes instead of properties in [elm/html#259](https://github.com/elm/html/pull/259).)

All in all, make sure that your setters also have getters on your custom elements, to avoid unnecessary work on each render.
