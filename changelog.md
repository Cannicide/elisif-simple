# Changelogs
These changelogs contains most, if not all, changes made for major versions. All changes made in minor versions are combined and coalesced into their major parent versions (e.g. all changes from v1.0.0 inclusive to v2.0.0 exclusive fall under "v1" changes).

Elisif-Simple was created by: **Cannicide#2753**

## Changes in v1

- Created SyntaxCommand system, uses command() to create commands with simple or complex String syntax.
    - Due to various issues, it does not currently properly support subcommands or subgroups. It supports all other types of arguments.
- All command files in a specified directory can be recursively loaded.
- Added simple configuration system to Client (configurability of discord.js, Node-Elisif, and Elisif-Simple features)
- Added ability to set what type of storage (db/json) bot should use via config system
- Added Client custom events (@event) and client clonable events (#event)
- Added @error custom event for uncaught exceptions, handles these responsibly with properly exiting code
- Added info on authors, deps, versions
- Added Persistent Events, an simpler version of Interpreter that saves event name, listener name, and function strings to db
- Added Scheduled Functions, which allows scheduling execution of code to a future datetime
- Added Toolkit utility methods
    - Added Toolkit.translate() to translate between languages (requires cheerio)
    - Added Toolkit.timezone() to convert between timezones (requires cheerio)
    - Added Toolkit.random() to easily generate a random number within a range
    - Added Toolkit.debug() to easily debug whether or not a method works
    - Added Toolkit.storageSize() and Toolkit.filesize() to determine the filesize of EvG storage and other specified files
    - Added Toolkit.similarity() to compare two strings and get a similarity percentage
    - Added Toolkit.sortedSimilar() to sort an array of strings based on similarity to a search string
- Added multi-login system where client.clone() can be used to extend commands and certain events from the main client to additional clients.
- Added ability to use semi-HTML syntax in sent messages and replies, for markdown, embeds, attachments, and message components
    - This feature is really cool. Advanced features like embeds and buttons can be added to a message, all within the content String.
    - Markup buttons now support built-in, functional "onclick" handlers! Abstracts away tons of ugly discord.js component collector code.
    - Replies can now be made ephemeral via markup.
    - Markup syntax is now much more dynamic, code to interpret markup elements much simpler, and ability to add custom elements now possible!
    - Added element for Unix Timestamps.
    - Simplified structure of markup's button click handling, making it simpler and more effective.
    - Added advanced markup DOM manipulation (markup().dom), allowing easily getting and setting attributes, child elements, and inner html of elements within the markup syntax, and making it hundreds of times easier to edit messages sent via markup!
- Added support for context menu commands!
- Added Event Hooks, dynamic events that only run if specified IDs are found in event data.
    - Incredibly useful as an entirely superior substitute to Node-Elisif's Interpreter system!
    - Extremely simple syntax, design, functionality.
    - Easily remove dynamic event handlers (such as button click handlers) automatically as a result of other events (such as message delete)
- Added simple Constants management system!
- Added documented ElisifMap and ElisifSet as base properties of the package.
- Added support for autocomplete in SlashCommand arguments! Useful to use with Toolkit.sortedSimilar().
- Added python-inspired Boa utilities to toolkit.
    - Boa is now much more similar to Python, containing many of Python's built-in functions!
    - Boa now has incredibly useful context(), promise(), and use() methods that can set and isolate a function's context!
        - Ensure a function can only access provided context with context()!
        - Dynamically set variables within a provided function with context()!
        - Use resolve() and reject() without initialization with promise()!
        - Use all Boa utility methods directly as if you are programming in Python with use()!
    - Boa now has custom String and List extended datatypes, each with some of Python's methods for these types!
        - Extended datatypes also support native JS methods and functionality, with no interfering overlap.
        - Both extended datatypes support iteration in for...of loops.
        - Both extended datatypes support setting and getting individual values using index notation e.g. `data[i]`.