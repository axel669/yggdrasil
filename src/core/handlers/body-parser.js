const bodyParsers = {
    "application/json": (raw) => {
        if (raw.length === 0) {
            return {}
        }
        return JSON.parse(
            raw.toString()
        )
    }
}

const bodyParser  = async (req, res) => {
    if (req.method !== "POST") {
        return
    }
    const parser = bodyParsers[req.headers.contentType]
    const body = parser
        ? await parser(req.bodyBuffer)
        : req.bodyBuffer
    req.body = body
}

module.exports = bodyParser
