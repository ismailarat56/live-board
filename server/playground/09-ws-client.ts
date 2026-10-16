const socket = new WebSocket("ws://127.0.0.1:4100/echo");

socket.addEventListener("open", () => {
  console.log("açıldı, readyState:", socket.readyState);
  socket.send("merhaba");
  socket.send("ikinci mesaj");
});

socket.addEventListener("message", (event) => {
  console.log("geldi:", event.data);

  if (String(event.data).includes("ikinci")) {
    socket.close(1000, "tamam");
  }
});

socket.addEventListener("close", (event) => {
  console.log(`kapandı: ${event.code} "${event.reason}" temiz mi: ${event.wasClean}`);
});

socket.addEventListener("error", () => {
  console.log("hata: sunucuya bağlanılamadı");
});
