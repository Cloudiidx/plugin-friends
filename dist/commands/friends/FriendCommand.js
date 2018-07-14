"use strict";
/*

friend accept @Joker#3650

friend deny/decline @Joker#3650

friend remove/delete @Joker#3650

friend list [@Joker#3650]

friend requests [incoming/outgoing]

*/
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
            details: common_tags_1.oneLine `
        \`friend add <mention|id>\` sends a friend request to that user.\n
        \`friend accept <mention|id>\` accepts a friend request from that user.\n
        \`friend deny/decline <mention|id>\` denies a friend request from that user.\n
        \`friend remove/delete <mention|id>\` removes that user from your friend list.\n
        \`friend list [mention|id]\` lists all the user's friends, or your own if no user is given.\n
        \`friend requests [incoming/outgoing]\` lists all of your incoming or outgoing friend requests, respectfully.
        If no type is specified, it will list both incoming and outgoing friend requests.`,
            examples: ['friend add @Joker#3650', 'friend deny @Joker#3650', 'friend list', 'friend requests incoming'],
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
                case 'deny' || 'decline':
                    return this.denyFriendRequest(msg, argument);
                case 'accept':
                    return this.acceptFriendRequest(msg, argument);
                case 'remove' || 'delete':
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
        // TODO: Delete friend request using API.
        return msg.reply('This command is not ready yet.');
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
            return msg.reply(common_tags_1.oneLine `Failed to add **${friendName}** as a friend. Are you two already friends?`);
        }
        return msg.reply(`You are now friends with **${friendName}**!`);
    }
    async deleteFriend(msg, user) {
        // TODO: Delete friend using API.
        return msg.reply('This command is not ready yet.');
    }
    async listFriends(msg, user) {
        // TODO: List friends using API.
        return msg.reply('This command is not ready yet.');
    }
    async listFriendRequests(msg, argument) {
        const { data: friendRequests } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${msg.author.id}/friends/requests/search?type=${argument ||
            'incoming'}&token=${index_1.Plugin.config.api.token}`);
        if (!friendRequests || friendRequests.length === 0) {
            return msg.reply(`You have no ${argument || 'incoming'} friend requests.`);
        }
        // TODO: List friend requests using API.
        return msg.reply(common_tags_1.oneLine `\n\n Here are your ${argument || 'incoming'} friend requests:\n\n
      ${friendRequests
            .map((request, i) => '**' +
            (i + 1) +
            '.) ' +
            (!argument || argument === 'incoming'
                ? request.user.name + '** - ' + request.user.id
                : request.receiver.name + '** - ' + request.receiver.id))
            .join('\n')}\n\n

        ${!argument || argument === 'incoming'
            ? `You can accept any friend request by typing \`nw friend accept @User\` (or \`nw friend accept <user ID>\` if you aren't currently in the same guild as the other user.)`
            : `If they aren't responding to your request, try sending them a DM to accept it.`}
      `);
    }
}
exports.default = FriendCommand;
async function getApiUser(id) {
    const { data } = await axios_1.default.get(`${index_1.Plugin.config.api.address}/users/${id}?token=${index_1.Plugin.config.api.token}`);
    return data;
}
//# sourceMappingURL=FriendCommand.js.map