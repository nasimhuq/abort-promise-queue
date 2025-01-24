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
                list.unsubscribeAll()
                resolve(true)
                return
            }
            if (list.value.length > 0) {
                resolve(true)
                return
            }
            const removeSubscription = {}
            const listHasValue = () => {
                resolve(true)
                removeSubscription?.['unsubscribeListHasValue']()
            }
            removeSubscription['unsubscribeListHasValue'] = () => {
                list.unsubscribe(listHasValue)
            }
            list.subscribe(listHasValue)
        })
    }
    async function* promiseQueueGenerator() {
        while (true) {
            if (isTerminated()) {
                list.unsubscribeAll()
                return { done: true }
            }
            const response = await list.value.shift().promise
            yield response
            await waitForListToFillUp()
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
