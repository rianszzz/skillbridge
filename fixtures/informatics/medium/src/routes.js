const events = require("./events");
exports.route = (req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.method === "GET") return res.end(JSON.stringify(events.list()));
  let body = "";
  req.on("data", (chunk) => body += chunk).on("end", () => {
    try { const { title } = JSON.parse(body); if (!title) throw new Error("title required"); events.add(title); res.end(JSON.stringify({ ok: true })); }
    catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: error.message })); }
  });
};
