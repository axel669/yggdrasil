module.exports = async (req, res, handlers) => {
    for (const handler of handlers) {
        await handler(req, res)
        if (res.body !== undefined) {
            return res
        }
    }
    return null
}
