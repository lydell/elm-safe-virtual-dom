# New DOM node pairing algorithm

The original elm/virtual-dom works like this:

1. Run `view`. This produces the _new_ virtual DOM.
2. Diff the output of `view`, with the output from `view` last time (the _old_ virtual DOM). This produces a list of patches.
3. Walk the DOM using the _old_ virtual DOM as a guide, since the DOM is supposed to look like the old virtual DOM, since that’s how we rendered it a while ago. Attach actual DOM nodes to each patch. This counts the elements in a clever way, so that large parts of the DOM can be skipped if there aren’t any changes there.
4. Apply all the patches.

It’s step 3 that is problematic. It assumes that the DOM is unchanged since our last render. Unfortunately, that isn’t always the case due to browser extensions, third-party scripts and page translators like Google Translate.

The new algorithm solves this by maintaining our own tree of DOM nodes. It can look like this:

```js
var tNode = {
  domNode: div, // Reference to a <div> on the page.
  children: {
    0: {
      domNode: img, // Reference to an <img> on the page.
      children: {},
    },
    1: {
      domNode: ul, // Reference to an <ul> on the page.
      children: {
        keyA: {
          domNode: li, // Reference to an <li> on the page.
          children: {},
        },
        keyB: {
          domNode: li, // Reference to another <li> on the page.
          children: {},
        },
      },
    },
  },
};
```

I call this a `tNode`, or “tree node”, which is a tree structure that contains DOM nodes. The children are keyed by index for regular nodes (the `<div>` above), and by key for keyed nodes (the `<ul>` above). This tree structure always matches the latest rendered virtual DOM tree, while the real DOM tree might have been modified by browser extensions, page translators and third party scripts. By using our own tree, we can guarantee access to the DOM nodes we need, even if someone else has changed the page.

Every time we create a new DOM element, we not only insert it into the page, we also insert it into our own tree. And when we remove a DOM element, we both remove it from the page and from our own tree.

You could probably update step 3 in the list at the top by walking our own tree, instead of the real DOM and get quite far. My algorithm doesn’t do that, though. It instead combines diffing and patching into one: It traverses both the virtual DOM tree and the `tNode` tree at the same time, and applies changes to DOM nodes directly, instead of creating patches and applying them later. There are a couple of reasons for this:

- Having the real DOM node available during diffing is useful when comparing properties. Some properties can be changed by the web page user, such as `value` and `checked`, just by interacting with the page. My algorithm diffs properties with the _actual DOM node_ instead of the previous virtual DOM node for this reason.
- Having the real DOM node available during diffing is also useful when dealing with page translators, such as Google Translate. When finding that a text virtual node has changed, and then detecting that the text DOM node has been altered, we need to “backtrack” and re-render parts of the containing element, which requires access to the parent virtual DOM.
- It feels unnecessary to create patch objects, store them all in memory, and then apply them, instead of just making the changes immediately as we go.

While the algorithm for finding the DOM nodes to update is changed, the _diffing_ algorithm is basically unchanged in my fork. For example, it might determine that we should set the `id` attribute to `my-id`. The original elm/virtual-dom then creates a patch object describing this. My fork instead immediately applies the change to the `domNode` reference of the current `tNode`.

Finally, you might wonder why we store the DOM node references in its own tree, when we already have a tree – the virtual DOM tree! That was actually my original approach. At first it sounds simple to store the DOM nodes in the virtual DOM tree for easy access, but it quickly becomes complex and brings some downsides. Read all about it in my [previous attempt at a new node pairing algorithm](./new-dom-node-pairing-algorithm-previous-attempt.md).
