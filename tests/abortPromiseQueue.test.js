import CreatePromiseQueue from '../src/index.js'
const getResolvePromise = (_url, item, ms) => {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ ...item, responseCode: 'SUCCESS' }), ms)
    })
}

const getRejectPromise = (_url, item, ms) => {
    return new Promise((_resolve, reject) => {
        setTimeout(() => reject({ ...item, responseCode: 'FAILURE' }), ms)
    })
}

const logOut = ({ url, allOptions, ms }) => {
    const logInfo = {
        url,
        'expected time cost': ms,
        reject: !!allOptions.config.reject,
        key: allOptions.config.key,
    }
    console.table(logInfo)
}
const logResponse = ({ error, data }) => {
    const end = Date.now()
    const {
        config: { key, _started },
        responseCode,
        url,
        ms,
    } = error ? error : data

    console.table({
        respond: responseCode,
        url,
        key,
        'expected time cost': ms,
        duration: end - _started,
    })
}

const customApi = (url, allOptions) => {
    const ms = Math.ceil(Math.random() * 10000)
    const started = Date.now()

    logOut({
        url,
        allOptions,
        ms,
    })
    const _allOptions = {
        ...allOptions,
        config: { ...allOptions.config, _started: started },
        url,
        ms,
    }
    const getPromise = allOptions.config.reject ? getRejectPromise : getResolvePromise
    return getPromise(url, _allOptions, ms)
}

const addPromiseToQueue = (isTerminated, addToQueue) => () => {
    ;[
        { url: 'First.com', config: { key: crypto.randomUUID() } },
        { url: 'Second.com', config: { key: crypto.randomUUID() } },
        {
            url: 'Third.com',
            config: { key: crypto.randomUUID(), reject: true },
        },
        { url: 'Forth.com', config: { key: crypto.randomUUID() } },
    ].forEach((item) => {
        if (!isTerminated()) addToQueue(item)
    })

    setTimeout(() => {
        ;[
            {
                url: 'Fifth.com',
                config: { key: crypto.randomUUID(), reject: true },
            },
            { url: 'Sixth.com', config: { key: crypto.randomUUID() } },
            { url: 'Seventh.com', config: { key: crypto.randomUUID() } },
        ].forEach((item) => {
            if (!isTerminated()) addToQueue(item)
        })
    }, 7000)
}

function multipleBatches() {
    const { promiseQueueGenerator, terminate, isTerminated, addToQueue, setApiFn } =
        CreatePromiseQueue()
    const respondQueue = promiseQueueGenerator()
    setApiFn(customApi)
    addPromiseToQueue(isTerminated, addToQueue)()
    const MAX_API_REQUEST = 10
    async function consumeValues(resolve) {
        let count = 0
        for await (const respond of respondQueue) {
            const [error, data] = respond
            logResponse({ error, data })
            count++
            if (count >= MAX_API_REQUEST) {
                terminate()
            }
        }
        console.log('#---------------- multipleBatches stream terminated!')
        resolve(true)
    }
    return new Promise((resolve) => {
        consumeValues(resolve)
    })
}
function multipleBatchesAbortOnFirstError() {
    const { promiseQueueGenerator, terminate, isTerminated, addToQueue, setApiFn } =
        CreatePromiseQueue()
    const respondQueue = promiseQueueGenerator()
    setApiFn(customApi)
    addPromiseToQueue(isTerminated, addToQueue)()
    const MAX_API_REQUEST = 7
    async function consumeValues(resolve) {
        let count = 0
        const start = Date.now()
        for await (const respond of respondQueue) {
            const [error, data] = respond
            if (error) terminate()
            logResponse({ error, data })
            count++
            if (count >= MAX_API_REQUEST) {
                terminate()
            }
        }
        console.log('#-------------- multipleBatchesTerminateOnFirstError stream terminated!')
        resolve(true)
    }
    return new Promise((resolve) => {
        consumeValues(resolve)
    })
}

async function tests() {
    await multipleBatches()
    // await multipleBatchesAbortOnFirstError()
}

tests()
