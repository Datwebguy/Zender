// Shared request checks for Zender's two functions.
// Browsers always send Origin on a POST, so a request from someone else's page is refused, and
// requiring JSON means a cross-site page can't send a "simple" request without a preflight.
module.exports = function guard(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== req.headers.host) {
      res.status(403).json({ error: "Not allowed." });
      return false;
    }
  }
  if (req.method === "POST" && !/^application\/json\b/i.test(req.headers["content-type"] || "")) {
    res.status(415).json({ error: "Send JSON." });
    return false;
  }
  return true;
};
