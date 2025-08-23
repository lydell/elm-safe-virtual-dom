# Elm safe virtual DOM

_A robust virtual DOM for Elm._

> [!IMPORTANT]  
> Can this be used in production? After a careful gradual rollout during May 2025, [Insurello](https://careers.insurello.se/) is using this in production since 2025-05-26. With a couple of thousand unique users per day, there haven’t been a single error reported automatically or to customer service. After that, multiple people on Discord started trying it out. They did find a few bugs, which I never ran into at Insurello, but was able to fix quickly. There are definitely [areas that are more and less tested](#what-to-test) (since not all Elm apps use all features).

To use this project, you need to know:

1. [What this is](#what-this-is)
2. [How to set it up](#how-to-set-it-up)
3. [What to test](#what-to-test)
4. [How to provide feedback](#how-to-provide-feedback)

This repo:

- Documents the changes I’ve made in forks of DOM related core Elm packages.
- Documents how to use my forks in your own project.
- Is where you can open issues for things specific to my forks.

## What this is

### The forks

- [lydell/virtual-dom](https://github.com/lydell/virtual-dom)
- [lydell/html](https://github.com/lydell/html)
- [lydell/browser](https://github.com/lydell/browser)

#### The pull requests

I’ve created pull requests to the upstream Elm packages for increased visibility, and so that the [elm-janitor](https://github.com/elm-janitor/) project can pick them up.

- The main one: [elm/virtual-dom#187](https://github.com/elm/virtual-dom/pull/187)
- To make virtualization work 100 %: [elm/html#259](https://github.com/elm/html/pull/259)
- Allow virtualization to set up `<a>` click listeners: [elm/browser#137](https://github.com/elm/browser/pull/137)
- Fix debugger virtualization: [elm/browser#140](https://github.com/elm/browser/pull/140)
- Avoid `requestAnimationFrame` error loop on virtual DOM crashes: [elm/browser#138](https://github.com/elm/browser/pull/138)

The following pull requests are part of [lydell/browser@safe](https://github.com/lydell/browser/tree/safe), but aren’t technically related to “safe virtual DOM”:

- Fix links without href: [elm/browser#139](https://github.com/elm/browser/pull/139)
- Fix debugger background color: [elm/browser#136](https://github.com/elm/browser/pull/136)
- Fix debugger pause button: [elm/browser#144](https://github.com/elm/browser/pull/144)
- Fix debugger display of non-ascii custom type variants: [elm/browser#142](https://github.com/elm/browser/pull/142)
- Fix debugger being slow or crashing on big collections in the model: [elm/browser#145](https://github.com/elm/browser/pull/145)

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
4. Make sure that you are using these exact versions (check your elm.json):
   - elm/virtual-dom: 1.0.4
   - elm/html 1.0.0
   - elm/browser 1.0.2
5. [Install the forked packages](#installation).
6. Verify that the forked code actually is used. If you use `Browser.application` or `Browser.document`, the easiest way is to run `document.body.elmTree` in the browser console. If that gives back an object, you’re all set. For `Browser.element` and `Browser.sandbox`, you can select the root node of your app in the browser inspector, and then run `$0.elmTree` in the console (`$0` refers to the currently inspected element). You can also open a built Elm JS file and search for `_VirtualDom_createTNode`. If it’s there, it worked.

### Remove virtual DOM related hacks and workarounds

Hacks and workarounds you might want to remove:

- This Google Translate workaround: `HTMLFontElement.prototype.replaceData = function replaceData(_0, _1, text) { this.parentNode?.replaceChild(document.createTextNode(text), this); };`
- This tag for disabling Google Translate altogether: `<meta name="google" content="notranslate">`
- This attribute for disabling Grammarly: `data-gramm_editor="false"`
- Other attributes you might use for disabling problematic browser extensions.
- The patch from [jinjor/elm-break-dom](https://github.com/jinjor/elm-break-dom).
- Other “render in a div instead of body” patches you might have. If you do any patching at all, review it.

### Are the forks drop-in replacements?

As close to drop-in as they can be. The forks don’t change the Elm interface at all (adds no functions, changes no functions, removes no functions, or types). All behavior _except two details_ should be equivalent, except less buggy. [Performance](#performance) should be unchanged.

The goal was to be 100 % backwards compatible. For some people, it is. For others, there are two changes that are in “breaking change territory” which can be summarized as: **Elm no longer empties the mount element** and **setters should have getters on custom elements.**

#### Elm no longer empties the mount element

To be more compatible with third-party scripts, my fork changes how Elm “virtualizes” elements. My fork only virtualizes elements with the `data-elm` attribute (instead of _all_ child elements), and lets any other elements be. It often felt like Elm would “empty” your element on first render, but that’s not actually the case. It “virtualizes” the element, and then updates it to match your `view` function. That often results in whatever was there already being removed, but if you happened to already have an element of the right type in the right place, it would just be mutated to match `view`.

This results in:

- If you have an element like `<p>Looks like JavaScript hasn’t run?</p>` and expect Elm to remove it, that won’t happen now. To fix, you can put `data-elm` on it: `<p data-elm>`.
- If you use CSS selectors like `body > :first-child`, `body > :last-child` or `h1 + p`, they might not apply, since your `<script>` tags in `<body>` might still be around, and might be mixed with the elements rendered by Elm.
- If you do server-side rendering and expect Elm to hydrate/virtualize/adopt/take charge over the server-side rendered HTML, you need to make sure that all elements (except the root element) has `data-elm`. If you create the HTML with Elm (such as with elm-pages), you’ll get this automatically when you use my forks. But if you create elements some other way, make sure they have `data-elm`.

Read more:

- [Comprehensive `Browser.application` example](./details/breaking-changes.md#comprehensive-browserapplication-example)
- [Comprehensive `Browser.element` example](./details/breaking-changes.md#comprehensive-browserelement-example)
- [Server-side rendering notes](./details/breaking-changes.md#server-side-rendering-notes)

#### Setters should have getters on custom elements

When using [Custom Elements](https://guide.elm-lang.org/interop/custom_elements) with Elm, it’s common to implement custom element properties as setters to get notified as they change. Make sure that they have a getter, too:

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

Otherwise `myProperty` is going to be set on every render, even if the value for it hasn’t changed on the Elm side! Read all about it in the [longer section about setters and getters](./details/breaking-changes.md#setters-should-have-getters-on-custom-elements).

### Compatibility with tooling

<details>

<summary>elm-watch</summary>

TL;DR: Any version should work.

For hot reloading purposes, elm-watch replaces some functions that I’ve also changed in my forks, losing the changes made in my forks. This affects two things:

- When virtualizing `<a>` elements, they won’t get their click listener, resulting in them causing full page reloads instead of being routed by Elm. I don’t think that many people use both server-side rendering and elm-watch though. And in elm-watch 1.1.4+, 1.2.2+ and 2.0.0-beta.6+, I’ve actually added in the missing pieces so that this _will_ work. A caveat here is that if you install my fork of the virtual-dom package, but _not_ my fork of the browser package, you’ll get my forked browser experience during development with elm-watch anyway, but _not_ in production builds. Having something work during development but not in production sucks, but I don’t see any reason for someone not installing all three of my forks.
- When clicking on an `<a>` element _without_ the `href` attribute, they’ll be routed by Elm, missing out on my fix where nothing should happen instead. I don’t have a solution to this problem yet. I _could_ include this fix for everyone, but I think that would be misleading (even worse than the above caveat). Production-only bugs suck.
- If you have `main : Html msg` (instead of a `Program`), hot reloading of it only works with elm-watch 1.2.3+ and 2.0.0-beta.7+.

</details>

<details>

<summary>Elm Land</summary>

TL;DR: Any version should work.

Elm Land uses elm-watch code under the hood, so basically the same applies there. When the [pull request for using elm-watch-lib](https://github.com/ryan-haskell/vite-plugin-elm-watch/pull/8) is merged, Elm Land will get the elm-watch 1.1.4+/1.2.2+/2.0.0-beta.6+ behavior with virtualized `<a>` tags as mentioned in the elm-watch section above.

</details>

<details>

<summary>elm-pages</summary>

TL;DR: Any version should work, but to get the full experience you need 3.0.22 of the npm package, and 10.2.1 of the Elm package (to get [pull request #512](https://github.com/dillonkearns/elm-pages/pull/512) and [pull request #519](https://github.com/dillonkearns/elm-pages/pull/519)).

Without the two pull requests mentioned above, the following caveats apply (read about the [Elm no longer emptying the mount element](./details/breaking-changes.md) for why):

- Previous versions of elm-pages render extra whitespace nodes in `<body>`, causing the first diff with `view` to be off, leading to basically the entire page being re-rendered. That’s not worse than without my forks though: Without my forks your elm-pages app re-renders the entire page anyway due to `Lazy` and `Keyed` nodes (one of the things fixed in my forks).
- You’ll end up with an extra `<div data-url>` element in `<body>`. I’m not sure what that affects.
- You’ll end up with an extra `<div aria-live>` element in `<body>`. That should be fine, since it will stay unchanged. `aria-live` only announces changes to the DOM.

</details>

<details>

<summary>Lamdera</summary>

TL;DR: To test your Lamdera app with my forks _locally,_ you need to compile Lamdera yourself with [pull request #40](https://github.com/lamdera/compiler/pull/40). **Note:** This only applies if you _actually_ use Lamdera. Not if you just use Lamdera as an alternative Elm compiler, like elm-pages does.

Lamdera copies some functions from elm/virtual-dom, to make modifications to them. My fork of elm/virtual-dom also changes those functions. The pull request mentioned above copies those changes, and supports both the original version and my fork. It also adds `data-elm` to an element that `lamdera live` expects to disappear when Elm initializes.

For Lamdera in production, follow [pull request #65](https://github.com/lamdera/compiler/pull/65).

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

I have never used elm-optimize-level-2.

There is a pull request for [supportArraysForHtml](https://github.com/mdgriffith/elm-optimize-level-2/pull/108) which I suspect might conflict with the changes in my fork. That pull request isn’t merged, so that shouldn’t be a problem, but it shows that there _could_ be things in elm-optimize-level-2 that aren’t supported.

</details>

### Installation

elm/virtual-dom and elm/browser both contain Kernel (JavaScript) code. Kernel code is not allowed on [package.elm-lang.org](https://package.elm-lang.org/), except for in `elm/` and `elm-explorations/*` packages. So I can’t publish for example lydell/virtual-dom on the package site, and as such you can’t install it from there.

elm/html does not have any Kernel code, but on the other hand, lots of other packages depend on elm/html, so it’s not really a viable solution to publish lydell/html.

Because of the above constraints, installing my forks requires a bit more creativity.

There are currently two main ways to install them:

1. A pretty comprehensive Node.js script called [replace-kernel-packages.mjs](#replace-kernel-packagesmjs).

2. A simpler bash script – [lydell.bash](#lydellbash) – that was originally made for _testing_ my forks, so it cuts a few corners. It’s still uses the same approach as the Node.js script, and might be a simpler way to learn the technique if you’re familiar with bash.

There are two future ways of installing:

1. I’m collaborating with the [Lamdera Compiler](https://github.com/lamdera/compiler/). We’re experimenting with installing my forks automatically when using the Lamdera Compiler! Note that the Lamdera Compiler is open source and can be used for vanilla Elm apps, not just Lamdera apps. If this effort pans out, it’ll be by far the easiest way to install, since all you need to do is replace your `elm make` command with `lamdera make`.

2. The [elm-janitor](https://github.com/elm-janitor/) project might merge the [pull requests](#the-pull-requests) I’ve made to the upstream Elm packages. If that happens, you can use their [apply-patches](https://github.com/elm-janitor/apply-patches) script to install (not just my forks, but fixes to other `elm/*` packages as well). Or whatever other way there is to install elm-janitor fixes.

Finally, there are two ways for those who like living on the edge:

1. The [Zokka](https://github.com/Zokka-Dev/zokka-compiler) fork of the Elm compiler supports overriding dependencies.

2. [elm-sideload](https://github.com/jmpavlick/elm-sideload) is a CLI tool for sideloading/overriding Elm packages from your elm.json.

#### How to modify installed Elm packages

This section explains how to modify installed Elm packages. Both [replace-kernel-packages.mjs](#replace-kernel-packagesmjs) and [lydell.bash](#lydellbash) use this technique. You can skip this section if you’re not particularly interested, but it might be easier to use those scripts if you read this.

When you run `elm make`, the Elm compiler downloads packages needed by your project. It stores them in `~/.elm/` on Linux and macOS, and in `%APPDATA%\elm` on Windows. You can customize this location by setting the `ELM_HOME` environment variable. Because of that, we often call the package installation directory “your `ELM_HOME`”.

If you take a look in your `ELM_HOME`, you’ll see folders for every Elm package and version you have ever installed. Each package folder contains the source code of the package (`.elm` files), as well as Kernel code for `elm/*` and `elm-explorations/*` packages (`.js` files).

What happens if you edit a file in there? Well … not much. Because of caching. But if you bust the cache – then you can make any changes you like. There are two things you need to remove after each edit:

1. Each package in `ELM_HOME` contains an `artifacts.dat` file (or `artifacts.x.dat` if you use Lamdera). This file isn’t downloaded, it’s created by the Elm compiler when compiling your project.
2. The local `elm-stuff/` folder in your project.

Something to keep in mind when making changes in the default `ELM_HOME` location (`~/.elm/`), is that it affects _all_ your Elm projects on your computer. This means that if you mess something up, you mess up _all_ your projects. On the other hand, if want my forks in all your projects, that can also be convenient. If you mess things up badly, you can just delete `ELM_HOME` and have the Elm compiler download everything from scratch.

Personally, I don’t like making “global” changes like that. I generally want my projects to be more “self contained”. So I recommend using a folder local to the project for `ELM_HOME` if you’re gonna mess around with the packages in there. (Though there is a downside to a local `ELM_HOME` – see the end of this section.)

A simple thing to do is setting `ELM_HOME=elm-stuff/elm-home/`. Then your `ELM_HOME` will be inside your regular, local `elm-stuff/`. This is convenient because you probably already have `elm-stuff/` in your `.gitignore` file, and tools like elm-format and elm-watch ignore files in `elm-stuff/`.

A downside of putting `ELM_HOME` inside `elm-stuff/`, is that the Elm Compiler sometimes instructs you to delete `elm-stuff/` when something has gone wrong with the files in there. If you do, you’ll also delete `elm-stuff/elm-home/`. That’s a bit annoying, because downloading all packages takes more time than just compiling without `elm-stuff/` cache, and requires Internet access. It also depends on the [package.elm-lang.org](https://package.elm-lang.org/) server being up. This can be solved in two ways.

The first way is to learn to delete `elm-stuff/0.19.1/` instead of the full `elm-stuff/` folder. Than’s a good habit anyway, since `elm-stuff/` also contains elm-test and elm-review stuff that you don’t really need to delete ever.

However, teaching that to all collaborators of the project might be difficult, so you might consider it worth putting your local `ELM_HOME` somewhere else. An obvious candidate is a local `elm-home/` folder. However, you’ll quickly notice that elm-format wants to format all the files in there. So `elm-home/elm-stuff/` is a better choice. elm-format ignores anything in folders called `elm-stuff/`, no matter where they are, or if they are “real” `elm-stuff/` folders or not.

Ok, so now we’ve talked about how to make edits to Elm packages. But in reality we don’t want to make little edits here and there, we want to replace whole packages – with my forks in particular. How do we do that?

I recommend copying the `elm.json` file and `src/` folders of my forks into your project and committing them. Then all you need to do is copying them into your local `ELM_HOME`, delete `artifacts.dat`, delete `elm-stuff/0.19.1/`, and set `ELM_HOME` when you then run the Elm compiler for your project. Copying the files from my forks is a very simple, robust and secure way of getting them into your project. It should work on your computer, your colleague’s computer, and on your continuous integration server. And it should keep working tomorrow. No surprises.

If you absolutely despise the idea of vendoring a bunch of code into your project, you can experiment with downloading it as needed. If you pull code from my forks on GitHub, you might want to think about:

- Locking to a specific commit.
- Verifying that you got the same code as last time with a hash.
- Caching the download.

The [elm-sideload](https://github.com/jmpavlick/elm-sideload) tool attempts to do this.

Finally, I mentioned that there’s a downside to having a local `ELM_HOME`. Your IDE. You’ll probably run your IDE with `ELM_HOME` unset, which means that it’ll go looking for packages in the default `~/.elm` location. That works fine, as long as `~/.elm` contains all the packages you need. If you add a new package in your project, it might only be installed in the _local_ `ELM_HOME`. Then your IDE might be unhappy. You can solve this by running one more install command so that the global `~/.elm` folder is updated too. Or you could try to configure your IDE to have the local `ELM_HOME` set. Or you could decided to patch the global `~/.elm` instead. There is no perfect solution.

#### replace-kernel-packages.mjs

Download [replace-kernel-packages.mjs](./replace-kernel-packages.mjs) from this repo and follow these steps:

1. Create `elm-kernel-replacements/elm-stuff/`. This folder is supposed to be committed, despite the `elm-stuff/` (it’s just there to avoid elm-format wanting to format all the files in there).

2. Copy [my forks](#the-forks) into it. See below for exactly what the folder structure is supposed to look like.

3. Create a `source.txt` file in each fork folder. This file shows where the replacement package was copied from (for humans). Update the file each time you copy over new changes. This allows the script to detect when it needs to redo work and clear caches. I recommend putting a link to a commit in `source.txt`, such as `https://github.com/lydell/virtual-dom/commit/86a70be439e9a3c06e3d2911e701f350a5f19e86`. (If you feel really fancy, you could use git submodules or git subtrees, but don’t go into that rabbit hole unless you really want to. I wouldn’t recommend it myself.)

4. Modify the start command for your project:

   - Make sure that the `replaceKernelPackages` function in `replace-kernel-packages.mjs` is run before your usual command. It copies `elm-kernel-replacements/elm-stuff/` into `elm-home/elm-stuff/`, replacing the mentioned packages.

   - Make sure that `ELM_HOME` is set to the local `elm-home/elm-stuff/` folder. This folder is supposed to be in the `.gitignore` file.

The script is pretty smart and only removes `artifacts.dat` and `elm-stuff/0.19.1/` if needed, avoiding unnecessarily slow compile times. It also has a bunch of validation checks, to make sure that nothing strange is going on.

Here’s the expected folder structure for `elm-kernel-replacements`:

```
elm-kernel-replacements
└── elm-stuff
    └── elm
        ├── browser
        │   └── 1.0.2
        │       ├── elm.json
        │       ├── source.txt
        │       └── src
        │           ├── Browser
        │           │   ├── AnimationManager.elm
        │           │   ├── Dom.elm
        │           │   ├── Events.elm
        │           │   └── Navigation.elm
        │           ├── Browser.elm
        │           ├── Debugger
        │           │   ├── Expando.elm
        │           │   ├── History.elm
        │           │   ├── Main.elm
        │           │   ├── Metadata.elm
        │           │   ├── Overlay.elm
        │           │   └── Report.elm
        │           └── Elm
        │               └── Kernel
        │                   ├── Browser.js
        │                   ├── Browser.server.js
        │                   └── Debugger.js
        ├── html
        │   └── 1.0.0
        │       ├── elm.json
        │       ├── source.txt
        │       └── src
        │           ├── Html
        │           │   ├── Attributes.elm
        │           │   ├── Events.elm
        │           │   ├── Keyed.elm
        │           │   └── Lazy.elm
        │           └── Html.elm
        └── virtual-dom
            └── 1.0.4
                ├── elm.json
                ├── source.txt
                └── src
                    ├── Elm
                    │   └── Kernel
                    │       ├── VirtualDom.js
                    │       └── VirtualDom.server.js
                    └── VirtualDom.elm
```

#### lydell.bash

Download [lydell.bash](./lydell.bash) from this repo and follow the instructions inside.

The bash script:

- Instructs you to clone my forks.
- Instructs you to type in the command you use to run your app.
- Runs that command with `ELM_HOME` set `elm-stuff/elm-home/` (local to your app) and copies files from my forks into it.

The script should work on macOS and Linux (but you might need to tweak it if you use some funky setup). On Windows, you can do the steps manually, or write your own script.

Compared to [replace-kernel-packages.mjs](./replace-kernel-packages.mjs), `lydell.bash` does the bare minimum to get things working, and isn’t particularly smart.

## What to test

Here are some things to test before shipping to production:

- Does the page crash?
- Do elements end up in the wrong place?
- Do elements end up with the wrong style?
- Do you notice the page feeling much slower?

Here are some specific things that I have tested quite a bit myself, but would like to see tested more:

- Google Translate work? Does it display usable text after updates to the DOM? Can you find a language that breaks down?
- Does Grammarly work?
- Do other browser extensions work?
- Do your third-party scripts work?

Here are some things that people on Discord have tested a lot:

- Web components/Custom elements.
- Multiple Elm apps on the same page.
- Heavy or important use of `Html.Keyed`.
- Use of [elm-program-test](https://elm.dmy.fr/packages/avh4/elm-program-test/latest/), or any HTML based testing in elm-test.

I’m also looking for testing in apps with heavy use of:

- elm-pages.
- Heavy or important use of `Html.Lazy`.
- Use of [elm-explorations/webgl](https://elm.dmy.fr/packages/elm-explorations/webgl/latest/).
- Use of [elm-explorations/markdown](https://elm.dmy.fr/packages/elm-explorations/markdown/latest/).
- Crazy, weird, edge-case:y things.

It’s good testing in multiple environments:

- Different operating systems.
- Different devices (computers, tablets, phones).
- Different browsers.

When you’re done testing, take a break and then test the same amount again, if you have the time. If you’ll find a bug, it’ll probably be while doing the most unexpected little thing.

## How to provide feedback

There are two main ways to provide feedback:

1. Open an issue in this repo about a problem.
2. Chat in the `#elm-virtual-dom` channel on the [Incremental Elm Discord](https://incrementalelm.com/chat/).

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

- A [new algorithm for pairing virtual DOM nodes](./details/new-dom-node-pairing-algorithm.md) with the corresponding real DOM nodes, that should be robust against browser extensions and third-party scripts. It is in the code for the old algorithm where most crashes happen. [elm/html#44](https://github.com/elm/html/issues/44) [elm/browser#121](https://github.com/elm/browser/issues/121) [elm/browser#66](https://github.com/elm/browser/issues/66) [elm/virtual-dom#147](https://github.com/elm/virtual-dom/issues/147)
- [Support for the page being translated](./details/page-translation-support.md), for example Google Translate. This requires the above change (being robust), and then a little bit of extra code to make sure that translated text isn’t left behind on the page, and so that translated text that should change actually updates.
- The `Html.map` bug where messages of the wrong type can appear in `update` functions is fixed, by completely [changing how `Html.map` works](./details/html-map.md). The old code was incredibly difficult to understand, but could theoretically skip more work in some cases. The new code is instead very simple, leaving little room for errors. [elm/virtual-dom#105](https://github.com/elm/virtual-dom/issues/105) [elm/virtual-dom#162](https://github.com/elm/virtual-dom/issues/162) [elm/virtual-dom#171](https://github.com/elm/virtual-dom/issues/171) [elm/virtual-dom#166 (PR)](https://github.com/elm/virtual-dom/pull/166) [elm/html#160](https://github.com/elm/html/issues/160) [elm/compiler#2069](https://github.com/elm/compiler/issues/2069)
- [Improved `Html.Keyed`](./details/html-keyed.md). The algorithm is slightly smarter without losing performance, and uses the new `Element.prototype.moveBefore` API, if available, which allows moving an element on the page without “resetting” it (scroll position, animations, loaded state for iframes and video, etc.). [elm/virtual-dom#175](https://github.com/elm/virtual-dom/issues/175) [elm/virtual-dom#178](https://github.com/elm/virtual-dom/issues/178) [elm/virtual-dom#183](https://github.com/elm/virtual-dom/issues/183)
- [“Virtualization” is now completed](./details/virtualization.md), making it usable in practice, for example for elm-pages. This means that server-side rendered pages no longer have to redraw the whole page when Elm initializes.
- CSS custom properties, like `--primary-color`, can now be set with `Html.Attributes.style "--primary-color" "salmon"`. [elm/html#177](https://github.com/elm/html/issues/177)
- `Svg.Attributes.xlinkHref` no longer mutates the DOM on every single render, which caused flickering in Safari sometimes. [elm/virtual-dom#62](https://github.com/elm/virtual-dom/issues/62)
- `lazy` no longer changes behavior for `<input>`. [elm/virtual-dom#189](https://github.com/elm/virtual-dom/issues/189)

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

My fork of elm/browser is a mixed bag of small changes. I have made separate [pull requests](#the-pull-requests) for each thing.

- In my fork of elm/virtual-dom, I made the “virtualize” function complete, making it work in practice. One aspect of virtualization that could _not_ be solved in elm/virtual-dom on its own, was the bug where `<a>` elements didn’t get their click listener attached during virtualization, making them do full page reloads instead of being routed by Elm. This had to be fixed in _both_ the virtual-dom package, _and_ the browser package. This is the change in my fork that is the most related to the virtual-dom changes.

- elm/browser is in charge of the Elm debugger. The debugger code has a bug where it passes `document` instead of `document.body` to the “virtualize” function, for the debugger window. Previously, that didn’t matter at all and happened to work anyway. With my fork of elm/virtual-dom, that caused the debugger window to be a blank page. I’ve fixed that (adding `.body`), but I also added compatibility for that bug in my virtual-dom fork, so it can be used without my elm/browser fork without breaking the debugger. Basically, I added `if (node === document) { node = document.body; }` as a workaround. So this change isn’t _technically_ needed, but it’s nice fixing problems “in the right place” too.

- Speaking of the debugger, it has various bugs I’ve fixed:

  - In Firefox the debugger window background is dark if your computer is in dark mode, making it hard to read things in the debugger. I’ve set the background color of the debugger window explicitly to white, which is the recommendation for web pages anyway.

  - The pause button doesn’t do anything. Implementing it seems to have been forgotten – it always acts like a play button. I’ve implemented it.

  - Custom type variants starting with a non-ascii letter (like `Ärtan`) were displayed correctly in the messages sidebar, but not in the main view of the debugger. I’ve synced the two so that they show up as expected always.

  - Large collections, like lists with thousands of items, either cause the debugger and the whole application to be very slow, or crash with a stack overflow. I’ve made it fast and not crashing by only expanding 100 items of collections at a time, with a “view more” button.

- You might have noticed that when Elm’s virtual DOM crashes, you get an error in the browser console many times per second. This is because Elm generally draws on the next animation frame using `requestAnimationFrame`, and if it crashes during rendering it gets stuck in an infinite `requestAnimationFrame` loop. That’s really annoying. When changing the code to not get caught in a loop if there is an exception, I also noticed that the whole `requestAnimationFrame` was a bit off. Basically, if you also subscribe to `Browser.Events.onAnimationFrame`, you could end up with `update` and `view` being 1 frame out of sync, and some frames could be skipped. I made a [demo showing these animation frame oddities](https://lydell.github.io/elm-animation-frame-oddities/). My fork fixes that, except the demo cases where the animation frames come via a port – I don’t think that is solvable.

- Finally, there’s a bug where clicks on `<a>` elements _without_ `href` still end up producing a `LinkClicked` messages, even though such elements shouldn’t be clickable. I’ve fixed that. (But note that this fix doesn’t work during development with elm-watch – see the [Compatibility with tooling](#compatibility-with-tooling) section.) [elm/browser#34](https://github.com/elm/browser/issues/34) [elm/browser#55](https://github.com/elm/browser/issues/55) [elm/browser#64](https://github.com/elm/browser/issues/64)

### Legacy

This repo used to contain the code of a previous attempt at making a safer virtual DOM for Elm. You can find that code in the [legacy branch](https://github.com/lydell/elm-safe-virtual-dom/tree/legacy).
