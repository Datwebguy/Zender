// Zender's only server code. Given a public t1 address, it asks a Zcash light server
// (lightwalletd, the same kind of server Zodl talks to) for that address's balance and
// how many transactions touched it. It holds no keys, sees no letter, stores and logs nothing.
const fs = require("fs");
const os = require("os");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");
const guard = require("./_guard");

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

// One time budget for the whole request, across every server tried.
const BUDGET_MS = 15000;
// Enough history for every check; busy addresses stop counting here.
const MAX_TX = 50;
const deadline = (end) => ({ deadline: end });

function unary(c, method, request, end) {
  return new Promise((resolve, reject) => c[method](request, deadline(end), (e, r) => (e ? reject(e) : resolve(r))));
}

function txids(c, address, tip, end) {
  return new Promise((resolve, reject) => {
    const range = { start: { height: String(Math.max(1, tip - LOOKBACK)) }, end: { height: String(tip) } };
    const stream = c.GetTaddressTxids({ address, range }, deadline(end));
    let count = 0;
    let done = false;
    stream.on("data", () => {
      count += 1;
      if (count >= MAX_TX && !done) {
        done = true;
        stream.cancel();
        resolve(count);
      }
    });
    stream.on("error", (e) => (done ? null : reject(e)));
    stream.on("end", () => resolve(count));
  });
}

// Just the chain tip, for the "network online" line.
async function tipOnly(net) {
  const end = Date.now() + BUDGET_MS;
  let last;
  for (const server of net.servers) {
    try {
      const info = await unary(client(server), "GetLightdInfo", {}, end);
      if (info.chainName !== net.chain) throw new Error("wrong network");
      return { height: Number(info.blockHeight) };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function lookup(address, net) {
  const end = Date.now() + BUDGET_MS;
  let last;
  for (const server of net.servers) {
    try {
      const c = client(server);
      if (Date.now() > end - 1000) break;
      const info = await unary(c, "GetLightdInfo", {}, end);
      if (info.chainName !== net.chain) throw new Error("wrong network");
      const tip = Number(info.blockHeight);
      const [balance, txCount] = await Promise.all([unary(c, "GetTaddressBalance", { addresses: [address] }, end), txids(c, address, tip, end)]);
      return { balanceZat: Number(balance.valueZat), txCount, height: tip };
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("out of time");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  if (!guard(req, res)) return;
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
    return res.status(502).json({ error: "Couldn't check just now. Trying again." });
  }
};
