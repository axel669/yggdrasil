const http = require("http")
const url = require("url")
const fs = require("fs-extra")

const _cookie = require("cookie")
const mime = require("mime-types")

const readFile = async (fileName, method) => {
    try {
        await fs.access(fileName, fs.constants.R_OK)
        if (method === "GET" || method === "POST") {
            return await fs.readFile(fileName)
        }
        if (method === "PUT") {
        }
        return ""
    }
    catch (err) {
        console.log(err)
        return null
    }
}

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
    const sendHTML = html => send(html, "text/html")
    const sendFile = (name, type) => {
        const fileContents = readFile(name, "GET")
        const mimeType = (
            type
            || mime.lookup(name)
            || "application/octet-stream"
        )
        send(fileContents, mimeType)
    }

    const cookie = (name, value) => {
        const cookieString = _cookie.serialize(name, value)
        if (self.headers.setCookie === undefined) {
            self.headers.setCookie = []
        }
        self.headers.setCookie.push(cookieString)
    }

    // const sendImage = (type, data) => send(data, type)

    addFuncs({
        status,
        send,
        sendJSON,
        sendHTML,
        sendFile,
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
    req.cookie = _cookie.parse(req.headers.cookie || "")
}

const static = options => {
    const fs = require("fs-extra")
    const path = require("path")

    const {
        dir = "public",
    } = options
    const sourceDir = path.resolve(dir)

    return async (req, res) => {
        const target = path.resolve(`${dir}${req.path}`)
        const fileContents = await readFile(target, req.method)
        const mimeType = mime.lookup(target) || "application/octet-stream"
        if (fileContents !== null) {
            res.send(
                fileContents,
                mimeType
            )
        }
    }
}

const routeGroup = () => {
    const routes = []

    return {
        addRoute: (path, handler) => {
            routes.push([path, handler])
        },
        handler: async (req, res) => {
            for (const [path, handler] of routes) {
                if (req.path === path) {
                    return await handler(req, res)
                }
            }
        }
    }
}

const camelToHeader = name =>
    name
        .replace(/[A-Z]/g, (s) => `-${s}`)
        .replace(/^\w/, s => s.toUpperCase())
const notFoundHandler = (req, res) => {
    res.status(404)
        .send("Not Found")
}

const todoApp = routeGroup()

todoApp.addRoute(
    "/test",
    (req, res) => {
        res.sendJSON("found?")
    }
)
todoApp.addRoute(
    "/test-file",
    (req, res) => {
        res.sendFile("package.json")
    }
)

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
                    static({
                        dir: ".",
                    }),
                    todoApp.handler,
                    (req, res) => {
                        if (req.method !== "POST") {
                            return
                        }
                        console.log(res)
                        res.cookie("test", "thing")
                        res.cookie("test2", "thing")
                        res.sendJSON({
                            get: req.query,
                            post: req.body,
                        })
                    },
                    notFoundHandler,
                ]
            )
            console.log(result)
            for (const [name, value] of Object.entries(result.headers)) {
                res.setHeader(
                    camelToHeader(name),
                    value
                )
            }
            res.statusCode = result.statusCode
            res.end(await result.body)
        }
    )
}
const server = http.createServer(nodeHandler)
server.listen(
    1337,
    () => console.log("listening")
)
