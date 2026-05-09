import { WebSocket } from "ws";

const arenaApiURL = new URL(
  process.env.ARENA_API_URL ?? "http://127.0.0.1:5000",
);
arenaApiURL.protocol = arenaApiURL.protocol === "https:" ? "wss:" : "ws:";
arenaApiURL.pathname = "/arena/events";
arenaApiURL.search = "";

const socket = new WebSocket(arenaApiURL);

socket.on("open", () => {
  console.log(`OpenFront Agent Arena spectator connected to ${arenaApiURL}`);
});
socket.on("message", (message) => {
  console.log(message.toString());
});
socket.on("close", (code, reason) => {
  console.log(
    `OpenFront Agent Arena spectator disconnected: ${code} ${reason.toString()}`,
  );
});
socket.on("error", (error) => {
  console.error(error);
});
