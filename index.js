import express from "express"
import { PORT } from "./config.js"
import { UserRepository } from "./user-repository.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import expressLayouts from "express-ejs-layouts"

const SECRET_KEY = "mi_clave_secreta"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(expressLayouts)
app.set("layout", "layout")
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

app.use((req, res, next) => {
  const token = req.cookies.user
  if (!token) {
    res.locals.user = null
    return next()
  }
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    res.locals.user = decoded
  } catch (err) {
    res.locals.user = null
  }
  next()
})

app.get("/", (req, res) => {
  const dataPath = path.join(__dirname, "data", "ofertas.json")
  const productos = JSON.parse(fs.readFileSync(dataPath, "utf-8"))
  res.render("index", {
    username: res.locals.user?.username || null,
    user: res.locals.user,
    productos
  })
})

app.get("/protected", (req, res) => {
  if (!res.locals.user) return res.redirect("/")
  res.render("protected", { user: res.locals.user })
})

app.get("/register", (req, res) => {
  res.render("register")
})

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Iniciar sesión",
    user: res.locals.user
  })
})

app.get("/ofertas", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/ofertas.json"))
  res.render("ofertas", { productos, user: res.locals.user })
})

app.get("/productos", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const ofertas = JSON.parse(fs.readFileSync("./data/ofertas.json", "utf-8"))

  const termino = req.query.buscar?.toLowerCase() || ""
  const page = parseInt(req.query.page) || 1
  const limit = 24
  const offset = (page - 1) * limit

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(termino)
  )

  const paginados = filtrados.slice(offset, offset + limit)
  const totalPaginas = Math.ceil(filtrados.length / limit)
  const totalResultados = filtrados.length

  res.render("productos", {
    productos: paginados,
    ofertas,
    user: res.locals.user,
    paginaActual: page,
    totalPaginas,
    totalResultados,
    termino
  })
})

// 🆕 Ruta para detalle de producto
app.get("/producto/:codigo", (req, res) => {
  const productos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const producto = productos.find(p => p.codigo.trim() === req.params.codigo)

  if (!producto) {
    return res.status(404).send("Producto no encontrado")
  }

  res.render("producto", {
    producto,
    user: res.locals.user
  })
})

// 1. Creamos una variable en memoria para almacenar el carrito por sesión
const carrito = {}

// 2. Ruta para agregar productos al carrito
app.post("/carrito/agregar", (req, res) => {
  const codigo = req.body.codigo
  const cantidad = parseInt(req.body.cantidad) || 1

  if (!codigo) return res.status(400).send("Código de producto requerido")

  if (!carrito[codigo]) {
    carrito[codigo] = cantidad
  } else {
    carrito[codigo] += cantidad
  }

  res.redirect("/carrito")
})

// 3. Ruta para ver el carrito
app.get("/carrito", (req, res) => {
  const productosTodos = JSON.parse(fs.readFileSync("./data/productos.json", "utf-8"))
  const productosEnCarrito = Object.entries(carrito).map(([codigo, cantidad]) => {
    const producto = productosTodos.find(p => p.codigo.trim() === codigo.trim())
    if (!producto) return null
    return {
      ...producto,
      cantidad,
      subtotal: (producto.precio * cantidad)
    }
  }).filter(Boolean)

  const total = productosEnCarrito.reduce((acc, p) => acc + p.subtotal, 0)

  res.render("carrito", {
    productos: productosEnCarrito,
    total,
    user: res.locals.user
  })
})

// 4. Ruta para eliminar un producto del carrito
app.post("/carrito/eliminar", (req, res) => {
  const codigo = req.body.codigo
  delete carrito[codigo]
  res.redirect("/carrito")
})


app.post("/login", async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await UserRepository.login({ username, password })
    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: "2h" })
    res.cookie("user", token, { httpOnly: true })
    res.send({ user })
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
