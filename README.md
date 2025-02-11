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
