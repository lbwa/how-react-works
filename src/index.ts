declare module React {
  interface Element<P = any> {
    type: string
    props: P
    key?: number | string | null
  }
}

function isObject(val: unknown): val is object {
  return typeof val === 'object'
}

function createElement(
  type: keyof HTMLElementTagNameMap,
  props: Record<string, any> | null,
  // The children array could also contain primitive values like strings or numbers

  ...children: (React.Element | string | number | boolean)[]
) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        isObject(child) ? child : createTextElement(child)
      )
    }
  }
}

function createTextElement(text: string | number | boolean) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      // React doesn't wrap primitive values or create empty arrays when aren't
      // children, we do it because it will simplify our code, and for our
      // library we prefer simple code than performance code.
      children: []
    }
  }
}

function render(element: React.Element, container: HTMLElement | Text) {
  const dom =
    element.type === `TEXT_ELEMENT`
      ? // create a text node when the element type is `TEXT_ELEMENT`
        document.createTextNode('')
      : // create a regular dom node
        document.createElement(element.type)

  // assign all DOM properties to real DOM node
  const isProperty = (key: string) => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(
      (name) =>
        ((dom as any)[name] = element.props[name]) /* TODO: letter case */
    )

  // recursively do the same for each child
  element.props.children.forEach((child: React.Element) => render(child, dom))

  container.appendChild(dom)
}

class React {
  static createElement = createElement
  static render = render
}

const element = React.createElement(
  'div',
  { id: 'root' },
  React.createElement('a', null, 'anchor'),
  React.createElement('p', null, 'paragraph')
)
React.render(element, document.getElementById('root')!)
