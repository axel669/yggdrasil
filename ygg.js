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
        const skipCode = (
            err.code === "EISDIR"
            || err.code === "ENOENT"
        )

        if (skipCode) {
            return null
        }
        return err
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

    req._raw = source
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

const modifySelf = (self, additions) => {
    for (const addition of additions) {
        for (const [key, value] of Object.entries(addition)) {
            const selfValue = (typeof value !== "function")
                ? value
                : (...args) => {
                    value(self, ...args)
                    return self
                }
            self[key] = selfValue
        }
    }
}

const responseCore = {
    status: (self, statusCode) => self.statusCode = statusCode,
    send: (self, data, type = null) => {
        self.body = data
        if (type !== null) {
            self.headers.contentType = type
        }
    },
    sendJSON: (self, data) => send(
        JSON.stringify(data),
        "application/json"
    ),
    sendHTML: (self, html) => send(html, "text/html"),
    cookie: (self, name, value, options) => {
        const cookieString = _cookie.serialize(name, value, options)
        if (self.headers.setCookie === undefined) {
            self.headers.setCookie = []
        }
        self.headers.setCookie.push(cookieString)
    },
}
const Response = (modifiers = []) => {
    const self = {
        headers: {
            contentType: "text/plain",
        },
        statusCode: 200,
    }

    modifySelf(
        self,
        [
            responseCore,
            ...modifiers,
        ]
    )

    return self
}

// const Response = () => {
//     const self = {
//         headers: {
//             contentType: "text/plain",
//         },
//         statusCode: 200,
//     }

//     const addFuncs = source => {
//         for (const [name, func] of Object.entries(source)) {
//             self[name] = (...args) => {
//                 func(self, ...args)
//                 return self
//             }
//         }
//     }

//     const status = statusCode =>
//         self.statusCode = statusCode
//     const send = (data, type = null) => {
//         self.body = data
//         if (type !== null) {
//             self.headers.contentType = type
//         }
//     }
//     const sendJSON = (data) => send(
//         JSON.stringify(data),
//         "application/json"
//     )
//     const sendHTML = html => send(html, "text/html")
//     const sendFile = (name, type) => {
//         const fileContents = readFile(name, "GET")
//         const mimeType = (
//             type
//             || mime.lookup(name)
//             || "application/octet-stream"
//         )
//         send(fileContents, mimeType)
//     }

//     const cookie = (name, value, options) => {
//         const cookieString = _cookie.serialize(name, value, options)
//         if (self.headers.setCookie === undefined) {
//             self.headers.setCookie = []
//         }
//         self.headers.setCookie.push(cookieString)
//     }

//     // const sendImage = (type, data) => send(data, type)

//     addFuncs({
//         status,
//         send,
//         sendJSON,
//         sendHTML,
//         sendFile,
//         cookie,
//     })

//     return self
// }

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
const match = (req, path) => {
    if (req.path === path) {
        return true
    }
    return false
}

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

const camelToHeader = name =>
    name
        .replace(/[A-Z]/g, (s) => `-${s}`)
        .replace(/^\w/, s => s.toUpperCase())
const notFoundHandler = (req, res) => {
    res.status(404)
        .send("Not Found")
}

const todoHandlers = {
    test: (req, res) => {
        res.sendJSON("found?")
    },
    testFile: (req, res) => {
        res.sendFile("package.json")
    },
}

const routeGroup = (...routes) => {
    return async (req, res) => {
        for (const [path, handler] of routes) {
            if (req.path === path) {
                return await handler(req, res)
            }
        }
    }
}

const createApp = (...handlers) => {
    const requestHandler = async (appRequest, nodeResponse) => {
        const appResponse = Response()

        const result = await processHandlers(
            appRequest,
            appResponse,
            handlers
        )

        if (result.body instanceof Error) {
            console.log(result.body)
            nodeResponse.statusCode = 500
            nodeResponse.end("SERVER BROKEN D:")
            return
        }

        for (const [name, value] of Object.entries(result.headers)) {
            nodeResponse.setHeader(
                camelToHeader(name),
                value
            )
        }

        nodeResponse.statusCode = result.statusCode
        nodeResponse.end(await result.body)
    }
    const nodeHandler = (req, res) => {
        if (req.method === "GET") {
            requestHandler(
                NodeRequest(req, null),
                res
            )
            return
        }

        const rawBody = []
        req.on(
            "data",
            (data) => {
                rawBody.push(data)
            }
        )
        req.on(
            "end",
            () => {
                const bodyBuffer = Buffer.concat(rawBody)
                const appRequest = NodeRequest(req, bodyBuffer)
                requestHandler(appRequest, res)
            }
        )
    }
    return nodeHandler
}
const server = http.createServer(
    createApp(
        bodyParserHandler,
        corsHandler(),
        cookieParserHandler,
        static({
            dir: ".",
        }),
        routeGroup(
            ["/test", todoHandlers.test],
            ["/test-file", todoHandlers.testFile],
        ),
        (req, res) => {
            if (req.method !== "POST") {
                return
            }
            console.log(res)
            res.cookie("test", "thing")
            res.cookie("test2", "thing")
            res.cookie("test2", "second value lul", {httpOnly: true})
            res.sendJSON({
                get: req.query,
                post: req.body,
            })
        },
        notFoundHandler,
    )
)
server.listen(
    1337,
    () => console.log("listening")
)
