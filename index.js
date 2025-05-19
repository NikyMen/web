import express from "express"
import { PORT } from "./config.js"
import { UserRepository } from "./user-repository.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import cookieParser from "cookie-parser"  // <-- ya estaba importado



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))  // <-- necesario para usar /views

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())  // <-- activa el uso de cookies

// middleware para extraer el usuario desde la cookie
app.use((req, res, next) => {
  try {
    const user = JSON.parse(req.cookies.user || null)
    res.locals.user = user
  } catch {
    res.locals.user = null
  }
  next()
})

app.get("/", (req, res) => {
  // si hay usuario logueado, pasarlo a la vista; si no, username = null
  res.render("index", { username: res.locals.user?.username || null })
})

///////////////////////////////////////////////////////////////////////////
///////////////////////app.post////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

app.post("/login", async (req, res) => {
  const { username, password } = req.body

  try {
    const user = await UserRepository.login({ username, password })
    res.cookie("user", JSON.stringify(user), { httpOnly: true }) // <-- guarda cookie
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
  res.clearCookie("user")  // <-- borra la cookie del usuario
  res.redirect("/")        // <-- vuelve al inicio
})

app.get("/protected", (req, res) => {
  if (!res.locals.user) {
    return res.redirect("/")  // <-- si no hay usuario, no accede
  }

  res.render("protected", { user: res.locals.user })  // <-- muestra vista protegida
})

///////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
