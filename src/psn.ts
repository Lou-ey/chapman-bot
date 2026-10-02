import {
    exchangeNpssoForAccessCode,
    exchangeAccessCodeForAuthTokens,
    makeUniversalSearch,
    getUserTitles,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    getUserPlayedGames,
    getProfileFromUserName,
    getUserTrophyProfileSummary,
    TrophyRarity,
    type Trophy,
} from "psn-api";

const rarityMap: Record<TrophyRarity, string> = {
    [TrophyRarity.VeryRare]: "Very Rare",
    [TrophyRarity.UltraRare]: "Ultra Rare",
    [TrophyRarity.Rare]: "Rare",
    [TrophyRarity.Common]: "Common"
};

function parsePlayDuration(ptFormat: string | undefined): string {
    if (!ptFormat || typeof ptFormat !== "string") return "N/A";

    const hoursMatch = ptFormat.match(/(\d+)H/);
    const minutesMatch = ptFormat.match(/(\d+)M/);

    if (!hoursMatch && !minutesMatch) return "N/A";

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    if (hours === 0 && minutes === 0) return "Less than a minute";

    return `${hours}h ${minutes}m`;
}

let psnAuth: any;

export async function authenticatePSN(npssoToken: string) {
    try {
        const accessCode = await exchangeNpssoForAccessCode(npssoToken);
        psnAuth = await exchangeAccessCodeForAuthTokens(accessCode);

        console.log('PSN Authentication successful:', psnAuth);
        return true;
    } catch (error) {
        console.error('PSN Authentication failed:', error);
        return false;
    }
}

