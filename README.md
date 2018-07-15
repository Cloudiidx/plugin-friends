# Friends
 > Friend system plugin. Provides a better and more interactive friend system than Discord.

## Features
  * Friend Dashboard: Adds a dashboard that aims to be a quick look at everything to do with your friends.
  * Friend System: The ability to see your own and other user's friends, add friends, remove friends, etc.

## Commands
  All commands list start with `<prefix> friend|friends`
  * `add <mention|id>`: Send a user a friend request.

  * `remove|delete <mention|id>`: Remove a user from your friends list.

  * `accept <mention|id>`: Accept a user's friend request.

  * `decline|deny <mention|id>`: Decline a user's friend request.

  * `list [mention|id]`: List a user's friends, or your own if no user is provided.

  * `requests [incoming|outgoing]`: List your incoming/outgoing friend requests. If no type is given, lists incoming requests.

## Installation
All plugins should be installed in the `plugins/` directory of the bot. Plugins are automatically loaded and registered when the bot starts.
