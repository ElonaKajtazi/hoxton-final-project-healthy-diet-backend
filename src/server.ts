import express from "express"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

const port = 4567

app.get("/", (req, res) => {
res.send("Let's start")
})

app.listen(port, () => {
    console.log(`App running: http://localhost:${port}`)
})