export async function getAccountId(psnIdName: string): Promise<{accountId: string; avatarUrl: string} | null> {
    try {
        const profileResponse = await getProfileFromUserName(psnAuth, psnIdName);

        if (profileResponse && profileResponse.profile?.accountId) {
            const avatarUrl = profileResponse.profile.avatarUrls?.[0]?.avatarUrl || '';
            const profilePictureUrl = profileResponse.profile.personalDetail?.profilePictureUrls?.[0]?.profilePictureUrl || '';
            const finalImageUrl = profilePictureUrl || avatarUrl || '';
            return {
                accountId: profileResponse.profile.accountId,
                avatarUrl: avatarUrl
            };
        }
    } catch (error) {
        console.error('Error directly fetching account ID from profile:', error);
    }

    try {
        const searchResponse = await makeUniversalSearch(psnAuth, psnIdName, "SocialAllAccounts");

        /*
        const results = searchResponse.domainResponses[0]?.results || [];

        console.log(`Encontrados ${results.length} resultados.`);

        results.forEach((r: any, index: number) => {
            console.log(` [${index + 1}] Nome PSN: ${r.socialMetadata.onlineId} | Account ID: ${r.socialMetadata.accountId}`);
        });
        console.log(`----------------------------------------\n`);
         */

        const user = searchResponse.domainResponses[0]?.results.find(
            (r: any) => r.socialMetadata.onlineId.toLowerCase() === psnIdName.toLowerCase()
        );

        if (user) {
            return {
                accountId: user.socialMetadata.accountId,
                avatarUrl: user.socialMetadata.avatarUrl || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching account ID:', error);
        return null;
    }
}

export async function getRecentPlatinums(accountId: string) {
    try {
        const { trophyTitles } = await getUserTitles(psnAuth, accountId, { limit: 20 });

        if (!trophyTitles) return [];

        let platinums = [];

        for (const title of trophyTitles) {
            if (title.earnedTrophies?.platinum > 0) {
                const isPS5 = title.trophyTitlePlatform.includes("PS5");
                const serviceName = isPS5 ? undefined : "trophy";

                const userTrophies = await getUserTrophiesEarnedForTitle(
                    psnAuth,
                    accountId,
                    title.npCommunicationId,
                    "all",
                    { npServiceName: serviceName }
                );

                const earnedPlatinum = userTrophies.trophies.find((t: any) => t.trophyType === "platinum" && t.earned);

                if (earnedPlatinum && earnedPlatinum.earnedDateTime) {
                    const platDate = new Date(earnedPlatinum.earnedDateTime).getTime();

                    const titleTrophies = await getTitleTrophies(
                        psnAuth,
                        title.npCommunicationId,
                        "all",
                        { npServiceName: serviceName }
                    );

                    const platinumDetails = titleTrophies.trophies.find((t) => t.trophyId === earnedPlatinum.trophyId) as Trophy | undefined;

                    const rareId = platinumDetails?.trophyRare != undefined ? platinumDetails.trophyRare : earnedPlatinum.trophyRare;
                    const rareRate = platinumDetails?.trophyEarnedRate || earnedPlatinum.trophyEarnedRate || "N/A";

                    const rarityText = rareId !== undefined
                        ? `${rarityMap[rareId as TrophyRarity]} (${rareRate}%)`
                        : `${rareRate || "N/A"}%`;

                    let playTimeText = "N/A";

                    try {
                        const activity = await getUserPlayedGames(psnAuth, accountId, { limit: 200, offset: 0 });

                        const gameHistory = activity.titles.find(
                            (g: any) => g.name.toLowerCase() === title.trophyTitleName.toLowerCase()
                        );

                        if (gameHistory && gameHistory.playDuration) {
                            playTimeText = parsePlayDuration(gameHistory.playDuration);
                        }
                    } catch (error) {
                        console.error('Error fetching playtime:', error);
                    }

                    platinums.push({
                        gameName: title.trophyTitleName,
                        coverUrl: title.trophyTitleIconUrl,
                        trophyName: platinumDetails?.trophyName || "Platinum Trophy",
                        trophyIcon: platinumDetails?.trophyIconUrl,
                        earnedAt: earnedPlatinum.earnedDateTime,
                        uniqueId: `${accountId}-${title.npCommunicationId}`,
                        timestamp: platDate,
                        rarity: rarityText,
                        playTime: playTimeText,
                        platform: title.trophyTitlePlatform
                    });
                }
            }
        }

        return platinums.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        console.log('Error fetching recent platinum trophies:', error);
        return [];
    }
}

export async function getLastPlatinum(accountId: string) {
    try {
        const { trophyTitles } = await getUserTitles(psnAuth, accountId, { limit: 20 });

        if (!trophyTitles) return null;

        let mostRecentPlatinum = null;

        for (const title of trophyTitles) {
            if (title.earnedTrophies?.platinum > 0) {

                const isPS5 = title.trophyTitlePlatform.includes("PS5");
                const serviceName = isPS5 ? undefined : "trophy";

                const userTrophies = await getUserTrophiesEarnedForTitle(
                    psnAuth,
                    accountId,
                    title.npCommunicationId,
                    "all",
                    { npServiceName: serviceName }
                );

                const earnedPlatinum = userTrophies.trophies.find((t: any) => t.trophyType === "platinum" && t.earned);

                if (earnedPlatinum && earnedPlatinum.earnedDateTime) {
                    const platDate = new Date(earnedPlatinum.earnedDateTime).getTime();

                    if (!mostRecentPlatinum || platDate > mostRecentPlatinum.timestamp) {
                        const titleTrophies = await getTitleTrophies(
                            psnAuth,
                            title.npCommunicationId,
                            "all",
                            { npServiceName: serviceName }
                        );

                        const platinumDetails = titleTrophies.trophies.find((t) => t.trophyId === earnedPlatinum.trophyId) as Trophy | undefined;

                        const rareId = platinumDetails?.trophyRare != undefined ? platinumDetails.trophyRare : earnedPlatinum.trophyRare;
                        const rareRate = platinumDetails?.trophyEarnedRate || earnedPlatinum.trophyEarnedRate || "N/A";

                        const rarityText = rareId !== undefined
                            ? `${rarityMap[rareId as TrophyRarity]} (${rareRate}%)`
                            : `${rareRate || "N/A"}%`;

                        let playTimeText = "N/A";

                        try {
                            const activity = await getUserPlayedGames(psnAuth, accountId);

                            const gameHistory = activity.titles.find(
                                (g: any) => g.name.toLowerCase() === title.trophyTitleName.toLowerCase()
                            );

                            if (gameHistory && gameHistory.playDuration) {
                                playTimeText = parsePlayDuration(gameHistory.playDuration);
                            }
                        } catch (error) {
                            console.error('Error fetching playtime:', error);
                        }

                        /*
                        console.log(`\n--- DADOS: ${title.trophyTitleName} ---`);
                        console.log("Tempo enviado (playDuration):", (title as any).playDuration);
                        console.log("Todas as propriedades do jogo:", Object.keys(title));
                        console.log("------------------------------------------\n");
                        */

                        mostRecentPlatinum = {
                            gameName: title.trophyTitleName,
                            coverUrl: title.trophyTitleIconUrl,
                            trophyName: platinumDetails?.trophyName || "Platinum Trophy",
                            trophyIcon: platinumDetails?.trophyIconUrl,
                            earnedAt: earnedPlatinum.earnedDateTime,
                            uniqueId: `${accountId}-${title.npCommunicationId}`,
                            timestamp: platDate,
                            rarity: rarityText,
                            playTime: playTimeText,
                            platform: title.trophyTitlePlatform
                        };
                    }
                }
            }
        }

        return mostRecentPlatinum;
    } catch (error) {
        console.log('Error fetching last platinum trophy:', error);
        return null;
    }
}

export async function getTotalPlatinums(accountId: string): Promise<number> {
    try {
        const summary = await getUserTrophyProfileSummary(psnAuth, accountId);
        return summary.earnedTrophies?.platinum || 0;
    } catch (error) {
        console.error('Error fetching total platinums:', error);
        return 0;
    }
}

export async function getAllPlatinums(accountId: string) {
    try {
        let allPlatinums = [];
        let offset = 0;
        const limit = 200;
        let hasMore = true;

        console.log(`Fetching all platinums for ${accountId}`);

        while (hasMore) {
            const response = await getUserTitles(psnAuth, accountId, { limit, offset });
            const titles = response.trophyTitles;

            if (!titles || titles.length === 0) {
                hasMore = false;
                break;
            }

            for (const title of titles) {
                if (title.earnedTrophies?.platinum > 0) {
                    allPlatinums.push({
                        name: title.trophyTitleName,
                        platform: title.trophyTitlePlatform,
                    });
                }
            }

            offset += limit;
        }

        return allPlatinums;
    } catch (error) {
        console.error('Error fetching all platinums:', error);
        return [];
    }
}