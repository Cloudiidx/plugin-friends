"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_commando_1 = require("discord.js-commando");
const discord_js_1 = require("discord.js");
const common_tags_1 = require("common-tags");
const util_1 = require("@nightwatch/util");
const index_1 = require("../../index");
const axios_1 = require("axios");
class FriendCommand extends discord_js_commando_1.Command {
    constructor(client) {
        super(client, {
            name: 'friend',
            group: 'friends',
            memberName: 'friend',
            description: 'Allows you to send and respond to friend requests, as well as list your friends/friend requests.',
            details: common_tags_1.stripIndent `
        \`friend add <mention|id>\` sends a friend request to that user.
        \`friend accept <mention|id>\` accepts a friend request from that user.
        \`friend deny/decline <mention|id>\` denies a friend request from that user.
        \`friend remove/delete <mention|id>\` removes that user from your friend list.
        \`friend list [mention|id]\` lists all the user's friends, or your own if no user is given.
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list both incoming and outgoing friend requests.`,
            examples: ['friend add @Joker#3650', 'friend deny @Joker#3650', 'friend list', 'friend requests incoming'],
            aliases: ['friends'],
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
        });
    }
    async run(msg, { action, argument }) {
        try {
            switch (action.toLowerCase()) {
                case 'add':
                    return this.sendFriendRequest(msg, argument);
                case 'deny':
                case 'decline':
                    return this.denyFriendRequest(msg, argument);
                case 'accept':
                    return this.acceptFriendRequest(msg, argument);
                case 'remove':
                case 'delete':
                    return this.deleteFriend(msg, argument);
                case 'list':
                    return this.listFriends(msg, argument);
                case 'requests':
                    return this.listFriendRequests(msg, argument);
                default:
                    return msg.reply(`\`${action}\` is not a valid action.`);
            }
        }
        catch (err) {
            util_1.Logger.error(err);
            return msg.reply('Failed to send friend request.');
        }
    }
    async sendFriendRequest(msg, user) {
        if (!user) {
            return msg.reply('You need to specify a user to send a friend request to. It can be a mention or their ID.');
        }
        const receiverId = user instanceof discord_js_1.User ? user.id : user;
        if (msg.author.id === receiverId) {
            return msg.reply("You can't send yourself a friend request.");
        }
        const receiver = await getApiUser(user instanceof discord_js_1.User ? user.id : user);
        const sender = await getApiUser(msg.author.id);
        if (!receiver || !sender) {
            return msg.reply('Failed to retrieve user data from API.');
        }
        try {
            const { data: friendRequest } = await axios_1.default.post(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests?token=${index_1.Plugin.config.api.token}`, {
                user: sender,
                receiver
            });
            if (!friendRequest) {
                return msg.reply(`**${receiver.name}** has already sent you a friend request.`);
            }
            return msg.reply(`Sent a friend request to **${receiver.name}**.`);
        }
        catch (err) {
            util_1.Logger.error(err);
            return msg.reply(`Failed to send friend request to **${receiver.name}**. Have you already sent one to them?`);
        }
    }
    async denyFriendRequest(msg, user) {
        const senderId = user instanceof discord_js_1.User ? user.id : user;
        if (!senderId) {
            return msg.reply('You must specify a user. It can be a mention or their user ID.');
        }
        if (msg.author.id === senderId) {
            return msg.reply('Invalid user.');
        }
        const sender = await getApiUser(senderId);
        if (!sender) {
            return msg.reply('Failed to get user data from API.');
        }
        const { data: friendRequest } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?userId=${senderId}&token=${index_1.Plugin
            .config.api.token}`);
        if (!friendRequest || !friendRequest[0]) {
            return msg.reply('Failed to find a friend request from that user.');
        }
        await axios_1.default.delete(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests/${friendRequest[0].id}?token=${index_1.Plugin.config
            .api.token}`);
        return msg.reply(`**${sender.name}**'s friend request has been declined.`);
    }
    async acceptFriendRequest(msg, user) {
        if (!user) {
            return msg.reply("You need to specify a who's friend request to accept. It can be a mention or their ID.");
        }
        const senderId = user instanceof discord_js_1.User ? user.id : user;
        if (msg.author.id === senderId) {
            return msg.reply('Invalid user.');
        }
        const { data: friendRequest } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?userId=${senderId}&token=${index_1.Plugin
            .config.api.token}`);
        if (!friendRequest || !friendRequest[0]) {
            return msg.reply('Failed to accept friend request. Does the friend request exist?');
        }
        const friend = {
            user: friendRequest[0].user,
            friend: friendRequest[0].receiver
        };
        const friendName = friend.user.id === senderId ? friend.user.name : friend.friend.name;
        try {
            await axios_1.default.post(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends?token=${index_1.Plugin.config.api.token}`, friend);
        }
        catch (err) {
            return msg.reply(`Failed to add **${friendName}** as a friend. Are you two already friends?`);
        }
        return msg.reply(`You are now friends with **${friendName}**!`);
    }
    async deleteFriend(msg, user) {
        const userId = user instanceof discord_js_1.User ? user.id : user;
        if (!userId) {
            return msg.reply('You must specify a user. It can be a mention or their user ID.');
        }
        if (userId === msg.author.id) {
            return msg.reply('Invalid user.');
        }
        const apiUser = await getApiUser(userId);
        if (!apiUser) {
            return msg.reply('Failed to find user in API.');
        }
        const { data: friend } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/search?userId=${userId}&token=${index_1.Plugin.config.api
            .token}`);
        if (!friend || !friend[0]) {
            return msg.reply(`You aren't friends with **${apiUser.name}**.`);
        }
        try {
            await axios_1.default.delete(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/${friend[0].id}?token=${index_1.Plugin.config.api.token}`);
        }
        catch (err) {
            util_1.Logger.error(err);
            return msg.reply(`Failed to remove **${apiUser.name}** from your friends list.`);
        }
        return msg.reply(`You are no longer friends with **${apiUser.name}**.`);
    }
    async listFriends(msg, user) {
        const userId = user instanceof discord_js_1.User ? user.id : user;
        if (userId === msg.author.id) {
            msg.reply("*You don't have to specify yourself.*");
        }
        let apiUser;
        if (userId) {
            apiUser = await getApiUser(userId);
            if (!apiUser) {
                return msg.reply('Unable to find that user in my API.');
            }
        }
        const { data: friends } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${userId || msg.author.id}/friends/search?token=${index_1.Plugin.config.api.token}`);
        if (!friends || friends.length === 0) {
            if (userId) {
                return msg.reply(`${apiUser.name} has no friends`);
            }
            return msg.reply(common_tags_1.stripIndent `It appears you don't have any friends yet. ${this.client.emojis.find(e => e.name === 'feelsbadman')}

     Try adding my owner as a friend with \`@Nightwatch friend add 235197207014408203\``);
        }
        const id = userId || msg.author.id;
        const friendsMapped = friends
            .map((f, i) => {
            const name = f.user.id === id ? f.friend.name : f.user.name;
            const friendId = f.user.id === id ? f.friend.id : f.user.id;
            return `${i + 1}.) **${name}**  (${friendId})`;
        })
            .join('\n');
        return msg.reply(common_tags_1.stripIndent `

    Here are ${userId ? apiUser.name + "'s" : 'your'} friends:\n\n${friendsMapped}

      ${friends.length === 10 ? 'Only showing the first 10 friends.' : ''}
    `);
    }
    async listFriendRequests(msg, argument) {
        const { data: friendRequests } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?type=${argument ||
            'incoming'}&token=${index_1.Plugin.config.api.token}`);
        if (!friendRequests || friendRequests.length === 0) {
            return msg.reply(`You have no ${argument || 'incoming'} friend requests.`);
        }
        return msg.reply(common_tags_1.stripIndent `

    Here are your ${argument || 'incoming'} friend requests:

    ${friendRequests
            .map((request, i) => '**' +
            (i + 1) +
            '.) ' +
            (!argument || argument === 'incoming'
                ? request.user.name + '** - ' + request.user.id
                : request.receiver.name + '** - ' + request.receiver.id))
            .join('\n')}

      ${!argument || argument === 'incoming'
            ? `You can accept any friend request by typing \`nw friend accept @User\` (or \`nw friend accept <user ID>\` if you aren't currently in the same guild as the other user.)`
            : `If they aren't responding to your request, try sending them a DM to accept it.`}
      `);
    }
}
exports.default = FriendCommand;
async function getApiUser(id) {
    const { data } = await axios_1.default
        .get(`${index_1.Plugin.config.api.address}/users/${id}?token=${index_1.Plugin.config.api.token}`)
        .catch(err => {
        util_1.Logger.error(err);
        return { data: undefined };
    });
    return data;
}
//# sourceMappingURL=FriendCommand.js.map