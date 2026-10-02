import { Client, GatewayIntentBits, REST, Routes, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import * as trackCommand from './commands/track';
import * as untrackCommand from './commands/untrack';
import * as leaderboardCommand from './commands/leaderboard';
import * as platsCommand from './commands/plats';
import * as testCommand from './commands/test.js';
import { setupDatabase, getDB } from "./database";
import {authenticatePSN, getAccountId, getLastPlatinum, getRecentPlatinums} from "./psn";
import { createPlatinumEmbed } from "./discord";
import {monitorEventLoopDelay} from "node:perf_hooks";

dotenv.config();

//console.log(process.env.DISCORD_TOKEN, process.env.DISCORD_CLIENT_ID, process.env.DISCORD_CHANNEL_ID, process.env.NPSSO_TOKEN);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commands = [
    trackCommand,
    untrackCommand,
    leaderboardCommand,
    platsCommand,
    testCommand
];

async function registerSlashCommands() {
    const commandsJson = commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID as string),
            { body: commandsJson },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

async function checkPlatinums() {
    console.log(`Checking for new platinums!`);
    const db = getDB();

    try {
        const users = await db.all('SELECT psn_id, account_id FROM users');

        const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID as string) as TextChannel;
        if (!channel) {
            console.error('Discord channel not found');
            return;
        }

        for (const user of users) {
            const psnId = user.psn_id;
            const accountId = user.account_id;

            if (!accountId) continue;

            const platinums = await getRecentPlatinums(accountId);

            for (const platinum of platinums) {
                 const exists = await db.get('SELECT * FROM platinums WHERE unique_id = ?', [platinum.uniqueId]);

                if (!exists) {
                    console.log(`New platinum found for ${psnId}: ${platinum.gameName} at ${platinum.earnedAt}`);

                    const embed = createPlatinumEmbed(psnId, platinum);
                    await channel.send({ embeds: [embed] });

                    await db.run(
                        `INSERT INTO platinums (unique_id, psn_id, game_name, earned_at, rarity, difficulty, cover_url, trophy_icon_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            platinum.uniqueId,
                            psnId,
                            platinum.gameName,
                            platinum.earnedAt,
                            platinum.rarity,
                            "N/A",
                            platinum.coverUrl,
                            platinum.trophyIcon
                        ]
                    );

                    await db.run('UPDATE users SET total_platinums = total_platinums + 1 WHERE psn_id = ?', [psnId]);

                }
            }
        }
    } catch (err) {
        console.error('Error checking platinums:', err);
    }
}

client.once('clientReady', async () => {
    console.log(`Bot connected as ${client.user?.tag}`);

    await registerSlashCommands();

    await setupDatabase();

    const psnSuccess = await authenticatePSN(process.env.NPSSO_TOKEN as string);

    if (psnSuccess) {
        await checkPlatinums();
        setInterval(checkPlatinums, 10 * 60 * 1000); // Check every 10 minutes
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    /*switch (interaction.commandName) {
        case 'track':
            await trackCommand.execute(interaction);
            break;
        case 'untrack':
            await untrackCommand.execute(interaction);
            break;
        case 'test':
            await testCommand.execute(interaction);
            break;
        case 'leaderboard':
            await leaderboardCommand.execute(interaction);
            break;
        case 'plats':
            await platsCommand.execute(interaction);
            break;
        default:
            console.error(`Unknown command: ${interaction.commandName}`);
    }*/
    if (interaction.commandName === 'track') {
        await trackCommand.execute(interaction);
    } else if (interaction.commandName === 'untrack') {
        await untrackCommand.execute(interaction);
    } else if (interaction.commandName === 'leaderboard') {
        await leaderboardCommand.execute(interaction);
    } else if (interaction.commandName === 'test') {
        await testCommand.execute(interaction);
    } else if (interaction.commandName === 'plats') {
        await platsCommand.execute(interaction);
    }
});

client.login(process.env.DISCORD_TOKEN);