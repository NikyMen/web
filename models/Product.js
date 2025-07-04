// C:/Users/nikom/Dev/web/models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  descripcion: { type: String },
  imagen: { type: String }
});

const Product = mongoose.model("Product", ProductSchema);

export default Product;
