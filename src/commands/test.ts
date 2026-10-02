import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { createPlatinumEmbed } from "../discord";

export const data = new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test the platinum notification system');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const mockPlatinum = {
        gameName: "Hollow Knight: Voidheart Edition",
        coverUrl: "https://image.api.playstation.com/vulcan/img/rnd/202010/2717/ZzT5hEKyJm8PzEQ7P0hFqA1S.png",
        trophyName: "Heart of Hallownest",
        trophyIcon: "https://psnobj.prod.dl.playstation.net/psnobj/NPWR11516_00/1e075047-9759-4f76-857e-ee63e70cfeb2.png",
        earnedAt: new Date().toISOString(),
        uniqueId: "teste-12345"
    }

    const embed = createPlatinumEmbed('TestUser', mockPlatinum);

    await interaction.editReply({ embeds: [embed] });
}