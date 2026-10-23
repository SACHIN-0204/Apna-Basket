const express = require("express");
const cors = require("cors");
const compression = require("compression");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();


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
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Short public caching for safe GET requests. Personalized endpoints stay uncached.
app.use((req, res, next) => {
  const isPublicGet = req.method === "GET" && !/^\/api\/(auth|orders|payments|analytics|contact)/i.test(req.path);
  if (isPublicGet) {
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  }
  next();
});


app.use("/api/auth", require("./routes/authRoutes"));
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

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log("Cloudinary cloud:");
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
