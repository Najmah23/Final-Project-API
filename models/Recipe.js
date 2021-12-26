const mongoose = require("mongoose")
const Joi = require("joi")
const { string } = require("joi")

const RatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },

  rating: Number,
})
const recipeSchema = new mongoose.Schema({
  title: String,
  photo: String,
  ingredients: String,
  steps: String,
  rating: [RatingSchema],
  ratingAverage: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
    },
  ],
  likes: [
    {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  ],
  owner: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  types: {
    type: String,
    enum: ["Salad", "Soup", "Jucie", "Other"],
  },
})
const recipeAddjoi = Joi.object({
  title: Joi.string().max(100).min(1).required(),
  photo: Joi.string().uri().required(),
  ingredients: Joi.string().min(4).max(1000).required(),
  steps: Joi.string().min(4).max(1000).required(),
  types: Joi.string().min(4).max(1000).required(),
})

const recipeEditjoi = Joi.object({
  title: Joi.string().max(100).min(1),
  photo: Joi.string().uri(),
  ingredients: Joi.string().min(4).max(1000),
  steps: Joi.string().min(4).max(1000),
  types: Joi.string().min(4).max(1000),
})
ratingJoi = Joi.object({
  rating: Joi.number().min(0).max(5).required(),
})
const Recipe = mongoose.model("Recipe", recipeSchema)
module.exports.Recipe = Recipe
module.exports.recipeAddjoi = recipeAddjoi
module.exports.recipeEditjoi = recipeEditjoi
module.exports.ratingJoi = ratingJoi
