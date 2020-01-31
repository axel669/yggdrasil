const cookie = require("cookie")

module.exports = (req, res) => {
    req.cookie = cookie.parse(req.headers.cookie || "")
}
