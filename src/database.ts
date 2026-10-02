import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let db: Database;

export async function setupDatabase() {
    db = await open({
        filename: './db.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            psn_id TEXT PRIMARY KEY COLLATE NOCASE,
            account_id TEXT NOT NULL,
            avatar_url TEXT,
            profile_image_url TEXT,
            total_platinums INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS platinums (
            unique_id TEXT PRIMARY KEY,
            psn_id TEXT NOT NULL,
            game_name TEXT,
            earned_at DATETIME,
            rarity TEXT,
            difficulty TEXT,
            cover_url TEXT,
            trophy_icon_url TEXT,
            playtime TIME,
            FOREIGN KEY (psn_id) REFERENCES users(psn_id) ON DELETE CASCADE
        );
    `)

    console.log("Database Initialized");
    return db;
}

export function getDB() {
    return db;
}