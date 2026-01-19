import { GameConfig } from '../config/GameConfig.js';

export class MoneyDisplay {
    constructor(container) {
        this.container = container;
        this.money = GameConfig.ECONOMY.STARTING_MONEY;
        this.render();
    }

    render() {
        this.container.textContent = this.formatMoney(this.money);
    }

    update(amount) {
        this.money = amount;
        this.render();
    }

    formatMoney(amount) {
        return `${GameConfig.ECONOMY.CURRENCY_SYMBOL}${amount.toLocaleString()}`;
    }

    getMoney() {
        return this.money;
    }

    addMoney(amount) {
        this.money += amount;
        this.render();
        return this.money;
    }

    setMoney(amount) {
        this.money = amount;
        this.render();
    }
}
