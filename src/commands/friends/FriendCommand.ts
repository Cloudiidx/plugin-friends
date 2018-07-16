import { Command, CommandMessage, CommandoClient } from 'discord.js-commando'
import { Message, User, MessageEmbed, Emoji } from 'discord.js'
import { stripIndents } from 'common-tags'
import { User as BotUser, UserFriendRequest, UserFriend } from '@nightwatch/db'
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
      details: stripIndents`
        \`friend add <mention|id>\` sends a friend request to that user.
        \`friend accept <mention|id>\` accepts a friend request from that user.
        \`friend deny/decline <mention|id>\` denies a friend request from that user.
        \`friend remove/delete <mention|id>\` removes that user from your friend list.
        \`friend list [mention|id]\` lists all the user's friends, or your own if no user is given.
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list incoming friend requests.`,
      examples: [ 'friend add @Joker#3650', 'friend deny @Joker#3650', 'friend list', 'friend requests incoming' ],
      aliases: [ 'friends' ],
      args: [
        {
          key: 'action',
          label: 'action',
          prompt: 'Would you like to `add/remove/list` friends, `accept/deny` requests, or list `requests`?\n',
          type: 'string',
          default: ''
        },
        {
          key: 'argument',
          label: 'user or filter',
          prompt: 'Please provide a valid argument for the used action.\n',
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
    if (!action) {
      return this.displayFriendDashboard(msg)
    }

    try {
      switch (action.toLowerCase()) {
        case 'add':
          return this.sendFriendRequest(msg, argument)

        case 'deny':
        case 'decline':
          return this.denyFriendRequest(msg, argument)

        case 'accept':
          return this.acceptFriendRequest(msg, argument)

        case 'remove':
        case 'delete':
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

  async displayFriendDashboard (msg: CommandMessage) {
    const id = msg.author.id
    const prefix = getPrefix(msg)

    const friendSummary = await this.getFriendSummary(id)
    const friendRequestSummary = await this.getFriendRequestSummary(id)
    const availableActions = stripIndents`
      • View your friend list with \`${prefix}friend list\`
      • View other people's friends with \`${prefix}friend list <mention|id>\`
      • Review pending friend requests with \`${prefix}friend requests\`
      • See who has a pending friend request from you with \`${prefix}friend requests outgoing\`
      • Add someone as your friend with \`${prefix} friend add <mention|id>\`
      • Remove someone from your friend list with \`${prefix}friend remove <mention|id>\`
      • Accept a friend request with \`${prefix}friend accept <mention|id>\`
      • Decline a friend request with \`${prefix}friend <decline|deny> <mention|id>\`
    `

    const embed = new MessageEmbed()
      .setAuthor(`👪 ${msg.author.username}'s Friend Dashboard`, this.client.user.avatarURL())
      .setFooter(Plugin.config.botName)
      .setTimestamp(new Date())
      .setThumbnail(msg.author.avatarURL() || msg.author.defaultAvatarURL)
      .setColor('BLUE')
      .addField('Friend Summary', friendSummary, true)
      .addField('Friend Requests', friendRequestSummary, true)
      .addBlankField()
      .addField('Available Actions', availableActions, false)

    return msg.channel.send(embed)
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

      try {
        const discordUser = await this.client.users.find(u => u.id === receiver.id)
        const dm = await discordUser.createDM()
        await dm.send(stripIndents`**${msg.author.username}** has sent you a friend request!

      You can accept it with \`friend accept ${msg.author.id}\` or decline it with \`friend deny ${msg.author.id}\`
      `)
      } catch (err) {
        // swallow, not a big deal
      }

      return msg.reply(`Sent a friend request to **${receiver.name}**.`)
    } catch (err) {
      Logger.error(err)
      return msg.reply(`Failed to send friend request to **${receiver.name}**. Have you already sent one to them?`)
    }
  }

  async denyFriendRequest (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    const senderId = user instanceof User ? user.id : user

    if (!senderId) {
      return msg.reply('You must specify a user. It can be a mention or their user ID.')
    }

    if (msg.author.id === senderId) {
      return msg.reply('Invalid user.')
    }

    const sender = await getApiUser(senderId)

    if (!sender) {
      return msg.reply('Failed to get user data from API.')
    }

    const { data: friendRequest }: { data: UserFriendRequest[] } = await axios.get(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?userId=${senderId}&token=${Plugin
        .config.api.token}`
    )

    if (!friendRequest || !friendRequest[0]) {
      return msg.reply('Failed to find a friend request from that user.')
    }

    await axios.delete(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests/${friendRequest[0].id}?token=${Plugin.config
        .api.token}`
    )

    return msg.reply(`**${sender.name}**'s friend request has been declined.`)
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
      return msg.reply(`Failed to add **${friendName}** as a friend. Are you two already friends?`)
    }

    return msg.reply(`You are now friends with **${friendName}**!`)
  }

  async deleteFriend (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    const userId = user instanceof User ? user.id : user

    if (!userId) {
      return msg.reply('You must specify a user. It can be a mention or their user ID.')
    }

    if (userId === msg.author.id) {
      return msg.reply('Invalid user.')
    }

    const apiUser = await getApiUser(userId)

    if (!apiUser) {
      return msg.reply('Failed to find user in API.')
    }

    const { data: friend } = await axios.get(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/search?userId=${userId}&token=${Plugin.config.api
        .token}`
    )

    if (!friend || !friend[0]) {
      return msg.reply(`You aren't friends with **${apiUser.name}**.`)
    }

    try {
      await axios.delete(
        `${Plugin.config.api.address}/users/${msg.author.id}/friends/${friend[0].id}?token=${Plugin.config.api.token}`
      )
    } catch (err) {
      Logger.error(err)
      return msg.reply(`Failed to remove **${apiUser.name}** from your friends list.`)
    }

    return msg.reply(`You are no longer friends with **${apiUser.name}**.`)
  }

  async listFriends (msg: CommandMessage, user: User | string): Promise<Message | Message[]> {
    const userId = user instanceof User ? user.id : user

    if (userId === msg.author.id) {
      msg.reply("*You don't have to specify yourself.*")
    }

    let apiUser: BotUser | undefined
    if (userId) {
      apiUser = await getApiUser(userId)

      if (!apiUser) {
        return msg.reply('Unable to find that user in my API.')
      }
    }

    const { data: friends }: { data: UserFriend[] } = await axios.get(
      `${Plugin.config.api.address}/users/${userId || msg.author.id}/friends/search?token=${Plugin.config.api.token}`
    )

    if (!friends || friends.length === 0) {
      if (userId) {
        return msg.reply(`${apiUser!.name} has no friends`)
      }

      return msg.reply(stripIndents`It appears you don't have any friends yet. ${this.client.emojis.find(
        e => e.id === '467808089731760149'
      )}

     Try adding my owner as a friend with \`@Nightwatch friend add 235197207014408203\``)
    }

    const id = userId || msg.author.id

    const friendsMapped = friends
      .map((f: UserFriend, i: number) => {
        const name = f.user.id === id ? f.friend.name : f.user.name
        const friendId = f.user.id === id ? f.friend.id : f.user.id

        return `${i + 1}.) **${name}**  (${friendId})`
      })
      .join('\n')

    const description = stripIndents`${friendsMapped}

      ${friends.length > 10 ? 'Only displaying the first 10 friends' : ''}`

    const embed = new MessageEmbed()
      .setAuthor(`${userId ? apiUser!.name : msg.author.username}'s Friends:`)
      .setFooter(Plugin.config.botName)
      .setTimestamp(new Date())
      .setThumbnail(msg.author.avatarURL() || msg.author.defaultAvatarURL)
      .setDescription(description)
      .setColor('BLUE')

    return msg.channel.send(embed)
  }

  async listFriendRequests (msg: CommandMessage, argument: 'incoming' | 'outgoing'): Promise<Message | Message[]> {
    const filter = !argument || argument === 'incoming' ? 'incoming' : 'outgoing'
    const { data: friendRequests } = await axios.get(
      `${Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?type=${filter}&token=${Plugin.config
        .api.token}`
    )

    if (!friendRequests || friendRequests.length === 0) {
      return msg.reply(`You have no ${filter} friend requests.`)
    }

    const friendRequestsMapped = friendRequests
      .map((request: UserFriendRequest, i: number) => {
        return `${i + 1}.) **${filter === 'incoming'
          ? `${request.user.name}** (${request.user.id})`
          : `${request.receiver.name}** (${request.receiver.id})`}`
      })
      .join('\n')

    const description = stripIndents`${friendRequestsMapped}

      ${filter === 'incoming'
        ? `You can accept any friend request by typing \`nw friend accept @User\` or \`nw friend accept <user ID>\``
        : `If they aren't responding to your request, try sending them a DM to accept it.`}`

    const embed = new MessageEmbed()
      .setAuthor(`Your ${filter === 'incoming' ? 'Incoming' : 'Outgoing'} Friend Requests:`)
      .setFooter(Plugin.config.botName)
      .setTimestamp(new Date())
      .setThumbnail(msg.author.avatarURL() || msg.author.defaultAvatarURL)
      .setDescription(description)
      .setColor('BLUE')

    return msg.channel.send(embed)
  }

  async getFriendSummary (id: string) {
    const { data: friends }: { data: UserFriend[] } = await axios.get(
      `${Plugin.config.api.address}/users/${id}/friends/?token=${Plugin.config.api.token}`
    )

    const friendFirstSentence = `You have ${friends.length} friends. ${friends.length === 0
      ? this.client.emojis.find((e: Emoji) => e.id === '467808089731760149')
      : ''}`

    let friendSummaryObj = {
      sent: 0,
      received: 0
    }

    if (friends.length > 0) {
      const acceptedCount = friends.filter(x => !x.friend).length
      friendSummaryObj.received = acceptedCount
      friendSummaryObj.sent = friends.length - acceptedCount
    }

    const friendSummary =
      friends.length === 0
        ? friendFirstSentence
        : stripIndents`${friendFirstSentence}

      Requests received: ${friendSummaryObj.received}
      Requests sent: ${friendSummaryObj.sent}`

    return friendSummary
  }

  async getFriendRequestSummary (id: string) {
    const { data: friendRequests }: { data: UserFriendRequest[] } = await axios.get(
      `${Plugin.config.api.address}/users/${id}/friends/requests?token=${Plugin.config.api.token}`
    )

    const incomingRequestCount = friendRequests.filter(request => !request.receiver).length

    const friendRequestObj = {
      incoming: incomingRequestCount,
      outgoing: friendRequests.length - incomingRequestCount
    }

    const friendRequestSummary = stripIndents`
      Incoming: ${friendRequestObj.incoming}
      Outgoing: ${friendRequestObj.outgoing}`

    return friendRequestSummary
  }
}

async function getApiUser (id: string): Promise<BotUser | undefined> {
  const { data }: { data: BotUser | undefined } = await axios
    .get(`${Plugin.config.api.address}/users/${id}?token=${Plugin.config.api.token}`)
    .catch(err => {
      Logger.error(err)
      return { data: undefined }
    })

  return data
}

function getPrefix (msg: CommandMessage): string {
  if (!(msg.channel.type === 'text')) {
    return ''
  }

  if (msg.guild.commandPrefix) {
    return `${msg.guild.commandPrefix} `
  }

  return `${Plugin.config.prefix} `
}
