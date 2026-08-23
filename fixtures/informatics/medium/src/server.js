const http = require("node:http");
const { route } = require("./routes");
http.createServer(route).listen(3000);
