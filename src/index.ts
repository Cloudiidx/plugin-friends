import { CommandoClient } from 'discord.js-commando'
import { Config } from '@nightwatch/util'

export class Plugin {
  public static client: CommandoClient
  public static config: Config
  public static id = 'Friends'
  public static description = 'Friend system plugin. Provides a better and more interactive friend system than Discord.'
  public static commandGroups = [
    ['friends', 'Friends']
  ]

  /**
   * Initializes plugin
   * @param client
   * @param config
   */
  public async init(client: CommandoClient, config: Config) {
    Plugin.client = client
    Plugin.config = config
  }
}
