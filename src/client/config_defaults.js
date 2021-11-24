module.exports = {
    intents: [],
    presences: [],
    duration: 10,
    prefix: "/",
    port: 8000,
    autoInitialize: {
        enabled: false,
        path: __dirname + "/commands"
    },
    authors: [],
    expansions: {
      enable: ["help"]
    },
    storage: "json",
    debug: false,
    uncaughtErrors: false
}