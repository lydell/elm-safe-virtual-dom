# Elm safe virtual DOM

_A robust virtual DOM for Elm._

> [!IMPORTANT]  
> This project has gone from heavy development to a **testing stage.** It is _not_ ready for production yet.

To help test this project, you need to know:

1. [What you are testing](#what-you-are-testing)
2. [How to set it up](#how-to-set-it-up)
3. [What to test](#what-to-test)
4. [How to provide feedback](#how-to-provide-feedback)

This repo:

- Documents the changes I’ve made in forks of DOM related core Elm packages.
- Has a script for testing those forks in your own project.
- Is where you can open issues for things you find while testing my forks.

## What you are testing

### The forks

- [lydell/virtual-dom](https://github.com/lydell/virtual-dom)
- [lydell/html](https://github.com/lydell/html)
- [lydell/browser](https://github.com/lydell/browser)

### Changes

- Doesn’t break because of browser extensions or third party scripts. [elm/html#44](https://github.com/elm/html/issues/44) [elm/browser#121](https://github.com/elm/browser/issues/121) [elm/browser#66](https://github.com/elm/browser/issues/66) [elm/virtual-dom#147](https://github.com/elm/virtual-dom/issues/147)
- Supports Google Translate, and other web page translators (Firefox, Safari).
- Fixes the infamous `Html.map` bug. [elm/virtual-dom#105](https://github.com/elm/virtual-dom/issues/105) [elm/virtual-dom#162](https://github.com/elm/virtual-dom/issues/162) [elm/virtual-dom#171](https://github.com/elm/virtual-dom/issues/171) [elm/virtual-dom#166 (PR)](https://github.com/elm/virtual-dom/pull/166) [elm/html#160](https://github.com/elm/html/issues/160) [elm/compiler#2069](https://github.com/elm/compiler/issues/2069)
- Fixes a _lot_ of other issues.
- Makes hydrating of server-side rendered HTML usable (good for elm-pages).

See also [Detailed descriptions of all the changes](#detailed-descriptions-of-all-the-changes).

## How to set it up

1. [Remove virtual DOM related hacks and workarounds](#remove-virtual-dom-related-hacks-and-workarounds) in your code base (they shouldn’t be needed anymore).
2. Read [Are the forks drop-in replacements?](#are-the-forks-drop-in-replacements) below.
3. Review the [compatibility with tooling](#compatibility-with-tooling) around Elm you use (if any).
4. Download [lydell.bash](#lydellbash) and follow the instructions inside.

### Remove virtual DOM related hacks and workarounds

Hacks and workarounds you might want to remove:

- This Google Translate workaround: `HTMLFontElement.prototype.replaceData = function replaceData(_0, _1, text) { this.parentNode?.replaceChild(document.createTextNode(text), this); };`
- This tag for disabling Google Translate altogether: `<meta name="google" content="notranslate">`
- This attribute for disabling Grammarly: `data-gramm_editor="false"`
- Other attributes you might use for disabling problematic browser extensions.
- The patch from [jinjor/elm-break-dom](https://github.com/jinjor/elm-break-dom).
- Other “render in a div instead of body” patches you might have. If you do any patching at all, review it.

### Are the forks drop-in replacements?

As close to drop-in as they can be. The forks don’t change the Elm interface at all (adds no functions, changes no functions, removes no functions, or types). All behavior should be equivalent, except less buggy. [Performance](#performance) should be unchanged.

You need to keep two things in mind:

1. With my forks, Elm [no longer “empties” the element you mount the Elm application on](#no-longer-empties-the-mount-element). Unless you put `data-elm` attributes on each child element. This is an unfortunate breaking-change-territory thing, that I simply could not find a better solution to. Luckily, it usually pretty easy to handle, you just need to know about it.
2. [Hyrum’s Law](https://www.hyrumslaw.com/). The DOM is full of complex details. Even a small fix could accidentally break something for you.

#### No longer empties the mount element

To be more compatible with third-party scripts, my forks change how Elm “virtualizes” elements. My fork only virtualizes elements with the `data-elm` attribute (instead of _all_ child elements), and lets any other elements be. It often felt like Elm would “empty” your element on first render, but that’s not actually the case. It “virtualizes” the element, and then updates it to match your `view` function. That often results in whatever was there already being removed, but if you happened to already have an element of the right type in the right place, it would just be mutated to match `view`.

This results in:

- If you have an element like `<p>Looks like JavaScript hasn’t run?</p>` and expect Elm to remove it, that won’t happen now. To fix, you can put `data-elm` on it: `<p data-elm>`.
- If you use CSS selectors like `body > :first-child`, `body > :last-child` or `h1 + p`, they might not apply, since your `<script>` tags in `<body>` might still be around, and might be mixed with the elements rendered by Elm.
- If you do server-side rendering and expect Elm to hydrate/virtualize/adopt/take charge over the server-side rendered HTML, you need to make sure that all elements (except the root element) has `data-elm`. If you create the HTML with Elm (such as with elm-pages), you’ll get this automatically when you use my forks. But if you create elements some other way, make sure they have `data-elm`.

<details>

<summary>Comprehensive `Browser.application` example</summary>

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

</details>

<details>

<summary>Comprehensive `Browser.element` example</summary>

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

</details>

<details>

<summary>Server-side rendering notes</summary>

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

</details>

### Compatibility with tooling

<details>

<summary>elm-watch</summary>

TL;DR: Any version should work.

For hot reloading purposes, elm-watch replaces some functions that I’ve also changed in my forks, losing the changes made in my forks. This affects two things:

- When virtualizing `<a>` elements, they won’t get their click listener, resulting in them causing full page reloads instead of being routed by Elm. I don’t think that many people use both server-side rendering and elm-watch though. And in elm-watch 1.1.4+, 1.2.2+ and 2.0.0-beta.6+, I’ve actually added in the missing pieces so that this _will_ work. A caveat here is that if you install my fork of the virtual-dom package, but _not_ my fork of the browser package, you’ll get my forked browser experience during development with elm-watch anyway, but _not_ in production builds. Having something work during development but not in production sucks, but I don’t see any reason for someone not installing all three of my forks.
- When clicking on an `<a>` element _without_ the `href` attribute, they’ll be routed by Elm, missing out on my fix where nothing should happen instead. I don’t have a solution to this problem yet. I _could_ include this fix for everyone, but I think that would be misleading (even worse than the above caveat). Production-only bugs suck.

</details>

<details>

<summary>Elm Land</summary>

TL;DR: Any version should work.

Elm Land uses elm-watch code under the hood, so basically the same applies there. When the [pull request for using elm-watch-lib](https://github.com/ryan-haskell/vite-plugin-elm-watch/pull/8) is merged, Elm Land will get the elm-watch 1.1.4+/1.2.2+/2.0.0-beta.6+ behavior with virtualized `<a>` tags as mentioned in the elm-watch section above.

</details>

<details>

<summary>elm-pages</summary>

TL;DR: Any version should work, but to get the full experience you need [pull request #512](https://github.com/dillonkearns/elm-pages/pull/512) and [pull request #519](https://github.com/dillonkearns/elm-pages/pull/519), which should be released in whatever elm-pages version comes after 3.0.20.

Without the two pull requests mentioned above, the following caveats apply (read the [No longer empties the mount element](#no-longer-empties-the-mount-element) section for why):

- elm-pages 3.0.20 renders extra whitespace nodes in `<body>`, causing the first diff with `view` to be off, leading to basically the entire page being re-rendered. That’s not worse than without my forks though: Without my forks your elm-pages app re-renders the entire page anyway due to `Lazy` and `Keyed` nodes (one of the things fixed in my forks).
- You’ll end up with an extra `<div data-url>` element in `<body>`. I’m not sure what that affects.
- You’ll end up with an extra `<div aria-live>` element in `<body>`. That should be fine, since it will stay unchanged. `aria-live` only announces changes to the DOM.

</details>

<details>

<summary>Lamdera</summary>

TL;DR: You need to compile Lamdera yourself with [pull request #40](https://github.com/lamdera/compiler/pull/40). **Note:** This only applies if you _actually_ use Lamdera. Not if you just use Lamdera as an alternative Elm compiler, like elm-pages does.

Lamdera copies some functions from elm/virtual-dom, to make modifications to them. My fork of elm/virtual-dom also changes those functions. The pull request mentioned above copies those changes, and supports both the original version and my fork. It also adds `data-elm` to an element that `lamdera live` expects to disappear when Elm initializes.

</details>

<details>

<summary>elm-portal</summary>

TL;DR: You need to add one thing to the [elm-portal code](https://gist.github.com/wolfadex/45ae81f73c79a1c092cdba60aa218201).

Chrome has shipped support for the new `Element.prototype.moveBefore` method, which allows moving an element on the page without “resetting” it (scroll position, animations, loaded state for iframes and video, etc.). My fork of the virtual-dom package uses this method if available. This means that `moveBefore` needs to be proxied by the elm-portal class. All you need to do is add this:

```js
moveBefore(...args) {
  return this._targetNode.moveBefore(...args);
}
```

Oh, and one more thing. Don’t make a _keyed_ elm-portal (like `Html.Keyed.node "elm-portal"`). That doesn’t work. You can have a keyed element _inside_ the portal, but you can’t make the elm-portal element itself keyed. This is because my fork of the virtual-dom package needs to check if `.parentNode` is the expected element in the keyed code, which it isn’t for the children inside the portal (since they have been sneakily moved to the portal).

</details>

<details>

<summary>elm-optimize-level-2</summary>

TL;DR: I don’t know.

I have never used elm-optimize-level-2. But I suspect that [supportArraysForHtml](https://github.com/mdgriffith/elm-optimize-level-2/pull/108) might conflict with the changes in my fork.

</details>

### lydell.bash

Download [lydell.bash](./lydell.bash) from this repo and follow the instructions inside.

The bash script:

- Instructs you to clone my forks.
- Instructs you to type in the command you use to run your app.
- Runs that command with `ELM_HOME` set `elm-stuff/elm-home/` (local to your app) and copies files from my forks into it.

The script should work on macOS and Linux (but you might need to tweak it if you use some funky setup). On Windows, you can do the steps manually, or write your own script. Maybe share it here if you know more Windows people who might want to test?

## What to test

Here are some things to look out for while testing:

- Does the page crash?
- Do elements end up in the wrong place?
- Do elements end up with the wrong style?
- Do you notice the page feeling much slower?
- Can you make Elm crash by poking around in the inspector in the browser devtools?

Here are some specific things that I have tested a bit myself, but would like to see tested more:

- Google Translate work? Does it display usable text after updates to the DOM? Can you find a language that breaks down?
- Does Grammarly work?
- Do other extensions work?
- Do your third-party scripts work?

I’m also looking for testing in apps with heavy use of:

- elm-pages.
- Web components/Custom elements.
- Multiple Elm apps on the same page.
- Heavy or important use of `Html.Lazy`.
- Heavy or important use of `Html.Keyed`.
- Use of [elm-explorations/webgl](https://elm.dmy.fr/packages/elm-explorations/webgl/latest/).
- Use of [elm-explorations/markdown](https://elm.dmy.fr/packages/elm-explorations/markdown/latest/).
- Use of [elm-program-test](https://elm.dmy.fr/packages/avh4/elm-program-test/latest/), or any HTML based testing in elm-test.
- Crazy, weird, edge-case:y things.

It’s good testing in multiple environments:

- Different operating systems.
- Different devices (computers, tablets, phones).
- Different browsers.

When you’re done testing, take a break and then test the same amount again, if you have the time. You’ll probably find a bug when doing the most unexpected little thing.

## How to provide feedback

There are three main ways to provide feedback:

1. Open an issue in this repo about a problem.
2. Open an issue in this repo about a successful (problem free) test. Mention what you tested and how it went.
3. Chat in the `#elm-virtual-dom` channel on the [Incremental Elm Discord](https://incrementalelm.com/chat/).

If you encounter a bug, it would be very helpful if you could:

1. Save any stack traces and error messages you see, and take a screenshot.

2. Try to reproduce the bug. If you can’t, you can still mention it on Discord for example, and I might have a clue since I know all the details of the code.

3. Reduce your app down to the minimum that reproduces it. That is quite boring and tedious, but it helps a lot!

   - A small example is way easier to debug than a large page.
   - You save my time.
   - You might not be allowed to share your production code.

## More information

### Performance

- The well-known [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) includes Elm. I ran that Elm benchmark on my computer, with and without my forks, and got the same numbers (no significant difference).
- When testing with some large Elm applications at work, I couldn’t tell any performance difference with the forks.
- Both the official elm/virtual-dom and my fork have `O(n)` complexity.
- The official elm/virtual-dom algorithm sometimes does more work, but other times my fork does more work. It seems to even out.

### Do I have to use all three of the forks?

You can install just one of them if you want. To avoid my patches being breaking changes, I’ve taken care to make that work.

If you do, nothing should break, and nothing should be rendered wrongly or so. You just won’t get the full experience. Some features might only be half-fixed. You might run into [Hyrum’s Law](https://www.hyrumslaw.com/) though, where your app _happened_ to work due to a bug, which when fixed by the fork you installed, uncovered another bug which is _not_ fixed since you didn’t install one of the other forks.

For example, if you server-side render HTML and only install my fork of the virtual-dom package, your page should still look correct, but Elm might unnecessarily re-apply lots of attributes during the first render, and your `<a>` elements might be lacking their click listener so that they cause full page reloads instead of being routed by Elm.

### Detailed descriptions of all the changes

The main changes are in my elm/virtual-dom fork. The changes in elm/html and elm/browser are much smaller, and are more of “side details” than the main thing.

#### elm/virtual-dom

Changes:

- A new algorithm for pairing virtual DOM nodes with the corresponding real DOM node, that should be robust against browser extensions and third-party scripts. It is in the code for the old algorithm where most crashes happen. [elm/html#44](https://github.com/elm/html/issues/44) [elm/browser#121](https://github.com/elm/browser/issues/121) [elm/browser#66](https://github.com/elm/browser/issues/66) [elm/virtual-dom#147](https://github.com/elm/virtual-dom/issues/147)
- Support for the page being translated, for example Google Translate. This requires the above change (being robust), and then a little bit of extra code to make sure that translated text isn’t left behind on the page, and so that translated text that should change actually updates.
- The `Html.map` bug where messages of the wrong type can appear in `update` functions is fixed, by completely changing how `Html.map` works. The old code was incredibly difficult to understand, but could theoretically skip more work in some cases. The new code is instead very simple, leaving little room for errors. [elm/virtual-dom#105](https://github.com/elm/virtual-dom/issues/105) [elm/virtual-dom#162](https://github.com/elm/virtual-dom/issues/162) [elm/virtual-dom#171](https://github.com/elm/virtual-dom/issues/171) [elm/virtual-dom#166 (PR)](https://github.com/elm/virtual-dom/pull/166) [elm/html#160](https://github.com/elm/html/issues/160) [elm/compiler#2069](https://github.com/elm/compiler/issues/2069)
- Improved `Html.Keyed`. The algorithm is slightly smarter without losing performance, and uses the new `Element.prototype.moveBefore` API, if available, which allows moving an element on the page without “resetting” it (scroll position, animations, loaded state for iframes and video, etc.). [elm/virtual-dom#175](https://github.com/elm/virtual-dom/issues/175) [elm/virtual-dom#178](https://github.com/elm/virtual-dom/issues/178) [elm/virtual-dom#183](https://github.com/elm/virtual-dom/issues/183)
- “Virtualization” is now completed, making it usable in practice, for example for elm-pages. This means that server-side rendered pages no longer have to redraw the whole page when Elm initializes.
- CSS custom properties, like `--primary-color`, can now be set with `Html.Attributes.style "--primary-color" "salmon"`. [elm/html#177](https://github.com/elm/html/issues/177)
- `Svg.Attributes.xlinkHref` no longer mutates the DOM on every single render, which caused flickering in Safari sometimes. [elm/virtual-dom#62](https://github.com/elm/virtual-dom/issues/62)

<details>

<summary>New DOM node pairing algorithm</summary>

The original elm/virtual-dom works like this:

1. Run `view`. This produces the _new_ virtual DOM.
2. Diff the output of `view`, with the output from `view` last time (the _old_ virtual DOM). This produces a list of patches.
3. Walk the DOM using the _old_ virtual DOM as a guide, since the DOM is supposed to look like the old virtual DOM, since that’s how we rendered it a while ago. Attach actual DOM nodes to each patch. This counts the elements in a clever way, so that large parts of the DOM can be skipped if there aren’t any changes there.
4. Apply all the patches.

It’s step 3 that is problematic. It assumes that the DOM is unchanged since our last render. Unfortunately, that isn’t always the case due to browser extensions, third-party scripts and page translators like Google Translate.

I’ll explain the new algorithm by starting from a simple conceptual model, building up to the full complexity. A bit like how atoms have multiple, simplified models that are true enough to understand different parts of chemistry.

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

This design imposes a rule: On each render, we always have to recurse through the _entire_ old virtual DOM, to “discover” all uses of each virtual DOM node, and increase that `i` counter each time. This is a difference compared to the original elm/virtual-dom package, that is worth mentioning from a performance perspective:

- A common case is that both the old and new virtual DOM are _very_ similar. There might be just a single change in one place, maybe just a text change or an attribute change. In this case, the diffing algorithm will naturally visit _every_ virtual DOM node to find this.

- When a virtual DOM node is only present in the _old_ virtual DOM, it means that it was removed. The original elm/virtual-dom then has no need to recurse through all the children of that virtual DOM node. My fork still needs to do that though, to increment the `i` counter of every virtual DOM node inside the removed one, in case one of them is used again later. Note that this doesn’t use the regular diffing recursive function, it uses a special function that recurses the virtual DOM just for this use case as quickly as possible.

- When a virtual DOM node is only present in the _new_ virtual DOM, it means that it was inserted. Both implementations then need to recurse through all the children of the new virtual DOM node, to render all of the elements, of course. No change there.

- When two virtual DOM nodes are for different elements (one is a `<div>`, the other is a `<p>`), both implementations bail out, by removing the old DOM node completely and then rendering the new one fresh. This is just like a removal followed by an insertion, so my fork needs to recurse through the old virtual DOM node here too, while the original elm/virtual-dom does not need that.

- Finally, lazy nodes. The first thing `lazy` does is that your Elm function won’t be called unless the arguments change. The second thing is the virtual DOM diffing. If the arguments haven’t changed, then we’ll use the same virtual DOM as last time, which then by definition is unchanged. The original elm/virtual-dom then doesn’t need to look through that virtual DOM node at all, it you can just move on to the next. My fork still needs to recurse through it, for two reasons. The first one is similar to node removals: To increment the `i` counter in case a virtual DOM node used inside the lazy node is used again later. The second reason is due to `Html.map` – see the section about `Html.map`. Just like when recursing removed virtual DOM nodes, recursing lazy nodes also has a fast path function that only increments the `i` counter and makes sure event listeners are up-to-date. This means that `lazy` is slightly less lazy with my fork.

</details>

<details>

<summary>Page translation support (Google Translate)</summary>

Here’s how page translation tools work:

- Google Translate (built into Chrome): It removes all text nodes, and replaces them with `<font>` tags with new, translated text nodes inside.
- Firefox’s translator: It mutates the text of existing text nodes to translate them.
- Safari’s translator: It replaces all text nodes with new, translated text nodes.

All three of them can also introduce new text nodes, and even new elements, if the target language has a different word order. For example, `<em>I went</em> to school.` can be translated to `<em>Ich</em> bin zur Schule <em>gegangen</em>.` Due to different word order, another `<em>` element had to be introduced to preserve the text formatting.

All three of them also listen for changes to the page and translate new text as it arrives on the page.

In my fork, the general behavior is to leave unknown elements alone, and to just update the reference to the DOM node that we stored on the virtual DOM node. That works fine also for page translators – until translated text needs to update. There are two problems:

- The text node that we’re mutating the text of might not even be on the page anymore (Google Translate and Safari). But the intention of the page translator was not to remove anything – the intention was to translate everything on the page.
- We might leave a lot of stray text behind everywhere as the page changes, resulting in a very confusing page.

For these reasons, my fork detects page translators and tries to cooperate with them. The detection works like this:

1. Diff two virtual DOM text nodes. Stop if the text hasn’t changed.
2. Since the text has changed, the DOM text node needs to be updated. But before doing that, check if the DOM node text is equal to the _old_ virtual DOM node. If not, we have detected Firefox’s translator – then stop.
3. If the DOM node text was unchanged, check if it has a parent node. If not, we have detected Google Translate or Safari’s translator – then stop. (When they remove the original text nodes, they no longer have a parent node.)
4. If the DOM node had a parent node, it is probably still on the page. Update the DOM text node. No page translator.

If a page translator _was_ detected, tell the parent. It will then go through its children again, both virtual DOM children and actual DOM children. It removes text node DOM children and replaces them with new ones. It also removes `<font>` tags not created by Elm (they are most likely created by Google Translate). While doing this, it makes sure that all the child elements are in the correct order.

The thing here is that if we detect that a text node has been removed, it most likely means that it has been replaced with a translated version. But we don’t know _what_ DOM node or nodes on the page that replaced it, only that it or they should be _somewhere_ in the parent element. So the only thing we can do is to tell the parent element to redo all of its text. That is also good for the word order thing: It’s better if the page translator detects a full sentence or paragraph being changed than just a word or two. There’s a chance that the parent element contains the full sentence or paragraph, but of course no guarantee. Once the page translator detects the changes, it will re-translate all of it.

This algorithm is somewhat simple and fast, but it’s not perfect due to the word order thing. There might be some leftover or misplaced text after an update. But page translators aren’t perfect in the first place, so I don’t think users of them will expect perfection. They just want a page that they can understand and that doesn’t crash.

</details>

<details>

<summary>Event listeners and Html.map</summary>

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

My fork takes a much simpler approach. As mentioned in the “New DOM node pairing algorithm” section, my fork needs to recurse into _all_ virtual DOM nodes anyway, even into lazy nodes. And the diffing of event decoders often doesn’t work anyway, due to passing extra data in messages (that feels pretty common). So my fork simply updates all event listeners every render.

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

</details>

<details>

<summary>Html.Keyed</summary>

`Html.Keyed` in the original elm/virtual-dom is pretty simplistic. I basically operates on a “one lookahead” principle. It goes through the children of the old and new virtual DOM node pairwise. If the keys match, diff them and move on. Otherwise, look ahead one child on both sides and compare all four virtual DOM nodes, to find insertions, removals and swaps. If nothing still matches, degrade to the naive method of moving every child in place (which can lead to moving 10 children up instead of 2 down, for example).

When you call `Html.div [] [child1, child2]`, the `Html.div` function immediately iterates over the linked list of children, turning it into an array. This is true of all element creating virtual DOM functions. In my version, I not only build that array, but also build a key lookup map for keyed nodes. During the diffing, my version also goes through the children of the old and new virtual DOM nodes pairwise. If the keys don’t match, I use the lookup map to detect insertions and removals. If there’s neither a insertion nor removal, it has to be a move. I then iterate from the end instead. If that also gets stuck, I compare the virtual DOM nodes from the forwards traversal with the ones from the backwards traversal, to find swaps. If things have moved so much that that doesn’t get us going again either, I switch to the naive method of moving every child in place. The difference in my fork, is that it uses the new `Element.prototype.moveBefore` API, if available, which allows moving an element on the page without “resetting” it (scroll position, animations, loaded state for iframes and video, etc.), so it isn’t as bad when this happens. Also, when I benchmarked `Element.prototype.moveBefore`, it was pretty fast – fast enough to seriously compete with a git-style diffing algorithm that minimizes the amount of moves.

</details>

<details>

<summary>Virtualization</summary>

Virtualization in elm/virtual-dom has a bunch of problems:

- It basically breaks down as soon as you use `Html.map` or `Html.Lazy`. It is _very_ common to have `Html.map` near the top of your Elm application, so this effectively results in most server-side rendered applications having no use of the virtualization at all – it’s just going to re-render the entire page. This is because, as I mentioned in the “New DOM node pairing algorithm” section above, because `Html.map` and `Html.Lazy` are nodes in the _virtual_ DOM tree, but not in the actual DOM tree. When just seeing the HTML, the virtualize function can’t know where the map and lazy nodes should be. The original elm/virtual-dom bails diffing if it tries to diff two virtual DOM nodes of different types (such as an `Element` node vs a `Map` node). My version instead consumes all map and lazy nodes from each side until we get to text and element nodes – then the actual diffing starts.

- It does not support textarea. Textarea elements are weird. You are supposed to add default text as _children_ of `<textarea>` in HTML, but in JavaScript (and therefore Elm), you are supposed to set `textarea.value` instead (updating the children does nothing). My fork handles this “children to value” conversion.

- Attributes vs properties. It virtualizes all attributes on the element as attributes in Elm (`Html.Attributes.attribute`), but most string attributes are actually implemented as _properties_ in Elm (`Html.Attributes.property`). I’ve fixed this by changing elm/html to mostly use attributes instead (read more about it in the elm/html section below).

- Functions in `Html.Attributes` that take a `Bool` still need to be implemented as _properties._ However, some of them have different casing as an attribute vs an a property, such as `readonly` vs `readOnly`. I’ve went through all boolean attributes and added a lookup object of the non-esoteric ones with different casing.

- The `style` attribute needs to be turned back to each `Html.Attribute.style` call, and not be a single `style` attribute. My fork solves this.

- It doesn’t virtualize namespaced elements and attributes correctly (needed for SVG).

- It does not add click listeners on `<a>` elements for `Browser.application`.

- My fork only virtualizes text nodes, and elements with the `data-elm` attribute. This allows third-party scripts to add elements to (for example) `<body>` before Elm initializing, with having Elm remove them during initialization.

</details>

#### elm/html

The only change is that previously, most functions in `Html.Attributes` that take a `String` used this helper function:

```elm
stringProperty : String -> String -> Attribute msg
stringProperty key string =
  Elm.Kernel.VirtualDom.property key (Json.string string)
```

For example, `href`:

```elm
href : String -> Attribute msg
href url =
  stringProperty "href" (Elm.Kernel.VirtualDom.noJavaScriptUri url)
```

In other words, lots of the `Html.Attributes` functions were implemented by setting _properties._

My fork removes `stringProperty`, and instead prefers _attributes_ over properties. Here’s `href` in my fork:

```elm
href : String -> Attribute msg
href url =
  Elm.Kernel.VirtualDom.attribute "href" (Elm.Kernel.VirtualDom.noJavaScriptUri url)
```

In short, attributes are preferred because:

1. Attributes can be removed, while properties often cannot. [elm/html#228](https://github.com/elm/html/issues/228) [elm/html#148](https://github.com/elm/html/issues/148) [elm/virtual-dom#122](https://github.com/elm/virtual-dom/issues/122) [elm/virtual-dom#169](https://github.com/elm/virtual-dom/issues/169)
2. “Virtualization” is way easier when most `Html.Attributes` functions are attributes. [elm/virtual-dom#144](https://github.com/elm/virtual-dom/issues/144)
3. Some properties are read-only and therefore throw errors if you try to set them.
4. Attributes are easier to diff.

I explain those points more in the [properties-vs-attributes.md](https://github.com/lydell/html/blob/safe/properties-vs-attributes.md) file. (elm/html already had that file. I extended it with the numbered list at the end.)

#### elm/browser

My fork of elm/browser is a mixed bag of small changes. I intend to make separate pull requests for each thing.

- In my fork of elm/virtual-dom, I made the “virtualize” function complete, making it work in practice. One aspect of virtualization that could _not_ be solved in elm/virtual-dom on its own, was the bug where `<a>` elements didn’t get their click listener attached during virtualization, making them do full page reloads instead of being routed by Elm. This had to be fixed in _both_ the virtual-dom package, _and_ the browser package. This is the change in my fork that is the most related to the virtual-dom changes.

- elm/browser is in charge of the Elm debugger. The debugger code has a bug where it passes `document` instead of `document.body` to the “virtualize” function, for the debugger window. Previously, that didn’t matter at all and happened to work anyway. With my fork of elm/virtual-dom, that caused the debugger window to be a blank page. I’ve fixed that (adding `.body`), but I also added compatibility for that bug in my virtual-dom fork, so it can be used without my elm/browser fork without breaking the debugger. Basically, I added `if (node === document) { node = document.body; }` as a workaround. So this change isn’t _technically_ needed, but it’s nice fixing problems “in the right place” too.

- Speaking of the debugger, in Firefox the debugger window background is dark if your computer is in dark mode, making it hard to read things in the debugger. I’ve set the background color of the debugger window explicitly to white, which is the recommendation for web pages anyway.

- You might have noticed that when Elm’s virtual DOM crashes, you get an error in the browser console many times per second. This is because Elm generally draws on the next animation frame using `requestAnimationFrame`, and if it crashes during rendering it gets stuck in an infinite `requestAnimationFrame` loop. That’s really annoying. When fixing changing the code to not get caught in a loop if there is an exception, I also noticed that the whole `requestAnimationFrame` was a bit off. Basically, if you also subscribe to `Browser.Events.onAnimationFrame`, you could end up with `update` and `view` being 1 frame out of sync, and some frames could be skipped. I made a [demo showing these animation frame oddities](https://lydell.github.io/elm-animation-frame-oddities/). My fork fixes that, except the demo cases where the animation frames come via a port – I don’t think that is solvable.

- Finally, there’s a bug where clicks on `<a>` elements _without_ `href` still end up producing a `LinkClicked` messages, even though such elements shouldn’t be clickable. I’ve fixed that. (But note that this fix doesn’t work during development with elm-watch – see the [Compatibility with tooling](#compatibility-with-tooling) section.) [elm/browser#34](https://github.com/elm/browser/issues/34) [elm/browser#55](https://github.com/elm/browser/issues/55) [elm/browser#64](https://github.com/elm/browser/issues/64)

### Legacy

This repo used to contain the code of a previous attempt at making a safer virtual DOM for Elm. You can find that code in the [legacy branch](https://github.com/lydell/elm-safe-virtual-dom/tree/legacy).
