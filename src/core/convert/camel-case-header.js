module.exports = name =>
    name
        .replace(
            /([a-z])([A-Z])/g,
            (_, charBefore, capsChar) => `${charBefore}-${capsChar}`
        )
        .replace(/^\w/, s => s.toUpperCase())
