module.exports = options => {
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
