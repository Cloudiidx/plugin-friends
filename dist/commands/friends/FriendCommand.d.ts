import { Command, CommandMessage, CommandoClient } from 'discord.js-commando';
import { Message, User } from 'discord.js';
export default class FriendCommand extends Command {
    constructor(client: CommandoClient);
    run(msg: CommandMessage, {action, argument}: {
        action: string;
        argument: User | string;
    }): Promise<Message | Message[]>;
    displayFriendDashboard(msg: CommandMessage): Promise<Message | Message[]>;
    sendFriendRequest(msg: CommandMessage, user: User | string): Promise<Message | Message[]>;
    denyFriendRequest(msg: CommandMessage, user: User | string): Promise<Message | Message[]>;
    acceptFriendRequest(msg: CommandMessage, user: User | string): Promise<Message | Message[]>;
    deleteFriend(msg: CommandMessage, user: User | string): Promise<Message | Message[]>;
    listFriends(msg: CommandMessage, user: User | string): Promise<Message | Message[]>;
    listFriendRequests(msg: CommandMessage, argument: 'incoming' | 'outgoing'): Promise<Message | Message[]>;
}
