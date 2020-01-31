const createApp = require("./node/create-app.js")
const Request = require("./core/request.js")

const requestModifiers = require("./modifiers/request.js")

module.exports = {
    createApp,
    handlers: {
        static: require("./handlers/static.js"),
    },
}
