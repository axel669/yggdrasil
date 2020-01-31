module.exports = (req, bodyBuffer) => {
    const requestURL = new URL(req.url, "file://internal")

    const path = requestURL.pathname
    const method = req.method
    const headers = {}
    const query = {}

    for (const header of Object.keys(req.headers)) {
        const camelHeader = header.replace(
            /\-(\w)/g,
            (_, s) => s.toUpperCase()
        )
        headers[camelHeader] = req.headers[header]
    }

    for (const key of requestURL.searchParams.keys()) {
        const value = requestURL.searchParams.getAll(key)
        query[key] = (value.length === 1) ? value[0] : value
    }

    return {
        path,
        method,
        headers,
        query,
        bodyBuffer,
    }
}
