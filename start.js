// start.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Carga las variables desde .env.local

import app from "./index.js"

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
