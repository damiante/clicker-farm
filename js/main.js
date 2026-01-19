import { Game } from './core/Game.js';

async function main() {
    console.log('Clicker Farm - Initializing...');

    const game = new Game();

    try {
        await game.init();
        game.start();
        console.log('Game started successfully!');
    } catch (error) {
        console.error('Failed to start game:', error);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const content = loadingScreen.querySelector('.loading-content p');
            if (content) {
                content.textContent = 'Failed to load game. Please refresh the page.';
                content.style.color = '#E74C3C';
            }
        }
    }
}

main();
