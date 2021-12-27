/**
 * @module utils
 */

export function injectCSS(css) {
  const style = document.createElement('style');

  if (style.styleSheet) {
    style.styleSheet.cssText = css.trim();
  } else {
    style.appendChild(document.createTextNode(css.trim()));
  }

  document.head.appendChild(style);
}

export function appendHTML(html, parent) {
  const nodes = [];
  const parser = new DOMParser();
  const stage = parent || document.body;
  const fragment = document.createDocumentFragment();
  const { body } = parser.parseFromString(html.trim(), 'text/html');

  while (body.firstChild) {
    nodes.push(fragment.appendChild(body.firstChild));
  }

  stage.appendChild(fragment);

  return nodes;
}
