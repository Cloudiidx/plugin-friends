/*

friend accept @Joker#3650

friend deny/decline @Joker#3650

friend remove/delete @Joker#3650

friend list [@Joker#3650]

friend requests [incoming/outgoing]

*/

import { Command, CommandMessage, CommandoClient } from 'discord.js-commando'
import { Message, User, GuildMember } from 'discord.js'
import { oneLine } from 'common-tags'
import { User as BotUser } from '@nightwatch/db'
import { Logger } from '@nightwatch/util'
import { Plugin } from '../../index'
import axios from 'axios'

export default class FriendCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'friend',
      group: 'friends',
      memberName: 'friend',
      description:
        'Allows you to send and respond to friend requests, as well as list your friends/friend requests.',
      details: oneLine`
        \`friend add <mention>\` sends a friend request to that user.\n
        \`friend accept <mention>\` accepts a friend request from that user.\n
        \`friend deny/decline <mention>\` denies a friend request from that user.\n
        \`friend remove/delete <mention>\` removes that user from your friend list.\n
        \`friend list [mention]\` lists all the user's friends, or your own if no user is given.\n
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list both incoming and outgoing friend requests.`,
      examples: [
        'friend add @Joker#3650',
        'friend deny @Joker#3650',
        'friend list',
        'friend requests incoming'
      ],
      args: [
        {
          key: 'action',
          label: 'action',
          prompt:
            'Would you like to `add/remove/list` friends, `accept/deny` requests, or list `requests`?',
          type: 'string',
          infinite: false
        },
        {
          key: 'argument',
          label: 'user or type',
          prompt: 'Please provide a valid argument for the used action.',
          default: '',
          type: 'filter'
        }
      ]
    })
  }

  async run(
    msg: CommandMessage,
    {
      action,
      argument
    }: { action: string; argument: User | 'incoming' | 'outgoing' }
  ): Promise<Message | Message[]> {
    try {
      switch (action.toLowerCase()) {
        case 'add':
          return this.sendFriendRequest(msg, argument as User)

        case 'deny' || 'decline':
          return this.denyFriendRequest(msg, argument as User)

        case 'accept':
          return this.acceptFriendRequest(msg, argument as User)

        case 'remove' || 'delete':
          return this.deleteFriend(msg, argument as User)

        case 'list':
          return this.listFriends(msg, argument as User)

        case 'requests':
          return this.listFriendRequests(msg, argument as
            | 'incoming'
            | 'outgoing')

        default:
          return msg.reply(`\`${action}\` is not a valid action.`)
      }
    } catch (err) {
      Logger.error(err)
      return msg.reply('Failed to create friend request.')
    }
  }

  async sendFriendRequest(
    msg: CommandMessage,
    user: User
  ): Promise<Message | Message[]> {
    const receiver = await this.getApiUser(user.id)
    const sender = await this.getApiUser(msg.author.id)

    if (!receiver || !sender) {
      return msg.reply(
        'This command requires you to specify a user. Please try again.'
      )
    }

    const { data: friendRequest } = await axios.post(
      `${Plugin.config.api.address}/users/${receiver.id}/friends/requests?token=${Plugin.config.api.token}`,
      {
        user: sender,
        receiver: receiver
      }
    )

    if (!friendRequest) {
      const member = msg.guild.members.get(receiver.id)

      if (!member) {
        return msg.reply('That member is not in this guild.')
      }

      return msg.reply(
        `${member.nickname} has already sent you a friend request.`
      )
    }

    return msg.reply(`Sent a friend request to **${receiver.name}**.`)
  }

  async denyFriendRequest(
    msg: CommandMessage,
    user: User
  ): Promise<Message | Message[]> {
    // TODO: Delete friend request using API.
    return msg.reply('This command is not ready yet.')
  }

  async acceptFriendRequest(
    msg: CommandMessage,
    user: User
  ): Promise<Message | Message[]> {
    // TODO: Create friend using API (no need to delete the request).
    return msg.reply('This command is not ready yet.')
  }

  async deleteFriend(
    msg: CommandMessage,
    user: User
  ): Promise<Message | Message[]> {
    // TODO: Delete friend using API.
    return msg.reply('This command is not ready yet.')
  }

  async listFriends(
    msg: CommandMessage,
    user: User
  ): Promise<Message | Message[]> {
    // TODO: List friends using API.
    return msg.reply('This command is not ready yet.')
  }

  async listFriendRequests(
    msg: CommandMessage,
    argument: 'incoming' | 'outgoing'
  ): Promise<Message | Message[]> {
    // TODO: List friend requests using API.
    return msg.reply('This command is not ready yet.')
  }

  async getApiUser(id: string): Promise<BotUser | undefined> {
    const { data } = await axios.get(
      `${Plugin.config.api.address}/users/${id}?token=${
        Plugin.config.api.token
      }`
    )
    return data
  }
}
