import { observableArray } from './observableArray.js'

export function createPromiseQueue() {
    const list = observableArray([])
    let _terminated = false
    const terminate = () => {
        _terminated = true
    }
    const isTerminated = () => _terminated

    let api = fetch
    const setApiFn = (customApi) => {
        api = customApi
    }

    const listHasValueFn = (resolve) => (unsubscribe) => () => {
        if (list.value.length > 0) {
            unsubscribe()
            resolve(true)
        }
    }
    const addToQueue = (item) => {
        if (isTerminated()) {
            throw new Error('Error: Cannot add item to terminated queue!')
        }
        const { url, config } = item
        const controller = new AbortController()
        const signal = controller.signal
        const allOptions = {
            config: { ...config, _controller: controller },
            options: { signal },
        }
        const promise = api(url, allOptions)
            .then((data) => Promise.resolve([null, data]))
            .catch((error) => Promise.resolve([error, null]))
        list.value.push({ promise, allOptions })
    }
    const waitForListToFillUp = async () => {
        return new Promise((resolve) => {
            if (isTerminated()) {
                list.value.forEach(({ allOptions }) => {
                    allOptions.config._controller.abort()
                })
                resolve(true)
                return
            }
            if (list.value.length > 0) {
                resolve(true)
                return
            }
            const listHasValue = listHasValueFn(resolve)
            const hasValue = listHasValue(() => list.unsubscribe(listHasValue))
            list.subscribe(hasValue)
        })
    }
    async function* promiseQueueGenerator() {
        while (true) {
            if (_terminated) return { done: true }
            const response = await list.value.shift().promise
            yield response
            await waitForListToFillUp()
            list.unsubscribeAll() // no need to observe list at this time
        }
    }
    return {
        promiseQueueGenerator,
        terminate,
        isTerminated,
        addToQueue,
        setApiFn,
    }
}

export default createPromiseQueue
