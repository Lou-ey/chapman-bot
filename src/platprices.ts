import axios from "axios";

export async function getGameDifficulty(gameName: string) {
    try {
        const cleanName = gameName.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
    } catch (error) {
        console.error(`Error fetching game difficulty for ${gameName}:`, error);
        return null;
    }
}