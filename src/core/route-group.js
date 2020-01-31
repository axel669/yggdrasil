module.exports = (...routes) => {
    return async (req, res) => {
        for (const [path, handler] of routes) {
            if (req.path === path) {
                return await handler(req, res)
            }
        }
    }
}
