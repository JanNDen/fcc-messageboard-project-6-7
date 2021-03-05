"use strict";

// Connection
const mongoose = require("mongoose");
const db = mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
const { Schema } = mongoose;

// Schemas and Models
const replySchema = new Schema({
  text: { type: String, required: true },
  created_on: { type: Date, required: true },
  reported: { type: Boolean, required: true },
  delete_password: { type: String, required: true },
});

const threadSchema = new Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, required: true },
  bumped_on: { type: Date, required: true },
  reported: { type: Boolean, required: true },
  delete_password: { type: String, required: true },
  replies: [replySchema],
});
const ThreadModel = mongoose.model("thread", threadSchema);
const ReplyModel = mongoose.model("reply", replySchema);

module.exports = function (app) {
  // Creating new thread
  app.post("/api/threads/:board", (req, res) => {
    const threadData = new ThreadModel({
      board: req.params.board,
      text: req.body.text,
      created_on: new Date().toUTCString(),
      bumped_on: new Date().toUTCString(),
      reported: false,
      delete_password: req.body.delete_password,
      replies: [],
    });
    threadData.save((err, savedThread) => {
      if (err || !savedThread) return res.json(err);
      else {
        return res.redirect(
          "/b/" + savedThread.board + "/?threadId=" + savedThread._id
        );
      }
    });
  });

  // Replying to a thread
  app.post("/api/replies/:board", (req, res) => {
    const replyData = new ReplyModel({
      text: req.body.text,
      created_on: new Date().toUTCString(),
      reported: false,
      delete_password: req.body.delete_password,
    });
    ThreadModel.findByIdAndUpdate(
      req.body.thread_id,
      { $push: { replies: replyData }, bumped_on: new Date().toUTCString() },
      { new: true },
      (err, updatedThread) => {
        if (err || !updatedThread) return res.json(err);
        else {
          return res.redirect(
            "/b/" +
              updatedThread.board +
              "/" +
              updatedThread._id +
              "/?replyId=" +
              replyData._id
          );
        }
      }
    );
  });

  // Get the 10 most recently bumped threads with 3 most recent replies each
  app.get("/api/threads/:board", (req, res) => {
    ThreadModel.find({ board: req.params.board })
      .sort({ bumped_on: "desc" })
      .limit(10)
      .lean() // Lean is important to be able to adjust returned object
      .exec((err, threadsArr) => {
        if (err || !threadsArr) return res.json(err);
        else {
          threadsArr.map((thread) => {
            delete thread.delete_password;
            thread["replycount"] = thread.replies.length;
            thread.replies.sort((a, b) => b.created_on - a.created_on);
            thread.replies = thread.replies.slice(0, 3);
            thread.replies.map((reply) => {
              delete reply.delete_password;
              delete reply.reported;
            });
          });
          return res.json(threadsArr);
        }
      });
  });

  // Get all replies for a thread
  app.get("/api/replies/:board", (req, res) => {
    ThreadModel.find({ _id: req.query.thread_id }) // Using find instead of findById in order to be able to use lean()
      .limit(1)
      .lean() // Lean is important to be able to adjust returned object
      .exec((err, threadsArr) => {
        if (err || !threadsArr) return res.json(err);
        else {
          threadsArr.map((thread) => {
            delete thread.delete_password;
            thread.replies.sort((a, b) => b.created_on - a.created_on);
            thread.replies.map((reply) => {
              delete reply.delete_password;
              delete reply.reported;
            });
            return res.json(thread);
          });
        }
      });
  });

  // Delete thread
  app.delete("/api/threads/:board", (req, res) => {
    ThreadModel.findOneAndRemove(
      { _id: req.body.thread_id, delete_password: req.body.delete_password },
      (err, deletedThread) => {
        if (err || !deletedThread) return res.json("incorrect password");
        else return res.json("success");
      }
    );
  });

  // Delete reply
  app.delete("/api/replies/:board", (req, res) => {
    ThreadModel.findOneAndUpdate(
      { _id: req.body.thread_id, "replies._id": req.body.reply_id },
      { $set: { "replies.$.text": "DELETED" } },
      {
        new: true,
        arrayFilters: [{ "replies.delete_password": req.body.delete_password }],
      },
      (err, updatedThread) => {
        if (err || !updatedThread) return res.json("incorrect password");
        else return res.json("success");
      }
    );
  });

  // Report thread
  app.put("/api/threads/:board", (req, res) => {
    ThreadModel.findByIdAndUpdate(
      req.body.thread_id,
      { reported: true },
      { new: true },
      (err, updatedThread) => {
        if (err || !updatedThread) return res.json("err");
        else return res.json("success");
      }
    );
  });

  // Report reply
  app.put("/api/replies/:board", (req, res) => {
    ThreadModel.findOneAndUpdate(
      { _id: req.body.thread_id, "replies._id": req.body.reply_id },
      { $set: { "replies.$.reported": true } },
      { new: true },
      (err, updatedThread) => {
        if (err || !updatedThread) return res.json("err");
        else return res.json("success");
      }
    );
  });
};
