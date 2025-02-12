# Elm safe virtual DOM

This repo:

- Documents the changes I’ve made in forks of DOM related core Elm packages.
- Has a script for testing those forks in your own project.
- Is where you can open issues for things you find while testing my forks.

## The forks

- [lydell/virtual-dom](https://github.com/lydell/virtual-dom)
- [lydell/html](https://github.com/lydell/html)
- [lydell/browser](https://github.com/lydell/browser)

## Change highlights

- Doesn’t break because of browser extensions or third party scripts.
- Supports Google Translate, and other web page translators (Firefox, Safari).
- Fixes the infamous `Html.map` bug.
- Fixes a _lot_ of other issues.
- Makes hydrating of server-side rendered HTML usable (good for elm-pages).

## Is it a drop-in replacement?

As close as drop-in it can be. You need to keep two things in mind:

1. With my forks, Elm no longer “clears“ the node you mount the Elm application on. More specifically, it only “virtualizes” elements with the `data-elm` attribute (instead of _all_ child elements), and lets any other elements be. This results in:

   - If you have an element like `<p>Looks like JavaScript failed to run.</p>` and expect Elm to remove it, that won’t happen now. To fix, you can put `data-elm` on it: `<p data-elm>`.
   - If you use CSS selectors like `body > :first-child` or `body > :last-child`, they might not apply, since your `<script>` tags in `<body>` might still be around.
   - If you do server side rendering and expect Elm to hydrate/virtualize/take charge over the server side rendered HTML, you need to make sure that all elements (except the root element) has `data-elm`. If you create the HTML with Elm (such as with elm-pages), you’ll get this automatically when you use my forks. But if you create elements some other way, make sure they have `data-elm`.

2. [Hyrum’s Law](https://www.hyrumslaw.com/). The DOM is full of complex details. Even a small fix could accidentally break something for you.

## Status

- [x] Proof of concept.
- [x] Implemented everything on my TODO list.
- [x] Test lots of things myself.
- [ ] Prepare for getting help from others to test (such as finishing this readme).
- [ ] Ask others to test.
- [ ] Fix things people report from testing.
- [ ] Make pull requests to the upstream packages. (I don’t expect them to be merged, but it’ll give them better visibility for the community.)
- [ ] Come up with good ways of installing the forks in projects.
- [ ] Start using in production apps.

## How to test

TODO

## Performance

- The well-known [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) includes Elm. I ran that Elm benchmark on my computer, with and without my forks, and got the same numbers (no significant difference).
- When testing with some large Elm applications at work, I couldn’t tell any performance difference with the forks.
- Both the official elm/virtual-dom and my fork have `O(n)` complexity.
- The official elm/virtual-dom algorithm sometimes does more work, but other times my fork does more work. It seems to even out.

## Detailed descriptions of all the changes

TODO

## Legacy

This repo used to contain the code of a previous attempt at making a safer virtual DOM for Elm. You can find that code in the [legacy branch](https://github.com/lydell/elm-safe-virtual-dom/tree/legacy).
