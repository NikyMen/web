// start.js
import dotenv from "dotenv";

// Carga las variables de entorno PRIMERO.
dotenv.config({ path: ".env.local" });

// --- INICIO: CÓDIGO DE DEPURACIÓN ---
// Esta función nos ayudará a ver si la variable de entorno se está cargando.
function logMongoURI() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("¡ERROR DE DEPURACIÓN! La variable de entorno MONGODB_URI no fue encontrada.");
    return;
  }
  // Ocultamos la contraseña por seguridad
  const redactedURI = uri.replace(/:([^:]+)@/, ":<password>@");
  console.log(`URI de MongoDB detectada (depuración): ${redactedURI}`);
}
// --- FIN: CÓDIGO DE DEPURACIÓN ---


// Esta función asíncrona asegura que todo se cargue en el orden correcto.
async function startServer() {
  // Llamamos a nuestra función de depuración
  logMongoURI();

  // Importa la función de conexión a la base de datos DESPUÉS de cargar las variables de entorno.
  const { default: connectToDatabase } = await import("./lib/db.js");

  try {
    // Conecta a la base de datos ANTES de iniciar el servidor.
    console.log("Intentando conectar a la base de datos...");
    await connectToDatabase();
    console.log("Conexión a la base de datos exitosa.");
  } catch (error) {
    // Si la conexión falla, muestra el error y detiene la aplicación.
    console.error("Error al conectar a la base de datos:", error.message);
    // Mostramos el error completo para más detalles en los logs de Vercel
    console.error("Error completo:", error);
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
