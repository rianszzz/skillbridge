const { createInventory } = require("./inventory");
const { validateItem } = require("./validation");
const inventory = createInventory();
exports.createItem = (input) => inventory.add(validateItem(input));
exports.listItems = () => inventory.list();
if (require.main === module) console.log("Inventory API fixture. Run npm test.");
