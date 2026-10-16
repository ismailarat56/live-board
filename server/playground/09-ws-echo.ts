import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = 4100;

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  response.end("Bu bir HTTP yanıtı.\n");
});

const wss = new WebSocketServer({ server, path: "/echo" });

wss.on("connection", (socket, request) => {
  console.log(`bağlandı: ${request.socket.remoteAddress}:${request.socket.remotePort}`);

  socket.on("message", (data, isBinary) => {
    console.log(`geldi: ${data.toString()} (ikili: ${isBinary})`);
    socket.send(`echo: ${data.toString()}`);
  });

  socket.on("close", (code, reason) => {
    console.log(`kapandı: ${code} "${reason.toString()}"`);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${PORT} (HTTP) ve ws://127.0.0.1:${PORT}/echo (WebSocket)`);
});
