module.exports = (self, additions) => {
    for (const addition of additions) {
        for (const [key, value] of Object.entries(addition)) {
            const selfValue = (typeof value !== "function")
                ? value
                : (...args) => {
                    value(self, ...args)
                    return self
                }
            self[key] = selfValue
        }
    }
}
