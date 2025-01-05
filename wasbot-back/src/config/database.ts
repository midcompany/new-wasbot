import "../bootstrap";

module.exports = {
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_bin"
  },
  dialect: process.env.DB_DIALECT || "mysql",
  timezone: "-03:00",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  logging: process.env.DB_DEBUG === "true",
  pool: {
    max: 30, // Máximo de conexões no pool (ideal para 6 núcleos e ambiente multitarefa)
    min: 0, // Mínimo de conexões no pool
    acquire: 30000, // Tempo máximo para obter uma conexão (30 segundos)
    idle: 10000 // Tempo para liberar conexões inativas (10 segundos)
  },
};
