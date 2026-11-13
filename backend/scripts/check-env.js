// npm run check-env  -> validates the environment exactly like the server does at startup
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { checkEnv } = require("../config/env");

const { errors, warnings } = checkEnv();
warnings.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`FAIL  ${e}`));
if (!errors.length) console.log(`OK    environment looks valid for NODE_ENV=${process.env.NODE_ENV || "development"}`);
process.exit(errors.length ? 1 : 0);
