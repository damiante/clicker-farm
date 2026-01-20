export const GameConfig = {
    WORLD: {
        INITIAL_CHUNK_SIZE: 10,
        EXPANSION_CHUNK_SIZE: 10,
        TILE_SIZE: 32,
        RIVER_MAX_WIDTH: 2,
        RIVER_MIN_WIDTH: 1,
        RIVER_FORK_PROBABILITY: 0.08,
        RIVER_CONVERGENCE_PROBABILITY: 0.02,
        RIVER_TURN_PROBABILITY: 0.15,
        RIVER_SOURCES_MIN: 1,
        RIVER_SOURCES_MAX: 1,
        RIVER_SEGMENT_LENGTH: 8,
        RIVER_MEANDER_AMOUNT: 0.3,

        // Expansion pricing (exponential growth)
        // price = base * (growth ^ expansionsCount)
        EXPANSION_BASE_PRICE: 10000,
        EXPANSION_PRICE_GROWTH: 1.3,
    },
    ECONOMY: {
        STARTING_MONEY: 0,
        CLICK_REWARD: 0.01,
        CLICK_CHANCE: 0.5,  // 50% chance to find a penny
        CURRENCY_SYMBOL: '$',
    },
    RENDERING: {
        BACKGROUND_COLOR: '#151216',
        FPS: 60,
    },
    ENTITIES: {
        RENDER_EMOJI_FONT_SIZE: 32,
        DEFAULT_OVERWORLD_SCALE: 1.0,  // Default scale for items without overworldScale property
        PLACEMENT_PREVIEW_OPACITY: 0.4,  // Opacity for placement preview (0-1)
    },
    STORAGE: {
        SAVE_KEY: 'clickerFarmGameState',
        AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    },
    TILES: {
        GRASS: {
            id: 'grass',
            asset: './assets/grass.png',
            code: 'g'
        },
        WATER: {
            id: 'water',
            asset: './assets/water.png',
            code: 'w'
        },
    },
};
