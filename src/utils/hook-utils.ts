export function getCurrentTraceLine() {
    const originalFunc = Error.prepareStackTrace

    try {
        Error.prepareStackTrace = (_, stack) => stack

        const err = new Error()
        const stack = err.stack

        if (!stack) return -1

        return (stack[2] as any).getLineNumber()
    } finally {
        Error.prepareStackTrace = originalFunc
    }
}
