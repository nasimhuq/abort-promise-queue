export const abortPromisesQueue = (api, batch = false, delay = 1000) => {
    let kill = !batch
    let queue = []

    function waitForQueueToFillUp() {
        return new Promise((resolve) => {
            let intervalId = setInterval(() => {
                if (queue.length || kill) {
                    clearInterval(intervalId)
                    resolve()
                }
            }, delay)
        })
    }

    function* generatorInputQueue() {
        while (true) {
            const originalConfig = yield
            const url = originalConfig.url
            const config = originalConfig.config
            const controller = new AbortController()
            const signal = controller.signal
            const result = { config: originalConfig, controller }
            if (config) {
                const promise = api(url, { signal, ...config }).catch((e) => {
                    result.error = e
                })
                queue.unshift({ promise, result })
            }
        }
    }

    async function* generatorOutputQueue(clearInputQueue) {
        while (true) {
            if (!queue.length) {
                if (kill) {
                    clearInputQueue()
                    break
                }
                await waitForQueueToFillUp()
                continue
            }
            const allConfig = queue.pop()
            const promise = allConfig.promise
            const result = allConfig.result
            try {
                result.data = await promise
            } catch (e) {
                result.error = e
            }
            if (result.controller) {
                delete result.controller
            }
            yield result
        }
    }

    const inputQueue = generatorInputQueue()
    const clearInputStream = () => {
        inputQueue.return()
    }
    const outputQueue = generatorOutputQueue(clearInputStream)
    inputQueue.next()

    return {
        inputQueue,
        outputQueue,
        abortQueue: () => {
            let abortPromises = queue
            queue = []
            kill = true
            abortPromises.forEach((item) => {
                if (item?.result?.controller) {
                    item.result.controller.abort()
                }
            })
        },
        closeQueue: () => {
            kill = true
        },
    }
}

export default abortPromisesQueue
