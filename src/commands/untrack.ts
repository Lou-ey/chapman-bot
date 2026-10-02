import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getDB } from '../database';

export const data = new SlashCommandBuilder()
    .setName('untrack')
    .setDescription('Untrack a PSN account from tracking platinums')
    .addStringOption(option =>
        option.setName('psn_id')
            .setDescription('The PSN username to stop tracking')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const psnId = interaction.options.get('psn_id')?.value as string;

    await interaction.deferReply();

    try {
        const db = getDB();

        await db.run('DELETE FROM users WHERE psn_id = ?', [psnId]);

        await interaction.editReply(`Successfully stopped tracking the PSN ID \`${psnId}\` from tracking platinums.`);

    } catch (err: any) {
        console.error('Error unregistering PSN ID:', err);
        await interaction.editReply('An error occurred while trying to unregister the PSN ID. Please try again later.');
    }
}