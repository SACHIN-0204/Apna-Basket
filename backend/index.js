const express = require("express");
const cors = require("cors");
const compression = require("compression");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });

const { expireUnpaidOrders } = require("./controllers/orderController");
const User = require("./models/User");

const app = express();
app.disable("x-powered-by");

app.set('trust proxy', 1);
// V3: lightweight health endpoint for load balancers/uptime checks.
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'apna-basket-api' });
});
// Compress JSON/HTML responses to reduce transfer time.
app.use(compression());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL // older name used in the V3 notes; either one works
  ].filter(Boolean),
  credentials: true
}));

// Keep the exact bytes of the Razorpay webhook body: its signature is computed over them.
app.use(express.json({
  limit: "1mb",
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith("/api/payments/webhook")) req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Caching rules for API GET requests:
//  - Public catalogue data may be cached briefly by the browser and the CDN.
//  - Anything personal, admin-only, or sent with a login token is never cached.
const PRIVATE_API = /^\/api\/(auth|me|orders|payments|analytics|contact)(\/|$)|^\/api\/store\/slots(\/|$)|^\/api\/products\/admin(\/|$)/i;
app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("/api/")) {
    const isPrivate = PRIVATE_API.test(req.path) || Boolean(req.headers.authorization);
    res.set(
      "Cache-Control",
      isPrivate
        ? "private, no-store"
        : "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
    );
  }
  next();
});


app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/me", require("./routes/meRoutes"));
app.use("/api/store", require("./routes/storeRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/build/index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Backend is running");
  });
}

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDB();

  // Phase 2 made email optional, so the old unique email index must become a sparse one.
  // syncIndexes only touches the User collection and is a no-op once it is up to date.
  try {
    await User.syncIndexes();
  } catch (e) {
    console.error("User index sync failed (phone-only sign-ups may fail until fixed):", e.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Every minute: cancel online orders that were never paid and return their stock
  const timer = setInterval(() => {
    expireUnpaidOrders()
      .then((n) => n && console.log(`Expired ${n} unpaid order(s), stock restored`))
      .catch((e) => console.error("Order expiry job failed:", e.message));
  }, 60 * 1000);
  timer.unref();
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
