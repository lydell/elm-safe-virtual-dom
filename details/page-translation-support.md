# Page translation support (Google Translate)

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
