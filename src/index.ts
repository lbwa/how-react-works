declare module React {
  interface Element<P = any> {
    type: string
    props: P
  }
}

interface Fiber {
  type: string
  // parent fiber
  return: Fiber | null
  // singly linked list tree structure
  child: Fiber | null
  sibling: Fiber | null
  props: Record<string, any> & Record<'children', React.Element[]>
  dom: HTMLElement | null
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

// Fiber

function createDom(fiber: Fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  const isDomProperty = (key: string) => key !== 'children'
  Object.keys(fiber.props)
    .filter(isDomProperty)
    .forEach((prop) => ((dom as any)[prop] = fiber.props[prop]))

  return dom as HTMLElement
}

// In the render function we set nextUnitOfWork to the root of the fiber tree
function render(element: React.Element, container: HTMLElement) {
  workInProgressRoot = nextUnitOfWork = {
    type: '',
    return: null,
    child: null,
    sibling: null,
    dom: container,
    props: {
      children: [element]
    }
  }
}

// Concurrent mode

let nextUnitOfWork: Fiber | null = null
/**
 * Why should we need a workInProgress root?
 * the browser could interrupt(due to requestIdleCallback) our work before we
 * finish rendering the whole tree. In that case, the user will see an
 * incomplete UI. And we don't want that.
 */
let workInProgressRoot: Fiber | null = null

function workLoop(deadline: RequestIdleCallbackDeadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // Once we finish all the work(we know it because there isn't a next unit of
  // work) we commit the whole fiber tree to the DOM.
  if (!nextUnitOfWork && workInProgressRoot) {
    commitFiberRoot()
  }

  // The browser will run the callback when the main thread is idle.
  /**
   * React doesn't use requestIdleCallback anymore. Now it uses the `scheduler` package. But for this use case it's conceptually the same.
   * @see https://github.com/facebook/react/issues/11171#issuecomment-417349573
   * @see https://github.com/facebook/react/tree/master/packages/scheduler
   */
  requestIdleCallback(workLoop)
}

// when the browser is ready, it will call our workLoop and we'll start working
// on the root
requestIdleCallback(workLoop)

function performUnitWork(fiber: Fiber): Fiber | null {
  // add dom node, we keep track of the DOM node in the fiber.dom property
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  // for each child we create a new fiber(transform elements to fibers)
  const elements = fiber.props.children
  let index = 0
  let prevSibling: Fiber | null = null

  while (index < elements.length) {
    const element = elements[index]

    const newFiber: Fiber = {
      type: element.type,
      props: element.props,
      return: fiber,
      child: null,
      sibling: null,
      dom: null
    }

    // we add it to the fiber tree setting it either as a child or as a
    // sibling, depending on whether it's the first child or not.
    if (index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling!.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }

  // return next unit of work
  // finally we search for the next unit of work. We first try with the child,
  // then with the sibling, then with the uncle, and so on.
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber: Fiber | null = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.return
  }
  return null
}

// render and commit phases

function commitFiberRoot() {
  // add nodes to dom
  if (!workInProgressRoot) {
    return
  }
  commitWork(workInProgressRoot.child)
  workInProgressRoot = null
}

function commitWork(fiber: Fiber | null) {
  if (!fiber) {
    return
  }
  const domParent = fiber.return?.dom
  domParent?.appendChild(fiber.dom!)
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// export

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
