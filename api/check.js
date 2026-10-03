// Zender's only server code. Given a public t1 address, it asks a Zcash light server
// (lightwalletd, the same kind of server Zodl talks to) for that address's balance and
// how many transactions touched it. It holds no keys, sees no letter, stores and logs nothing.
const fs = require("fs");
const os = require("os");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");

const PROTO = `
syntax = "proto3";
package cash.z.wallet.sdk.rpc;
message Empty {}
message LightdInfo { string version = 1; string vendor = 2; bool taddrSupport = 3; string chainName = 4; uint64 saplingActivationHeight = 5; string consensusBranchId = 6; uint64 blockHeight = 7; }
message AddressList { repeated string addresses = 1; }
message Balance { int64 valueZat = 1; }
message BlockID { uint64 height = 1; bytes hash = 2; }
message BlockRange { BlockID start = 1; BlockID end = 2; }
message TransparentAddressBlockFilter { string address = 1; BlockRange range = 2; }
message RawTransaction { bytes data = 1; uint64 height = 2; }
service CompactTxStreamer {
  rpc GetLightdInfo(Empty) returns (LightdInfo) {}
  rpc GetTaddressBalance(AddressList) returns (Balance) {}
  rpc GetTaddressTxids(TransparentAddressBlockFilter) returns (stream RawTransaction) {}
}`;

const NETWORKS = {
  main: { chain: "main", servers: ["zec.rocks:443", "na.zec.rocks:443", "eu.zec.rocks:443"], address: /^t1[1-9A-HJ-NP-Za-km-z]{33}$/, hint: "Use your t1 address from Zodl." },
  test: { chain: "test", servers: ["testnet.zec.rocks:443"], address: /^tm[1-9A-HJ-NP-Za-km-z]{33}$/, hint: "Use your tm address from Zingo." },
};
// Look back about three years of blocks (75 s each).
const LOOKBACK = 1300000;

let Service;
const clients = {};
function client(server) {
  if (!Service) {
    const file = path.join(os.tmpdir(), "zender-lightwalletd.proto");
    fs.writeFileSync(file, PROTO);
    const def = loader.loadSync(file, { longs: String, defaults: true });
    Service = grpc.loadPackageDefinition(def).cash.z.wallet.sdk.rpc.CompactTxStreamer;
  }
  if (!clients[server]) clients[server] = new Service(server, grpc.credentials.createSsl());
  return clients[server];
}

const deadline = () => ({ deadline: Date.now() + 12000 });

function unary(c, method, request) {
  return new Promise((resolve, reject) => c[method](request, deadline(), (e, r) => (e ? reject(e) : resolve(r))));
}

function txids(c, address, tip) {
  return new Promise((resolve, reject) => {
    const range = { start: { height: String(Math.max(1, tip - LOOKBACK)) }, end: { height: String(tip) } };
    const stream = c.GetTaddressTxids({ address, range }, deadline());
    let count = 0;
    stream.on("data", () => (count += 1));
    stream.on("error", reject);
    stream.on("end", () => resolve(count));
  });
}

// Just the chain tip, for the "network online" line.
async function tipOnly(net) {
  let last;
  for (const server of net.servers) {
    try {
      const info = await unary(client(server), "GetLightdInfo", {});
      if (info.chainName !== net.chain) throw new Error("wrong network");
      return { height: Number(info.blockHeight) };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function lookup(address, net) {
  let last;
  for (const server of net.servers) {
    try {
      const c = client(server);
      const info = await unary(c, "GetLightdInfo", {});
      if (info.chainName !== net.chain) throw new Error("wrong network");
      const tip = Number(info.blockHeight);
      const [balance, txCount] = await Promise.all([unary(c, "GetTaddressBalance", { addresses: [address] }), txids(c, address, tip)]);
      return { balanceZat: Number(balance.valueZat), txCount, height: tip };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const net = NETWORKS[body && body.network === "test" ? "test" : "main"];
  const address = String((body && body.address) || "").trim();
  if (!address && body && body.tip) {
    try {
      return res.status(200).json(await tipOnly(net));
    } catch {
      return res.status(502).json({ error: "Could not reach the Zcash network." });
    }
  }
  if (!net.address.test(address)) return res.status(400).json({ error: net.hint });
  try {
    return res.status(200).json(await lookup(address, net));
  } catch {
    return res.status(502).json({ error: "Could not reach the Zcash network. Try again in a moment." });
  }
};
