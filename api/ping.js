/** Instrumentación: endpoint mínimo para validar que las funciones serverless responden. */
export default function handler(req, res) {
  // #region agent log
  console.log(
    '[debug-41f171] ping',
    JSON.stringify({ url: req.url, method: req.method, query: req.query })
  );
  // #endregion
  res.status(200).json({
    ok: true,
    url: req.url,
    method: req.method,
    query: req.query,
    ts: Date.now(),
  });
}
