export default abstract class ElementWrap<T extends HTMLElement = HTMLElement> {
    protected _element: T = null!;

    protected abstract createElement(): HTMLElement

    private initElement() {
        return this._element = this.createElement() as T;
    }

    public reRenderElement() {
        const newElement = this.createElement();
        if (this._element) {
            this._element.replaceWith(newElement);
        }
        return this._element = newElement as T;
    }

    public get element() {
        if (!this._element) {
            this.initElement();
        }
        return this._element
    }

    public static from(node: HTMLElement): ElementWrap {
        return new class clz extends this {
            protected createElement() {
                return node;
            }
        }
    }
}