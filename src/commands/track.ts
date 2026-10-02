import {SlashCommandBuilder, ChatInputCommandInteraction, TextChannel} from 'discord.js';
import { getDB } from '../database';
import {getAccountId, getLastPlatinum, getRecentPlatinums, getTotalPlatinums} from '../psn';
import { createPlatinumEmbed } from "../discord";
import {exists} from "node:fs";

export const data = new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track a new PSN account for tracking platinums')
    .addStringOption(option =>
        option.setName('psn_id')
            .setDescription('The PSN username to track')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const psnId = interaction.options.get('psn_id')?.value as string;

    await interaction.deferReply();

    try {
        const userInfo = await getAccountId(psnId);

        if (!userInfo) {
            await interaction.editReply(`The PSN ID \`${psnId}\` does not exist or could not be found.`);
            return;
        }

        const { accountId, avatarUrl } = userInfo;
        const totalPlatinums = await getTotalPlatinums(accountId);

        const db = getDB();

        await db.run('INSERT INTO users (psn_id, account_id, avatar_url, total_platinums) VALUES (?, ?, ?, ?)', [psnId, accountId, avatarUrl, totalPlatinums]);

        await interaction.editReply(`Successfully tracked the PSN ID \`${psnId}\` for tracking platinums.`);

        const platinums = await getRecentPlatinums(accountId);

        if (platinums && platinums.length > 0) {
            const channel = interaction.client.channels.cache.get(process.env.DISCORD_CHANNEL_ID as string) as TextChannel;

            if (channel) {
                for (const platinum of platinums) {
                    const exists = await db.get('SELECT * FROM platinums WHERE unique_id = ?', [platinum.uniqueId]);

                    if (!exists) {
                        console.log(`Immediate check: New platinum found for ${psnId}: ${platinum.gameName} at ${platinum.earnedAt}`);
                        const embed = createPlatinumEmbed(psnId, platinum, avatarUrl);
                        await channel.send({embeds: [embed]});

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
                    }
                }
            }
        }
    } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            await interaction.editReply(`The PSN ID \`${psnId}\` is already registered.`);
        } else {
            console.error('Error registering PSN ID:', err);
            await interaction.editReply('An error occurred while trying to register the PSN ID. Please try again later.');
        }
    }
}



