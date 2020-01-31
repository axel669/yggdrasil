const notFoundHandler = require("../core/handlers/not-found.js")
const convertCamelHeader = require("../core/convert/camel-case-header.js")

const createApp = (...handlers) => {
    const handlersList = [
        ...handlers,
        notFoundHandler,
    ]
    const requestHandler = async (appRequest, nodeResponse) => {
        const appResponse = Response()

        const result = await processHandlers(
            appRequest,
            appResponse,
            handlersList
        )

        if (result.body instanceof Error) {
            console.log(result.body)
            nodeResponse.statusCode = 500
            nodeResponse.end("SERVER BROKEN D:")
            return
        }

        for (const [name, value] of Object.entries(result.headers)) {
            nodeResponse.setHeader(
                convertCamelHeader(name),
                value
            )
        }

        nodeResponse.statusCode = result.statusCode
        nodeResponse.end(await result.body)
    }
    const nodeHandler = (req, res) => {
        if (req.method === "GET") {
            requestHandler(
                Request(
                    nodeRequestModifier(req, null)
                ),
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
                const appRequest = Request(
                    nodeRequestModifier(req, bodyBuffer)
                )
                requestHandler(appRequest, res)
            }
        )
    }
    return nodeHandler
}

module.exports = createApp
