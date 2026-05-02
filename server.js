require("dotenv").config();
const express = require("express");
const cors = require("cors");
const createStripeSession = require("./api/create-stripe-session");

const app = express();
const PORT = process.env.SERVER_PORT || 5001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.post("/api/create-stripe-session", (req, res) => {
  createStripeSession(req, res);
});

app.get("/", (req, res) => {
  res.send("Share For Good Backend Server (Stripe Active)");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
