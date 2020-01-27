const fetch = require("node-fetch")
const net = require("net")

const main = async () => {
    const socket = new net.Socket()

    socket.on(
        "ready",
        () => {
            socket.write(
                [
                    "GET /../terminal-tools/README.md HTTP/1.1",
                    "Accept: */*",
                    "",
                    "",
                ].join("\r\n")
            )
        }
    )
    socket.on(
        "data",
        data => {
            console.log(data.toString())
        }
    )
    socket.connect({
        host: "localhost",
        port: "1337",
    })
    // const res = await fetch("http://localhost:1337/../terminal-tools/README.md")
    // console.log(res)
}

main()
