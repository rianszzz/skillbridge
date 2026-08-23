const events = [];
exports.list = () => events;
exports.add = (title) => events.push({ id: events.length + 1, title });
