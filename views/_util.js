// Tiny DOM helpers shared by the view modules. -> window.UI
(function () {
  "use strict";

  // el("div.card", {onclick}, child, "text", ...)
  function el(spec, props, ...children) {
    const [tag, ...classes] = spec.split(".");
    const node = document.createElement(tag || "div");
    if (classes.length) node.className = classes.join(" ");
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function")
          node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function section(title, ...children) {
    return el("section.card", null, el("h2", { text: title }), ...children);
  }

  // A small stepper control: label [-] value [+]
  function stepper(label, value, onChange, min) {
    const val = el("span.stepper-val", { text: String(value) });
    const dec = el("button.btn", { text: "−", onclick: () => onChange(Math.max(min ?? 0, value - 1)) });
    const inc = el("button.btn", { text: "+", onclick: () => onChange(value + 1) });
    return el("div.stepper", null, el("span.stepper-label", { text: label }), dec, val, inc);
  }

  window.UI = { el, section, stepper };
})();
