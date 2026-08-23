const http = require("node:http");
const todos = [];

http.createServer((req, res) => {
  if (req.url.startsWith("/add")) {
    todos.push(req.url.split("=")[1]);
    res.end("ok");
  } else {
    res.end(JSON.stringify(todos));
  }
}).listen(3000);
