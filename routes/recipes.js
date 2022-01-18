const express = require("express")
const mongoose = require("mongoose")
const checkAdmin = require("../middleware/checkAdmin")
const checkId = require("../middleware/checkId")
const checkToken = require("../middleware/checkToken")
const validateBody = require("../middleware/validateBody")
const validateId = require("../middleware/validateId")
const { Comment, commentJoi } = require("../models/Comment")
const router = express.Router()
const { recipeAddjoi, recipeEditjoi, Recipe, ratingJoi } = require("../models/Recipe")
const { User } = require("../models/User")

// --------------Recipes---------
router.get("/", async (req, res) => {
  try {
    const recipe = await Recipe.find()
      .select("-__v")
      .populate({
        path: "comments",
        populate: {
          path: "owner",
          select: "-password -email -like -role ",
        },
      })
      .populate({ path: "owner", select: "firstName lastName" })
    res.json(recipe)
  } catch (error) {
    return res.status(500).send(error.message)
  }
})
// -----------get recipe by id-------------
router.get("/:id", checkAdmin, checkId, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate({
        path: "comments",
        populate: {
          path: "owner",
          select: "-__v -email -likes -role ",
        },
      })
      .populate({
        path: "owner",
          select: "-password ",
        },
      )

    if (!recipe) return res.status(404).send("recipe not found")
    res.json(recipe)
  } catch (error) {
    return res.status(500).send(error.message)
  }
})
// -----Add recipe--------

router.post("/", checkToken, validateBody(recipeAddjoi), async (req, res) => {
  try {
    const { title, types, photo, ingredients,steps, calories } = req.body
    const recipe = new Recipe({
      title,
      types,
      photo,
      ingredients,
      steps,
      calories,
      owner: req.userId,
    })
    await recipe.save()
    await User.findByIdAndUpdate(req.userId, { $push: { myRecipes: recipe._id } })

    res.json(recipe)
  } catch (error) {
    console.log(error)
    return res.status(500).send(error.message)
  }
})
// ----------edit recipe-by id--------

router.put("/:id", checkToken, checkId, validateBody(recipeEditjoi), async (req, res) => {
  try {
    const { title, types, photo, ingredients,steps, calories } = req.body

    const recipeFound = await Recipe.findById(req.params.id)
    const user = await User.findById(req.userId)
    if (user.role !== "Admin" && recipeFound.owner != req.userId)
      return res.status(403).json("unauthorized action")

    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: { title, types, photo, ingredients,steps, calories } },
      { new: true }
    )
    if (!recipe) return res.status(404).send("recipe not found")

    res.json(recipe)
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
// ------------delet recipe by id -------

router.delete("/:id", checkToken, checkId, async (req, res) => {

  try {
    const recipeFound = await Recipe.findById(req.params.id)
    const user = await User.findById(req.userId)
    if (user.role !== "Admin" && recipeFound.owner != req.userId)
      return res.status(403).json("unauthorized action")

    await Comment.deleteMany({ recipeId: req.params.id })

    const recipe = await Recipe.findByIdAndRemove(req.params.id)
    if (!recipe) return res.status(404).send("recipe not found")

    res.send("recipe is removed")
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})

/* Comments */

// ---------get comment--------

router.get("/:recipeId/comments", validateId("recipeId"), async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) return res.status(404).send("recipe not found")

    const comments = await Comment.find({ recipeId: req.params.recipeId })
    res.json(comments)
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
//   ---------Add comment -------------
router.post("/:recipeId/comments", checkToken, validateId("recipeId"), validateBody(commentJoi), async (req, res) => {
  try {
    const { comment } = req.body

    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) return res.status(404).send("recipe not found")

    const newComment = new Comment({ comment, owner: req.userId, recipeId: req.params.recipeId })

    await Recipe.findByIdAndUpdate(req.params.recipeId, { $push: { comments: newComment._id } })

    await newComment.save()

    res.json(newComment)
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
//   ------------edit comment-------
router.put(
  "/:recipeId/comments/:commentId",
  checkToken,
  validateId("recipeId", "commentId"),
  validateBody(commentJoi),
  async (req, res) => {
    try {
      const recipe = await Recipe.findById(req.params.recipeId)
      if (!recipe) return res.status(404).send("recipe not found")
      const { comment } = req.body

      const commentFound = await Comment.findById(req.params.commentId)
      if (!commentFound) return res.status(404).send("comment not found")

      if (commentFound.owner != req.userId) return res.status(403).send("unauthorized action")

      const updatedComment = await Comment.findByIdAndUpdate(req.params.commentId, { $set: { comment } }, { new: true })

      res.json(updatedComment)
    } catch (error) {
      console.log(error)
      res.status(500).send(error.message)
    }
  }
)
// ----------delet comment--------------

router.delete("/:recipeId/comments/:commentId", checkToken, validateId("recipeId", "commentId"), async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) return res.status(404).send("recipe not found")

    const commentFound = await Comment.findById(req.params.commentId)
    if (!commentFound) return res.status(404).send("comment not found")

    const user = await User.findById(req.userId)

    if (user.role !== "Admin" && commentFound.owner != req.userId) return res.status(403).send("unauthorized action")

    await Recipe.findByIdAndUpdate(req.params.recipeId, { $pull: { comments: commentFound._id } })

    await Comment.findByIdAndRemove(req.params.commentId)

    res.send("comment is removed")
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
// ---------------Likes--------------

router.get("/:recipeId/likes", checkToken, validateId("recipeId"), async (req, res) => {
  try {
    let recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) return res.status(404).send("recipe not found")

    const userFound = recipe.likes.find(like => like == req.userId)
    if (userFound) {
      await Recipe.findByIdAndUpdate(req.params.recipeId, { $pull: { likes: req.userId } })
      await User.findByIdAndUpdate(req.userId, { $pull: { likes: req.params.recipeId } })

      res.send("removed like from recipe")
    } else {
      await Recipe.findByIdAndUpdate(req.params.recipeId, { $push: { likes: req.userId } })
      await User.findByIdAndUpdate(req.userId, { $push: { likes: req.params.recipeId } })
      res.send("recipe liked")
    }
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
// -------Reting-----------/---------Add reting-----

router.post("/:recipeId/rating", checkToken, validateId("recipeId"), validateBody(ratingJoi), async (req, res) => {
  try {
    let recipe = await Recipe.findById(req.params.recipeId)
    if (!recipe) return res.status(404).send("recipe not found ")
    const { rating } = req.body

    const nweRating = {
      rating,
      userId: req.userId,
    }

    const ratingFound = recipe.rating.find(ratingObject => ratingObject.userId == req.userId)
    if (ratingFound) return res.status(400).send("user alread rated thi recipe ")

    recipe = await Recipe.findByIdAndUpdate(req.params.recipeId, { $push: { rating: nweRating } }, { new: true })

    let ratingSum = 0
    recipe.rating.forEach(ratingObject => {
      ratingSum += ratingObject.rating
    })
    const ratingAverage = ratingSum / recipe.rating.length

    await Recipe.findByIdAndUpdate(req.params.recipeId, { $set: { ratingAverage } })
    res.send("rating added")
  } catch (error) {
    console.log(error)
    res.status(500).send(error.message)
  }
})
module.exports = router
