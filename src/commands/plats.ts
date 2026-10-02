import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getDB } from '../database';
import { getAllPlatinums } from "../psn";
import {createAllPlatinumsEmbed, createPlatinumEmbed} from "../discord";

export const data = new SlashCommandBuilder()
    .setName('plats')
    .setDescription('Display all tracked platinums for a specific PSN account.')
    .addStringOption(option =>
        option.setName('psn_id')
            .setDescription('The PSN username to display platinums for')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const psnId = interaction.options.get('psn_id')?.value as string;

    await interaction.deferReply();

    try {
        const db = getDB();
        const userRow = await db.get(
            'SELECT * FROM users WHERE psn_id = ?',
            [psnId]
        );

        if (!userRow) {
            await interaction.editReply(`The PSN ID \`${psnId}\` not found. Please ensure the account is being tracked.`);
            return;
        }

        const plats = await getAllPlatinums(userRow.account_id);

        if (plats.length === 0) {
            await interaction.editReply(`No platinums found for the PSN ID \`${psnId}\`.`);
            return;
        }

        const embed = createAllPlatinumsEmbed(psnId, userRow.avatar_url, plats);

        await interaction.editReply({ embeds: [embed] });

    } catch (err: any) {
        console.error('Error fetching platinums:', err);
        await interaction.editReply('An error occurred while trying to fetch the platinums. Please try again later.');
    }
}