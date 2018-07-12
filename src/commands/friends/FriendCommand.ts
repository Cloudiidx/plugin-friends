/*

friend add @Joker#3650

friend accept @Joker#3650

friend deny/decline @Joker#3650

friend remove/delete @Joker#3650

friend list [@Joker#3650]

friend requests [incoming/outgoing]

*/

import { Command, CommandMessage, CommandoClient } from 'discord.js-commando'
import { Message, User } from 'discord.js'
import axios from 'axios'

module.exports = class FriendCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'friend',
      group: 'friends',
      memberName: 'friend',
      description:
        'Allows you to send and respond to friend requests, as well as list your friends/friend requests.',
      details: `
        \`friend add <mention>\` sends a friend request to that user.\n
        \`friend accept <mention>\` accepts a friend request from that user.\n
        \`friend deny/decline <mention>\` denies a friend request from that user.\n
        \`friend remove/delete <mention>\` removes that user from your friend list.\n
        \`friend list [mention]\` lists all the user's friends, or your own if no user is given.\n
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list both incoming and outgoing friend requests.
			`,
      examples: [
        'friend add @Joker#3650',
        'friend deny @Joker#3650',
        'friend list',
        'friend requests incoming'
      ],
      args: [
        {
          key: 'subcommand',
          label: 'sub-command',
          prompt:
            'Would you like to `add/remove/list` friends, `accept/deny` requests, or list `requests`?',
          type: 'string',
          infinite: false
        },
        {
          key: 'argument',
          label: 'user or type',
          prompt: 'Please provide a valid argument for the used subcommand.',
          default: -1,
          type: 'user|string',
          infinite: false
        }
      ]
    })
  }

  async run(
    msg: CommandMessage,
    { subcommand, argument }: { subcommand: string; argument: User | string }
  ): Promise<Message> {
    if (subcommand === 'add') {
      if (!(argument instanceof User)) {
        return msg.reply(
          'This command requires you to specify a user. Please try again.'
        ) as Promise<Message>
      }

      const sender = await axios.get(
        `http://localhost:5000/api/users/${msg.author.id}`
      )
      const receiver = await axios.get(
        `http://localhost:5000/api/users/${argument.id}`
      )

      await axios.post(
        `http://localhost:5000/api/users/${argument.id}/friends/requests`,
        { user: sender.data, receiver: receiver.data }
      )

      return msg.reply(`Sent a friend request to ${argument.tag}`) as Promise<
        Message
      >
    }

    return msg.delete()
  }
}
