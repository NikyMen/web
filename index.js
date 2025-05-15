import express from "express"
import { PORT } from "./config.js"
import { UserRepository } from "./user-repository.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"




const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set("view engine", "ejs")

app.use(express.json())

app.get("/", (req, res) => {
  res.render("example" , { username : "123" })
})

///////////////////////////////////////////////////////////////////////////
///////////////////////app.post////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

app.post("/login", async (req, res) => {
  const { username, password } = req.body

  try {
    const user = await UserRepository.login({ username, password })
    res.send({ user })
  } catch (error) {
    res.status(401).send("error 401")
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
  // lógica de logout (por ejemplo, borrar el token del cliente)
})

app.get("/protected", (req, res) => {
  // lógica para acceder a una ruta protegida (verificar token)
})


///////////////////////////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})