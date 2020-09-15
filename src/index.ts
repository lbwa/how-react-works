declare module React {
  interface Element<P = any> {
    type: string
    props: P
  }
}

interface Fiber {
  type: string
  /**
   * parent fiber
   */
  return: Fiber | null
  // singly linked list tree structure
  child: Fiber | null
  sibling: Fiber | null
  props: Record<string, any> & Record<'children', React.Element[]>
  dom: HTMLElement | null
  /**
   * a link to the old fiber, the fiber that we committed to the DOM in the
   * previous commit phase.
   */
  alternate: Fiber | null
  effectTag?: EffectTag
}

enum EffectTag {
  UPDATE,
  PLACEMENT,
  DELETION
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
    },
    alternate: currentRoot
  }
  deletions = []
}

// Concurrent mode

let nextUnitOfWork: Fiber | null = null
/**
 * Why should we need a workInProgress root?
 * the browser could interrupt(due to requestIdleCallback) our work before we
 * finish rendering the whole tree. In that case, the user will see an
 * incomplete UI. And we don't want that.
 *
 * Instead, we'll keep track of the root of the fiber tree. We call it the work
 * in progress root. And once we finish all the work(we know it because there
 * isn't a next unit of work) we commit the whole fiber tree to the DOM
 */
let workInProgressRoot: Fiber | null = null
/**
 * For updating or deleting nodes, we need to compare the elements we receive
 * on the render function to the last fiber tree we committed to the DOM, so we
 * keep a reference to that `last fiber tree we committed to the DOM` after we
 * finish the commit. We call it currentRoot
 */
let currentRoot: Fiber | null = null
let deletions: Fiber[] = []

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
  reconcileChildren(fiber, elements)

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

/**
 * reconcile the old fibers with the new elements
 * @param fiber the odl fibers
 * @param elements the new elements
 */
function reconcileChildren(
  workInProgressFiber: Fiber,
  elements: React.Element[]
) {
  let index = 0
  /**
   * The oldFiber is what we rendered the last time
   */
  let oldFiber =
    workInProgressFiber.alternate && workInProgressFiber.alternate.child
  let prevSibling: Fiber | null = null

  while (index < elements.length || oldFiber !== null) {
    /**
     * The element is the thing we want to render to the DOM
     */
    const element = elements[index]
    const sameType = oldFiber && element && element.type === oldFiber.type
    let newFiber: Fiber | null = null

    /**
     * If the old fiber and the new element have the same type, we can keep the
     * DOM node and just update it with the new props
     */
    if (sameType) {
      newFiber = {
        type: oldFiber?.type || '',
        props: element.props,
        dom: oldFiber?.dom || null,
        return: workInProgressFiber,
        child: null,
        sibling: null,
        alternate: oldFiber,
        effectTag: EffectTag.UPDATE
      }
    }

    /**
     * If the type is different and there is a new element, it means we need to
     * create a new DOM node.
     */
    if (!sameType && element) {
      newFiber = {
        type: oldFiber?.type || '',
        props: element.props,
        dom: oldFiber?.dom || null,
        return: workInProgressFiber,
        child: null,
        sibling: null,
        alternate: null,
        effectTag: EffectTag.PLACEMENT
      }
    }

    /**
     * If the types are different and there is an old fiber, we need to remove
     * the old node
     */
    if (!sameType && oldFiber) {
      oldFiber.effectTag = EffectTag.DELETION
      deletions.push(oldFiber)
    }

    /***
     * Here React also uses keys, that makes a better reconciliation. For
     * examples, it detects when children change places in the element array.
     */

    // we add it to the fiber tree setting it either as a child or as a
    // sibling, depending on whether it's the first child or not.
    if (index === 0) {
      workInProgressFiber.child = newFiber
    } else {
      prevSibling!.sibling = newFiber
    }
    prevSibling = newFiber
    index++
  }
}

// render and commit phases

const isEventProp = (key: string) => /^on/.test(key)
const isDomProp = (key: string) => key !== 'children' && !isEventProp(key)
const isNew = (
  prev: Record<string, unknown>,
  next: Record<string, unknown>
) => (key: string) => prev[key] !== next[key]
const isGone = (next: Record<string, unknown>) => (key: string) =>
  !Object.prototype.hasOwnProperty.call(next, key)
function updateDom(
  dom: HTMLElement,
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>
) {
  // remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEventProp)
    .filter(
      (key) =>
        !Object.prototype.hasOwnProperty.call(nextProps, key) ||
        isNew(prevProps, nextProps)
    )
    .forEach((name) => {
      dom.removeEventListener(
        (name as keyof HTMLElementEventMap).toLowerCase().slice(2),
        prevProps[name] as EventListenerOrEventListenerObject
      )
    })

  // add event listeners
  Object.keys(nextProps)
    .filter(isEventProp)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom.addEventListener(
        (name as keyof HTMLElementEventMap).toLowerCase().slice(2),
        nextProps[name] as EventListenerOrEventListenerObject
      )
    })

  // remove old properties
  Object.keys(prevProps)
    .filter(isDomProp)
    .filter(isGone(nextProps))
    .forEach((name) => (dom as any)[name] === '')

  // set new or changed properties
  Object.keys(nextProps)
    .filter(isDomProp)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => ((dom as any)[name] = nextProps[name]))
}

/**
 * recursively append all the nodes to the dom
 */
function commitFiberRoot() {
  // add nodes to dom
  if (!workInProgressRoot) {
    return
  }
  deletions.forEach(commitWork)
  commitWork(workInProgressRoot.child)
  workInProgressRoot = null
}

function commitWork(fiber: Fiber | null) {
  if (!fiber) {
    return
  }
  const domParent = fiber.return?.dom
  if (fiber.effectTag === EffectTag.PLACEMENT && fiber.dom !== null) {
    domParent?.appendChild(fiber.dom)
  } else if (fiber.effectTag === EffectTag.UPDATE && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate?.props || {}, fiber.props)
  } else if (fiber.effectTag === EffectTag.DELETION) {
    domParent?.removeChild(fiber.dom!)
  }
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
