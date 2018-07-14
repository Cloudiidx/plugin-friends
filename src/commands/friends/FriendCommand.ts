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
import { User as BotUser, UserFriend, UserFriendRequest } from '@nightwatch/db'
import { Logger } from '@nightwatch/util'
import { Plugin } from '../../index'
import axios from 'axios'

export default class FriendCommand extends Command {
  constructor (client: CommandoClient) {
    super(client, {
      name: 'friend',
      group: 'friends',
      memberName: 'friend',
      description: 'Allows you to send and respond to friend requests, as well as list your friends/friend requests.',
      details: oneLine`
        \`friend add <mention|id>\` sends a friend request to that user.\n
        \`friend accept <mention|id>\` accepts a friend request from that user.\n
        \`friend deny/decline <mention|id>\` denies a friend request from that user.\n
        \`friend remove/delete <mention|id>\` removes that user from your friend list.\n
        \`friend list [mention|id]\` lists all the user's friends, or your own if no user is given.\n
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list both incoming and outgoing friend requests.`,
      examples: [ 'friend add @Joker#3650', 'friend deny @Joker#3650', 'friend list', 'friend requests incoming' ],
      args: [
        {
          key: 'action',
          label: 'action',
          prompt: 'Would you like to `add/remove/list` friends, `accept/deny` requests, or list `requests`?',
          type: 'string',
          infinite: false
        },
        {
          key: 'argument',
          label: 'user or filter',
          prompt: 'Please provide a valid argument for the used action.',
          default: '',
          type: 'user|string'
        }
      ]
    })
  }

  async run (
    msg: CommandMessage,
    { action, argument }: { action: string; argument: User | string }
  ): Promise<Message | Message[]> {
    try {
      switch (action.toLowerCase()) {
        case 'add':
          return this.sendFriendRequest(msg, argument)

        case 'deny' || 'decline':
          return this.denyFriendRequest(msg, argument)

        case 'accept':
          return this.acceptFriendRequest(msg, argument)

        case 'remove' || 'delete':
          return this.deleteFriend(msg, argument)

        case 'list':
          return this.listFriends(msg, argument)

        case 'requests':
          return this.listFriendRequests(msg, argument as 'incoming' | 'outgoing')

        default:
          return msg.reply(`\`${action}\` is not a valid action.`)
      }
    } catch (err) {
      Logger.error(err)
      return msg.reply('Failed to send friend request.')
    }
  }

  async sendFriendRequest (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    if (!user) {
      return msg.reply('You need to specify a user to send a friend request to. It can be a mention or their ID.')
    }

    const receiverId = user instanceof User ? user.id : user

    if (msg.author.id === receiverId) {
      return msg.reply("You can't send yourself a friend request.")
    }

    const receiver = await getApiUser(user instanceof User ? user.id : user)
    const sender = await getApiUser(msg.author.id)

    if (!receiver || !sender) {
      return msg.reply('Failed to retrieve user data from API.')
    }

    try {
      const { data: friendRequest } = await axios.post(
        `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests?token=${Plugin.config.api.token}`,
        {
          user: sender,
          receiver
        }
      )

      if (!friendRequest) {
        return msg.reply(`**${receiver.name}** has already sent you a friend request.`)
      }

      return msg.reply(`Sent a friend request to **${receiver.name}**.`)
    } catch (err) {
      Logger.error(err)
      return msg.reply(`Failed to send friend request to **${receiver.name}**. Have you already sent one to them?`)
    }
  }

  async denyFriendRequest (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    // TODO: Delete friend request using API.
    return msg.reply('This command is not ready yet.')
  }

  async acceptFriendRequest (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    if (!user) {
      return msg.reply("You need to specify a who's friend request to accept. It can be a mention or their ID.")
    }

    const senderId = user instanceof User ? user.id : user

    if (msg.author.id === senderId) {
      return msg.reply('Invalid user.')
    }

    const { data: friendRequest } = await axios.get(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?userId=${senderId}&token=${Plugin
        .config.api.token}`
    )

    if (!friendRequest || !friendRequest[0]) {
      return msg.reply('Failed to accept friend request. Does the friend request exist?')
    }

    const friend = {
      user: friendRequest[0].user,
      friend: friendRequest[0].receiver
    }

    const friendName = friend.user.id === senderId ? friend.user.name : friend.friend.name

    try {
      await axios.post(
        `${Plugin.config.api.address}/users/${msg.author.id}/friends?token=${Plugin.config.api.token}`,
        friend
      )
    } catch (err) {
      return msg.reply(oneLine`Failed to add **${friendName}** as a friend. Are you two already friends?`)
    }

    return msg.reply(`You are now friends with **${friendName}**!`)
  }

  async deleteFriend (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    // TODO: Delete friend using API.
    return msg.reply('This command is not ready yet.')
  }

  async listFriends (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    // TODO: List friends using API.
    return msg.reply('This command is not ready yet.')
  }

  async listFriendRequests (
    msg: CommandMessage,
    argument: 'incoming' | 'outgoing' = 'incoming'
  ): Promise<Message | Message[]> {
    const { data: friendRequests } = await axios.get(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?type=${argument}&token=${Plugin
        .config.api.token}`
    )

    if (!friendRequests || friendRequests.length === 0) {
      return msg.reply(`You have no ${argument} friend requests.`)
    }
    // TODO: List friend requests using API.
    return msg.reply(
      `\n\n Here are your ${argument} friend requests:\n\n
      ${friendRequests
        .map(
          (request: UserFriendRequest, i: number) =>
            '**' +
            (i + 1) +
            '.) ' +
            (argument === 'incoming'
              ? request.user.name + '** - ' + request.user.id
              : request.receiver.name + '** - ' + request.receiver.id)
        )
        .join('\n')}

        ${argument === 'incoming'
          ? `You can accept any friend request by typing \`nw friend accept @User\` (or \`nw friend accept <user ID>\` if you aren't currently in the same guild as the other user.)`
          : `If they aren't responding to your request, try sending them a DM to accept it.`}
      `
    )
  }
}

async function getApiUser (id: string): Promise<BotUser | undefined> {
  const { data } = await axios.get(`${Plugin.config.api.address}/users/${id}?token=${Plugin.config.api.token}`)

  return data
}
