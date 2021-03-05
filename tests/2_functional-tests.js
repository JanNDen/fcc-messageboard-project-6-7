var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  const board = "ChaiBoard";
  const threadName = "Thread Name";
  const replyName = "Reply Name";
  const deletePassword = "test";
  let myThreadId;
  let myReplyId;

  suite("API ROUTING FOR /api/threads/:board", function () {
    const route = "/api/threads/" + board;
    test("Creating new thread", (done) => {
      chai
        .request(server)
        .post(route)
        .send({
          board: board,
          text: threadName,
          delete_password: deletePassword,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.include(res.redirects[0], board);
          myThreadId = res.redirects[0].split("=")[1];
          done();
        });
    });

    test("Get the 10 most recently bumped threads with 3 most recent replies each", (done) => {
      chai
        .request(server)
        .get(route)
        .send()
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isUndefined(res.body[0].delete_password);
          assert.isAtMost(res.body[0].replies.length, 3);
          done();
        });
    });

    test("Report thread", (done) => {
      chai
        .request(server)
        .put(route)
        .send({
          thread_id: myThreadId,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body, "success");
          done();
        });
    });
  });

  suite("API ROUTING FOR /api/replies/:board", function () {
    const route = "/api/replies/" + board;
    test("Replying to a thread", (done) => {
      chai
        .request(server)
        .post(route)
        .send({
          thread_id: myThreadId,
          text: replyName,
          delete_password: deletePassword,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.include(res.redirects[0], board);
          assert.include(res.redirects[0], myThreadId);
          myReplyId = res.redirects[0].split("=")[1];
          done();
        });
    });
    test("Get all replies for a thread", (done) => {
      chai
        .request(server)
        .get(route)
        .query({ thread_id: myThreadId })
        .send()
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body._id, myThreadId);
          assert.isUndefined(res.body.delete_password);
          assert.isArray(res.body.replies);
          done();
        });
    });
    test("Report reply", (done) => {
      chai
        .request(server)
        .put(route)
        .send({
          thread_id: myThreadId,
          reply_id: myReplyId,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body, "success");
          done();
        });
    });
  });
  suite("API ROUTING FOR Deletions", function () {
    test("Delete reply", (done) => {
      chai
        .request(server)
        .delete("/api/replies/" + board)
        .send({
          thread_id: myThreadId,
          reply_id: myReplyId,
          delete_password: deletePassword,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body, "success");
          done();
        });
    });

    test("Delete thread", (done) => {
      chai
        .request(server)
        .delete("/api/threads/" + board)
        .send({
          thread_id: myThreadId,
          delete_password: deletePassword,
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body, "success");
          done();
        });
    });
  });
});
