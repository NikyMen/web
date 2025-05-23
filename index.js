import express from "express"
import { PORT } from "./config.js"
import { UserRepository } from "./user-repository.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import cookieParser from "cookie-parser"  // <-- ya estaba importado
import jwt from "jsonwebtoken"            // <-- corrección: era jwt, no jws
import expressLayouts from "express-ejs-layouts"

const SECRET_KEY = "mi_clave_secreta" // <-- podés mover esto a un archivo .env

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()  // <-- ESTA LÍNEA DEBE IR ANTES de usar app

// ✅ ahora sí, acá va expressLayouts
app.use(expressLayouts)
app.set("layout", "layout") // Esto toma views/layout.ejs como base

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))  // <-- necesario para usar /views

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())  // <-- activa el uso de cookies
app.use(express.static(path.join(__dirname, "public")))


// middleware para extraer el usuario desde la cookie con JWT
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
  res.render("index", {
  username: res.locals.user?.username || null,
  user: res.locals.user})

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


///////////////////////////////////////////////////////////////////////////
///////////////////////app.post////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

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
  console.log({ username, password })

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

///////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
