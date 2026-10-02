import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { getDB } from "../database";
import { createLeaderboardEmbed, LeaderboardEntry } from "../discord";

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display the leaderboard of tracked PSN accounts based on total platinums.');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const db = getDB();
        const rows = await db.all<LeaderboardEntry[]>(`
            SELECT 
                users.psn_id AS playerName,
                users.total_platinums AS platinumCount,
                MAX(platinums.earned_at) AS lastPlatinumDate
            FROM users
            LEFT JOIN platinums ON users.psn_id = platinums.psn_id
            GROUP BY users.psn_id
            ORDER BY total_platinums DESC
        `);

        if (!rows || rows.length === 0) {
            await interaction.editReply('No tracked PSN accounts found for the leaderboard.');
            return;
        }

        const embed = createLeaderboardEmbed(rows);

        await interaction.editReply({ embeds: [embed] });

    } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        await interaction.editReply('An error occurred while trying to fetch the leaderboard. Please try again later.');
    }
}