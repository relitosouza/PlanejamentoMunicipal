import "dotenv/config";
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "Undefined");
console.log("DIRECT_URL:", process.env.DIRECT_URL ? "Defined" : "Undefined");
