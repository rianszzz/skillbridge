const test = require("node:test");
const assert = require("node:assert/strict");
const { createItem, listItems } = require("../src/app");
test("validates and stores item", () => { assert.throws(() => createItem({ name: "", price: -1, stock: 1 })); createItem({ name: "Buku", price: 25000, stock: 4 }); assert.equal(listItems().length, 1); });
