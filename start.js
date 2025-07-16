// start.js
import dotenv from "dotenv";

// Carga las variables de entorno PRIMERO.
dotenv.config({ path: ".env.local" });

// Esta función asíncrona asegura que todo se cargue en el orden correcto.
async function startServer() {
  // Importa la función de conexión a la base de datos DESPUÉS de cargar las variables de entorno.
  const { default: connectToDatabase } = await import("./lib/db.js");

  try {
    // Conecta a la base de datos ANTES de iniciar el servidor.
    await connectToDatabase();
    console.log("Conexión a la base de datos exitosa.");
  } catch (error) {
    // Si la conexión falla, muestra el error y detiene la aplicación.
    console.error("Error al conectar a la base de datos:", error.message);
    process.exit(1);
  }

  // Importa la aplicación principal (Express) DESPUÉS de que la base de datos esté conectada.
  const { default: app } = await import("./index.js");

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

// Inicia todo el proceso.
startServer();