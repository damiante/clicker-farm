import { GameConfig } from '../config/GameConfig.js';

export class StateManager {
    constructor() {
        this.saveKey = GameConfig.STORAGE.SAVE_KEY;
        this.saveTimeout = null;
    }

    save(gameState) {
        try {
            const stateData = {
                version: '1.0',
                timestamp: Date.now(),
                player: {
                    money: gameState.player.money
                },
                world: gameState.world,
                entities: gameState.entities || []
            };

            const serialized = JSON.stringify(stateData);
            localStorage.setItem(this.saveKey, serialized);
            console.log('Game saved successfully');
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    }

    load() {
        try {
            const serialized = localStorage.getItem(this.saveKey);
            if (!serialized) {
                return null;
            }

            const stateData = JSON.parse(serialized);
            console.log('Game loaded successfully');
            return stateData;
        } catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }

    reset() {
        try {
            localStorage.removeItem(this.saveKey);
            console.log('Game data cleared');
        } catch (error) {
            console.error('Failed to reset game:', error);
        }
    }

    hasSavedGame() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    scheduleSave(gameState) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.save(gameState);
        }, 500);
    }

    setupAutoSave(getGameState) {
        setInterval(() => {
            const gameState = getGameState();
            if (gameState) {
                this.save(gameState);
            }
        }, GameConfig.STORAGE.AUTO_SAVE_INTERVAL);
    }
}
