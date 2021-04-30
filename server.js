const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var bodyParser = require("body-parser");
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const userSchema = new Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const User = mongoose.model('User', userSchema);

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  if (!req.params || !req.body.username || usernameExists(req.body.username)) return res.json({ error: 'invalid username' });
  let newUser = new User({ username: req.body.username, count: 0, log: [] });
  newUser.save((err, data) => {
    if (err) return console.log(err);
    res.json({ username: newUser.username, _id: data._id });
  });
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, data) => {
    if (err) return console.log(err);
    res.send(data.map((user) => { return { username: user.username, _id: user._id }; }));
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  if (!req.params || !req.params._id) return res.json({ error: 'invalid id' });
  User.findById(req.params._id, (err, data) => {
    if (err || !data) return res.json({ error: 'invalid id' });
    var userLog = data.log;
    if (req.query.from && req.query.to) {

      userLog = userLog.filter((el) => new Date(el.date) > new Date(req.query.from) && new Date(el.date) < new Date(req.query.to));

    }
    if (req.query.limit) userLog = userLog.slice(0, req.query.limit);

    res.json({
      username: data.username,
      count: data.count,
      log: userLog.map((el) => { return { date: el.date, duration: el.duration, description: el.description }; })
    });
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  if (!req.params || !req.params._id) return res.json({ error: 'invalid id' });
  let newExercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: (req.body.date) ? new Date(req.body.date) : new Date.now(),
  };
  User.findByIdAndUpdate(req.params._id, { $push: { log: newExercise }, $inc: { count: 1 } }, { new: true }, (err, data) => {
    if (err) return res.json({ error: 'invalid id' });
    res.json({
      username: data.username,
      description: newExercise.description,
      date: newExercise.date, 
      duration: newExercise.duration,
      _id: data._id
    });
  });
});

app.get('/api/delete', (req, res) => {
  User.remove({}, (err, data) => {
    res.json({ rem: 'a' });
  });
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

function usernameExists(username) {
  User.countDocuments({ username: username }, (err, data) => {
    if (err) return console.log(err);
    if (data == 0) return false;
    return true;
  })
}
