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
- Added multi-login system where client.clone() can be used to extend commands and certain events from the main client to additional clients.
- Added ability to use semi-HTML syntax in sent messages and replies, for markdown, embeds, attachments, and message components
    - This feature is really cool. Advanced features like embeds and buttons can be added to a message, all within the content String.