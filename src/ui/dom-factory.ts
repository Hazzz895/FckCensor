
export function jsx(tag: any, attrs: any): HTMLElement {
  const { children, ...restAttrs } = attrs || {};
  const childrenArray = Array.isArray(children) ? children : (children !== undefined ? [children] : []);
  return h(tag, restAttrs, ...childrenArray);
}

export { jsx as jsxs };

export function h(tag: any, attrs: any, ...children: any[]): HTMLElement {
  if (typeof tag === 'function') {
    return tag({ ...attrs, children });
  }

  const el: Element = SVG_FIXES.isSvg(tag)
    ? window.document.createElementNS(SVG_FIXES.NAMESPACE, tag)
    : window.document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), val as EventListener);
        continue;
      }
 
      if (key === 'className' || key === 'class') {
        el.setAttribute('class', val as string);
        continue;
      }
 
      const colonIndex = key.indexOf(':');
      if (colonIndex !== -1) {
        const prefix = key.slice(0, colonIndex);
        const ns = (SVG_FIXES.NAMESPACE_PREFIX_DICT as Record<string, string>)[prefix];
        if (ns) {
          el.setAttributeNS(ns, key, val as string);
          continue;
        }
      }
 
      el.setAttribute(key, val as string);
    }
  }

    for (const child of children.flat()) {
    if (child !== null && child !== undefined) {
      el.append(child instanceof Node ? child : window.document.createTextNode(String(child)));
    }
  }
 
  return el as HTMLElement;
}

export function legacyCreateElement(html: string): Element {
  const el = document.createElement("div");
  el.innerHTML = html
  if (!el.firstElementChild) throw new Error("Couldnt create element using legacy func")
  return el.firstElementChild
}

export declare namespace JSX {
  type Element = HTMLElement & HTMLAttributes;
  type Child = Child[] | Element | null | string | undefined | HTMLElement

  interface IntrinsicElements {
    div: HTMLAttributes;
    span: HTMLAttributes;
    button: HTMLAttributes;
    p: HTMLAttributes;
    h1: HTMLAttributes;
    a: HTMLAttributes;
    svg: HTMLAttributes;
    use: HTMLAttributes;
    [key: string]: any;
  }

  interface HTMLAttributes {
    class?: string;
    id?: string;
    style?: string;
    label?: string;
    required?: boolean;
    minimizedLabel?: boolean;
    description?: string;
    error?: string;
    children?: Child;
    [key: string]: any;
  }
}

const SVG_FIXES = {
 NAMESPACE: 'http://www.w3.org/2000/svg',
 NAMESPACE_PREFIX_DICT: {
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
 },
 TAGS: new Set([
  'svg', 'use', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline',
  'ellipse', 'g', 'defs', 'symbol', 'text', 'tspan', 'clipPath',
  'linearGradient', 'radialGradient', 'stop', 'mask', 'pattern', 'image',
  'foreignObject', 'marker', 'filter',
 ]),
 isSvg(tag: string) {
  return this.TAGS.has(tag)
 }
}