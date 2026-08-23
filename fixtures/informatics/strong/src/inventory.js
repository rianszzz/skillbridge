exports.createInventory = () => {
  const items = [];
  return {
    list: () => structuredClone(items),
    add: (item) => { items.push({ id: crypto.randomUUID(), ...item }); return items.at(-1); },
    updateStock: (id, stock) => { const item = items.find((value) => value.id === id); if (!item) return null; item.stock = stock; return item; },
  };
};
