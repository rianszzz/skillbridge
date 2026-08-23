exports.validateItem = ({ name, price, stock }) => {
  if (typeof name !== "string" || !name.trim()) throw new Error("name required");
  if (!Number.isFinite(price) || price < 0) throw new Error("invalid price");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("invalid stock");
  return { name: name.trim(), price, stock };
};
