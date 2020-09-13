// @see https://github.com/Microsoft/TypeScript/issues/21309#issuecomment-359110723
// @see https://github.com/Microsoft/TypeScript/issues/21309#issuecomment-376338415
// @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/requestidlecallback/index.d.ts
type RequestIdleCallbackHandle = number
type RequestIdleCallbackOptions = {
  timeout: number
}
type RequestIdleCallbackDeadline = {
  readonly didTimeout: boolean
  timeRemaining: () => number
}

interface Window {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
   */
  requestIdleCallback: (
    callback: (deadline: RequestIdleCallbackDeadline) => void,
    opts?: RequestIdleCallbackOptions
  ) => RequestIdleCallbackHandle
  cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 */
declare const requestIdleCallback: (
  callback: (deadline: RequestIdleCallbackDeadline) => void,
  opts?: RequestIdleCallbackOptions
) => RequestIdleCallbackHandle

declare const cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void
