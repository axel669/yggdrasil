const responseCore = {
    status: (self, statusCode) => self.statusCode = statusCode,
    send: (self, data, type = null) => {
        self.body = data
        if (type !== null) {
            self.headers.contentType = type
        }
    },
    sendJSON: (self, data) => self.send(
        JSON.stringify(data),
        "application/json"
    ),
    sendHTML: (self, html) => self.send(html, "text/html"),
    cookie: (self, name, value, options) => {
        const cookieString = _cookie.serialize(name, value, options)
        if (self.headers.setCookie === undefined) {
            self.headers.setCookie = []
        }
        self.headers.setCookie.push(cookieString)
    },
}
const Response = (...modifiers) => {
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

module.exports = Response
