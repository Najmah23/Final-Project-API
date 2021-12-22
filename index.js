const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()
const Joi = require("joi")
const joiObjectId = require("joi-objectid")
Joi.ObjectId = joiObjectId(Joi)
const users = require("./routes/users")
const recipes = require("./routes/recipes")

mongoose
  .connect(`mongodb://localhost:27017/recipesDB`)
  .then(() => {
    console.log("Connected to MongoDB")
  })
  .catch(error => {
    console.log("Error conneting to MongoDB ", error)
  })
const app = express()
app.use(express.json())
app.use(cors())
app.use("/api/auth", users)
app.use("/api/recipes", recipes)
app.listen(5000, () => {
  console.log("server is listening on port:" + 5000)
})
