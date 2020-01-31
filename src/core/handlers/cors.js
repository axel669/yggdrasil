module.exports = (options = {}) => {
    const {
        origin = "*",
        methods = "*",
    } = options

    return (req, res) => {
        res.headers.accessControlAllowOrigin = origin
        res.headers.accessControlAllowMethods = methods
    }
}
