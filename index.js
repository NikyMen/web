// MÓDULOS EXTERNOS
import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import expressLayouts from "express-ejs-layouts"

// CONFIG PROPIA
import { PORT } from "./config.js"
import { UserRepository } from "./user-repository.js"

const SECRET_KEY = "mi_clave_secreta"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const carrito = {} // Almacenamiento temporal de carrito en memoria

// MIDDLEWARES
app.use(expressLayouts)
app.set("layout", "layout")
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

// Autenticación por token
app.use((req, res, next) => {
  const token = req.cookies.user
  if (!token) return next()
  try {
    res.locals.user = jwt.verify(token, SECRET_KEY)
  } catch {
    res.locals.user = null
  }
  next()
})

// RUTAS PRINCIPALES
app.get("/", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/ofertas.json", "utf-8"))
  res.render("index", {
    username: res.locals.user?.username || null,
    user: res.locals.user,
    productos
  })
})

app.get("/productos", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const ofertas = JSON.parse(fs.readFileSync("./data/ofertas.json", "utf-8"))
  const termino = req.query.buscar?.toLowerCase() || ""
  const page = parseInt(req.query.page) || 1
  const limit = 24
  const offset = (page - 1) * limit

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(termino))
  const paginados = filtrados.slice(offset, offset + limit)
  const totalPaginas = Math.ceil(filtrados.length / limit)

  res.render("productos", {
    productos: paginados,
    ofertas,
    user: res.locals.user,
    paginaActual: page,
    totalPaginas,
    totalResultados: filtrados.length,
    termino
  })
})

app.get("/producto/:codigo", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const producto = productos.find(p => p.codigo.trim() === req.params.codigo)
  if (!producto) return res.status(404).send("Producto no encontrado")
  res.render("producto", { producto, user: res.locals.user })
})

// AUTENTICACIÓN
app.get("/login", (req, res) => res.render("login", { title: "Iniciar sesión", user: res.locals.user }))
app.get("/register", (req, res) => {
  res.render("register", { user: res.locals.user });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await UserRepository.login({ username, password })
    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: "2h" })
    res.cookie("user", token, { httpOnly: true })
    res.send({ user })
  } catch {
    res.status(401).json({ error: "Credenciales inválidas" })
  }
})

app.post("/register", async (req, res) => {
  const { username, password } = req.body
  try {
    const id = await UserRepository.create({ username, password })
    res.send({ id })
  } catch (error) {
    res.status(400).send(error.message)
  }
})

app.post("/logout", (req, res) => {
  res.clearCookie("user")
  res.redirect("/")
})

// CARRITO
app.get("/carrito", (req, res) => {
  const productosTodos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const productosEnCarrito = Object.entries(carrito).map(([codigo, cantidad]) => {
    const producto = productosTodos.find(p => p.codigo.trim() === codigo.trim())
    return producto ? { ...producto, cantidad, subtotal: producto.precio * cantidad } : null
  }).filter(Boolean)

  const total = productosEnCarrito.reduce((acc, p) => acc + p.subtotal, 0)
  res.render("carrito", { productos: productosEnCarrito, total, user: res.locals.user })
})

app.post("/carrito/agregar", (req, res) => {
  const codigo = req.body.codigo
  const cantidad = parseInt(req.body.cantidad) || 1
  if (!codigo) return res.status(400).send("Código de producto requerido")
  carrito[codigo] = (carrito[codigo] || 0) + cantidad
  res.json({ ok: true })
})

app.post("/carrito/eliminar", (req, res) => {
  delete carrito[req.body.codigo]
  res.redirect("/carrito")
})

app.post("/api/carrito/eliminar", (req, res) => {
  delete carrito[req.body.codigo]
  res.json({ ok: true })
})

app.get("/carrito/json", (req, res) => {
  const productosTodos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const productosEnCarrito = Object.entries(carrito).map(([codigo, cantidad]) => {
    const producto = productosTodos.find(p => p.codigo.trim() === codigo.trim())
    return producto ? { ...producto, cantidad, subtotal: producto.precio * cantidad } : null
  }).filter(Boolean)
  res.json(productosEnCarrito)
})

app.post("/carrito/finalizar", (req, res) => {
  const nombre = req.body.nombre || "Usuario sin nombre"
  const telefono = req.body.telefono || "Sin número"
  const productosTodos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const productosEnCarrito = Object.entries(carrito).map(([codigo, cantidad]) => {
    const producto = productosTodos.find(p => p.codigo.trim() === codigo.trim())
    return producto ? { ...producto, cantidad, subtotal: producto.precio * cantidad } : null
  }).filter(Boolean)
  const total = productosEnCarrito.reduce((acc, p) => acc + p.subtotal, 0)

  let mensaje = `Hola! Soy ${nombre}. Quiero comprar estos productos:\n`
  productosEnCarrito.forEach(p => {
    mensaje += `\n- ${p.nombre} (x${p.cantidad}) - $${p.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  })
  mensaje += `\n\nTotal: $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\nMi teléfono es: ${telefono}`

  const link = `https://wa.me/5493795036085?text=${encodeURIComponent(mensaje)}`

  // Guardar historial
  const historialPath = path.join(__dirname, "data", "historial-pedidos.json")
  const historial = fs.existsSync(historialPath)
    ? JSON.parse(fs.readFileSync(historialPath, "utf-8"))
    : []
  historial.push({ nombre, telefono, productos: productosEnCarrito, total, fecha: new Date().toISOString() })
  fs.writeFileSync(historialPath, JSON.stringify(historial, null, 2))

  // Limpiar carrito
  Object.keys(carrito).forEach(c => delete carrito[c])
  res.redirect(link)
})

// PÁGINAS ESTÁTICAS
app.get("/ofertas", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/ofertas.json"))
  res.render("ofertas", { productos, user: res.locals.user })
})

app.get("/nosotros", (req, res) => res.render("nosotros", { user: res.locals.user }))
app.post("/nosotros", (req, res) => {
  const { nombre, mensaje } = req.body
  console.log(`Mensaje recibido de ${nombre}: ${mensaje}`)
  res.redirect("/nosotros")
})

app.get("/ayuda", (req, res) => res.render("ayuda", { user: res.locals.user }))

// INICIAR SERVIDOR
export default app
