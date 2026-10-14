const express = require("express");
const http = require("http");
const cors = require("cors");
const { ExpressPeerServer } = require("peer");

const app = express();
app.use(cors());

const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, {
  path: "/peerjs",
  proxied: true,
  debug: false,
  allow_discovery: false,
});

app.use(peerServer);

app.get("/", (_req, res) => res.json({ ok: true, service: "peerjs", path: "/peerjs" }));

const PORT = process.env.PEER_PORT || 5050;
server.listen(PORT, "0.0.0.0", () => console.log("PeerJS on :" + PORT));
