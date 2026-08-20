(function () {
  const excluded = new Set([
    "A", "SCRIPT", "STYLE", "TITLE", "TEXTAREA", "INPUT", "OPTION",
    "SELECT", "CODE", "PRE", "NOSCRIPT", "SVG"
  ]);

  function linkShopifyMentions() {
    let hasLinkedShopifyMention = false;

    document.querySelectorAll("a").forEach(link => {
      if (link.textContent.trim() !== "Shopify") return;
      if (hasLinkedShopifyMention) return;
      link.classList.add("shopify-link");
      link.href = "https://www.shopify.com/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "Visit Shopify");
      hasLinkedShopifyMention = true;
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || excluded.has(parent.tagName) || parent.closest("a,script,style,code,pre,svg")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.includes("Shopify") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const parts = node.nodeValue.split("Shopify");
      const fragment = document.createDocumentFragment();

      parts.forEach((part, index) => {
        if (part) fragment.appendChild(document.createTextNode(part));
        if (index < parts.length - 1) {
          if (hasLinkedShopifyMention) {
            fragment.appendChild(document.createTextNode("Shopify"));
            return;
          }

          const link = document.createElement("a");
          link.className = "shopify-link";
          link.href = "https://www.shopify.com/";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Shopify";
          link.setAttribute("aria-label", "Visit Shopify");
          fragment.appendChild(link);
          hasLinkedShopifyMention = true;
        }
      });

      node.replaceWith(fragment);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", linkShopifyMentions);
  } else {
    linkShopifyMentions();
  }
})();
