export const InventoryConfig = {
    INITIAL_SLOTS: 3,
    MAX_SLOTS: 20,
    INITIAL_STACK_SIZE: 5,
    MAX_STACK_SIZE: 1000,

    // Pricing formulas (exponential growth)
    // price = base * (growth ^ slotsOwned)
    SLOT_BASE_PRICE: 0.10,
    SLOT_PRICE_GROWTH: 1.5,

    STACK_BASE_PRICE: 0.20,
    STACK_PRICE_GROWTH: 1.3,

    STACK_SIZE_INCREMENT: 5
};
