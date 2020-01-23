const http = require("http")
const url = require("url")

const _cookie = require("cookie")

const Request = (path, bodyBuffer) => ({
    path,
    bodyBuffer,
    body: null,
})
const NodeRequest = (source, bodyBuffer) => {
    const requestURL = new URL(source.url, "file://internal")
    const req = Request(requestURL.pathname, bodyBuffer)

    req.method = source.method
    req.headers = {}
    for (const header of Object.keys(source.headers)) {
        const camelHeader = header.replace(
            /\-(\w)/g,
            (_, s) => s.toUpperCase()
        )
        req.headers[camelHeader] = source.headers[header]
    }

    req.query = Array
        .from(
            requestURL.searchParams.keys()
        )
        .reduce(
            (p, key) => {
                const value = requestURL.searchParams.getAll(key)
                p[key] = (value.length === 1) ? value[0] : value
                return p
            },
            {}
        )

    return req
}

const Response = () => {
    const self = {
        headers: {
            contentType: "text/plain",
        },
        statusCode: 200,
    }

    const addFuncs = source => {
        for (const [name, func] of Object.entries(source)) {
            self[name] = (...args) => {
                func(...args)
                return self
            }
        }
    }

    const status = statusCode =>
        self.statusCode = statusCode
    const send = (data, type = null) => {
        self.body = data
        if (type !== null) {
            self.headers.contentType = type
        }
    }
    const sendJSON = (data) => send(
        JSON.stringify(data),
        "application/json"
    )

    const cookie = (name, value) => {
        const cookieString = _cookie.serialize(name, value)
        if (self.headers.setCookie === undefined) {
            self.headers.setCookie = []
        }
        self.headers.setCookie.push(cookieString)
    }

    addFuncs({
        status,
        send,
        sendJSON,
        cookie,
    })

    return self
}

const processHandlers = async (req, res, handlers) => {
    // const res = {}
    for (const handler of handlers) {
        await handler(req, res)
        if (res.body !== undefined) {
            return res
        }
    }
    return null
}
const nums = Array.from({length: 100}, (_, i) => i)
const match = (req, path) => {
    if (req.path === path) {
        return true
    }
    return false
}
const handlers = [
    (req, res) => {
        res.headers = {}
    },
    (req, res) => {
        res.headers.wat = "test"
    },
    // (req, res) => res,
    (req, res) => {
        res.send("hi")
    },
    // (req, res) => res,
]
const main = async () => {
    const request = {
        path: "/test",
    }
    const response = await processHandlers(request, Response(), handlers)
    console.log(response)
}
// main()

const corsHandler = (options = {}) => {
    const {
        origin = "*",
        methods = "*",
    } = options

    return (req, res) => {
        res.headers.accessControlAllowOrigin = origin
        res.headers.accessControlAllowMethods = methods
    }
}

const bodyParserHandler = async (req, res) => {
    if (req.method !== "POST") {
        return
    }
    const parser = bodyParser[req.headers.contentType]
    const body = parser
        ? await parser(req.bodyBuffer)
        : req.bodyBuffer
    req.body = body
}
const bodyParser = {
    "application/json": (raw) => {
        if (raw.length === 0) {
            return {}
        }
        return JSON.parse(
            raw.toString()
        )
    }
}

const cookieParserHandler = (req, res) => {
    // console.log(req.headers)
    // req.cookie = req.headers.cookie
    req.cookie = _cookie.parse(req.headers.cookie)
}

const camelToHeader = name =>
    name
        .replace(/[A-Z]/g, (s) => `-${s}`)
        .replace(/^\w/, s => s.toUpperCase())
const nodeHandler = (req, res) => {
    const rawBody = []
    req.on(
        "data",
        (data) => {
            rawBody.push(data)
        }
    )
    req.on(
        "end",
        async () => {
            // console.log(req.url)
            // const requestURL = new URL(req.url, "file://internal")

            // const params = Array
            //     .from(
            //         requestURL.searchParams.keys()
            //     )
            //     .reduce(
            //         (p, key) => {
            //             const value = requestURL.searchParams.getAll(key)
            //             p[key] = (value.length === 1) ? value[0] : value
            //             return p
            //         },
            //         {}
            //     )
            // console.log(requestURL)
            // console.log(requestURL.searchParams.entries())
            // console.log(requestURL.searchParams.keys())
            // console.log(requestURL.searchParams.getAll("test"))

            const bodyBuffer = (req.method === "GET")
                ? null
                : Buffer.concat(rawBody)
            const nodeRequest = NodeRequest(req, bodyBuffer)
            const nodeResponse = Response()
            const result = await processHandlers(
                nodeRequest,
                nodeResponse,
                [
                    bodyParserHandler,
                    corsHandler(),
                    cookieParserHandler,
                    (req, res) => {
                        // console.log(req)
                        res.cookie("test", "thing")
                        res.cookie("test2", "thing")
                        res.sendJSON({
                            get: req.query,
                            post: req.body,
                        })
                        // res.send("done")
                    }
                ]
            )
            console.log(result)
            // res.setHeader("contentType", "text/plain")
            for (const [name, value] of Object.entries(result.headers)) {
                res.setHeader(
                    camelToHeader(name),
                    value
                )
            }
            res.end(result.body)
            // res.end(JSON.stringify(body))
        }
    )
}
const server = http.createServer(nodeHandler)
server.listen(
    1337,
    () => console.log("listening")
)
