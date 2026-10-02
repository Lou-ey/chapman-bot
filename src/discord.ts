import { EmbedBuilder } from 'discord.js';

export interface LeaderboardEntry {
    playerName: string;
    platinumCount: number;
    lastPlatinumDate: string;
}

export interface HistoricalPlatinum {
    name: string;
    platform: string;
}

export function createPlatinumEmbed(playerName: string, platinumData: any, userAvatar?: string) {
    return new EmbedBuilder()
        .setAuthor({ name: playerName, iconURL: userAvatar })
        .setTitle(`<:platinum:1554877150933422240> New Platinum Trophy for ${playerName}!`)
        .setDescription(`Congratulations to ${playerName} for earning a Platinum trophy in **${platinumData.gameName}**!`)
        .addFields(
            { name: 'Trophy', value: platinumData.trophyName, inline: true },
            { name: 'Rarity', value: platinumData.rarity, inline: true },
            { name: 'Playtime', value: platinumData.playTime, inline: true },
            { name: 'Platform', value: platinumData.platform, inline: true }
            //{ name: 'Difficulty', value: platinumData.difficulty, inline: true }
        )
        .setThumbnail(platinumData.trophyIcon)
        .setImage(platinumData.coverUrl)
        .setColor('#00439c')
        .setTimestamp(new Date(platinumData.earnedAt));
}

export function createLeaderboardEmbed(rows: LeaderboardEntry[]) {
    let leaderboardText = '';

    rows.forEach((row, index) => {
        let rankIcon = '';
        switch (index) {
            case 0:
                rankIcon = '🥇';
                break;
            case 1:
                rankIcon = '🥈';
                break;
            case 2:
                rankIcon = '🥉';
                break;
            default:
                rankIcon = `${index + 1}.`;
                break;
        }
            const plural = row.platinumCount === 1 ? '' : 's';

            let dateText = 'N/A';
            if (row.lastPlatinumDate) {
                const dateObj = new Date(row.lastPlatinumDate);
                dateText = dateObj.toLocaleDateString('pt-PT');
            }
            leaderboardText += `${rankIcon} **${row.playerName}** - ${row.platinumCount} Platinum Trophy${plural} (Last: ${dateText})\n`;
    });

    return new EmbedBuilder()
        .setTitle('Platinum Trophies Leaderboard')
        .setDescription(leaderboardText || 'No data available.')
        .setColor('#FFD700')
        .setTimestamp(new Date());
}

export function createAllPlatinumsEmbed(psnId: string, avatarUrl: string, plats: HistoricalPlatinum[]) {
    let descriptionList = '';
    let playCount = 1;

    for (const plat of plats) {
        const line = `**${playCount}. ${plat.name}** ${plat.platform}\n`;

        if (descriptionList.length + line.length > 3900) {
            const hidden = plats.length - playCount + 1;
            descriptionList += `\n*...and ${hidden} more platinums not displayed due to Discord's character limit.*`;
            break;
        }

        descriptionList += line;
        playCount++;
    }

    return new EmbedBuilder()
        .setAuthor({ name: psnId, iconURL: avatarUrl })
        .setTitle(`All Tracked Platinums for ${psnId}`)
        .setDescription(descriptionList || 'No platinums found.')
        .setColor('#00439c')
        .setFooter({ text: `Total Platinums: ${plats.length}` })
}

export function createErrorEmbed(title: string, description: string) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#ff0000')
        .setTimestamp(new Date());
}