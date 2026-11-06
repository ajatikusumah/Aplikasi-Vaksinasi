module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    url: process.env.SUPABASE_URL || null,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || null
  });
};
