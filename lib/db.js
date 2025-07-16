// c:/Users/nikom/Dev/web/lib/db.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable. In development, this is in .env.local. In production, this is in your hosting provider settings.'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    console.log("Usando conexión de DB cacheada.");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000 // Aumenta el tiempo de espera a 30 segundos
    };

    console.log("Creando nueva conexión a la DB con las siguientes opciones:", opts);

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("Conexión a la DB establecida exitosamente.");
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error("Falló la promesa de conexión a la DB:", e);
    cached.promise = null; // Resetea la promesa para intentar de nuevo en la próxima petición
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
