import abortPromisesQueue from '../index.js'

const api = (url, config) => {
    return new Promise((resolve, reject) => {
        // const { output } = config
        setTimeout(() => {
            if (config.reject) {
                reject(config)
            } else {
                resolve(config)
            }
        }, config.duration)
    })
}

const multi = 1000

const reqConfigList = [
    {
        url: 'First.com',
        config: {
            key: 'First',
            duration: 1000 + multi,
        },
    },
    {
        url: 'Second.com',
        config: {
            key: 'Second',
            duration: 500 + multi,
        },
    },
    {
        url: 'Third.com',
        config: {
            key: 'Third',
            duration: 1300,
            reject: true,
        },
    },
    {
        url: 'Fourth.com',
        config: {
            key: 'Fourth',
            duration: 1300 + multi * 2,
            reject: true,
        },
    },
    {
        url: 'Fifth.com',
        config: {
            key: 'Fifth',
            duration: 1000 + multi * 3,
            reject: true,
        },
    },
    {
        url: 'Sixth.com',
        config: {
            key: 'Sixth',
            duration: 900 + multi,
        },
    },
    {
        url: 'Seventh.com',
        config: {
            key: 'Seventh',
            duration: 700 + multi,
        },
    },
]

const test_single_batch = async (resolve) => {
    const { inputQueue, outputQueue } = abortPromisesQueue(api)
    reqConfigList.forEach((config) => {
        inputQueue.next(config)
    })
    const start = Date.now()
    try {
        for await (const res of outputQueue) {
            console.log(res)
            const end = Date.now()
            console.log('duration: ', end - start)
        }
    } catch (e) {
        console.log('something went wrong!')
    }
    console.log('finished')
    resolve() // this resolve is used for display purpose only
}

const test_abort_queue = async (resolve) => {
    const { inputQueue, outputQueue, abortQueue } = abortPromisesQueue(api)
    reqConfigList.forEach((config) => {
        inputQueue.next(config)
    })
    const start = Date.now()
    try {
        for await (const res of outputQueue) {
            console.log(res)
            if (res.error) {
                abortQueue()
            }
            const end = Date.now()
            console.log('duration: ', end - start)
        }
    } catch (e) {
        console.log('something went wrong!', e)
    }
    console.log('finished')
    resolve() // this resolve is used for display purpose only
}

const test_multiple_batches = async (resolve) => {
    const { inputQueue, outputQueue, closeQueue } = abortPromisesQueue(
        api,
        true,
        500
    )
    inputQueue.next(reqConfigList[0])
    inputQueue.next(reqConfigList[1])
    inputQueue.next(reqConfigList[2])

    const start = Date.now()
    setTimeout(() => {
        console.log('new Batch:', Date.now() - start)
        inputQueue.next(reqConfigList[3])
        inputQueue.next(reqConfigList[4])
        inputQueue.next(reqConfigList[5])
        inputQueue.next(reqConfigList[6])
    }, 3000)

    setTimeout(() => {
        closeQueue() // no more adding new fetch config to inputQueue after this call.
    }, 5000)

    try {
        for await (const res of outputQueue) {
            console.log(res)
            const end = Date.now()
            console.log('duration: ', end - start)
        }
    } catch (e) {
        console.log('something went wrong!')
    }
    console.log('finished')
    resolve() // this resolve is used for display purpose only
}

const test_multiple_batches_promise = async () => {
    return new Promise(async (resolve) => {
        test_multiple_batches(resolve)
    })
}

const test_single_batch_promise = async () => {
    return new Promise(async (resolve) => {
        test_single_batch(resolve)
    })
}

const test_abort_queue_promise = async () => {
    return new Promise(async (resolve) => {
        test_abort_queue(resolve)
    })
}
const allTests = async () => {
    console.log('---------------------- single batch -------------------------')
    await test_single_batch_promise()
    console.log('------------------- abort queue ---------------------------')
    await test_abort_queue_promise()
    console.log('------------------------multiple batches ------------------')
    await test_multiple_batches_promise()
}

allTests()
