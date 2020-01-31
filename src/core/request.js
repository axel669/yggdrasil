const Request = (...modifiers) => {
    const self = {
        body: null,
        bodyBuffer: null,
        path: null,
    }

    modifySelf(self, modifiers)

    return self
}

module.exports = Request
