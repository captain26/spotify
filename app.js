const express = require('express');
const trackRoute = express.Router();
const multer = require('multer');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const { Readable } = require('stream');
const app = express();
app.use('/tracks', trackRoute);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })  
);

const dbname = "trackdb1";

let db;
MongoClient.connect('mongodb+srv://admin-vasu:test123@cluster0.ha653.mongodb.net', (err, client) => {
  if (err) {
    console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
  }
  console.log("connected")
  db = client.db(dbname);
});

const mongoURI = "mongodb+srv://admin-vasu:test123@cluster0.ha653.mongodb.net/trackdb1";

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
  autoIndex: false, // Don't build indexes
  poolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

mongoose.connect(mongoURI, options);

const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  username: String,
  password: String,
  role: Number,
  playlists: Array,
});

const User = new mongoose.model("User", userSchema);

const playlistSchema = new mongoose.Schema({
  playlist_name: String,
  tracks: Array,
});

const Playlist = new mongoose.model("Playlist", playlistSchema);

trackRoute.get('/:trackID', (req, res) => {
    try {
      var trackID = new ObjectID(req.params.trackID);
    } catch(err) {
      return res.status(400).json({ message: "Invalid trackID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" }); 
    }
    res.set('content-type', 'audio/mp3');
    res.set('accept-ranges', 'bytes');
  
    let bucket = new mongodb.GridFSBucket(db, {
      bucketName: 'tracks'
    });
  
    let downloadStream = bucket.openDownloadStream(trackID);
  
    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });
  
    downloadStream.on('error', () => {
      res.sendStatus(404);
    });
  
    downloadStream.on('end', () => {
      res.end();
    });
  });
trackRoute.post('/', (req, res) => {
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 }});
  upload.single('track')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: "Upload Request Validation Failed" });
    } else if(!req.body.name) {
      return res.status(400).json({ message: "No track name in request body" });
    }
    
    let trackName = req.body.name;
    
    // Covert buffer to Readable Stream
    const readableTrackStream = new Readable();
    readableTrackStream.push(req.file.buffer);
    readableTrackStream.push(null);

    let bucket = new mongodb.GridFSBucket(db, {
      bucketName: 'tracks'
    });

    let uploadStream = bucket.openUploadStream(trackName);
    let id = uploadStream.id;
    readableTrackStream.pipe(uploadStream);

    uploadStream.on('error`', () => {
      return res.status(500).json({ message: "Error uploading file" });
    });

    uploadStream.on('finish', () => {
      return res.status(201).json({ message: "File uploaded successfully, stored under Mongo ObjectID: " + id });
    });
  });
});

trackRoute.post('/user', (req, res) => {
  var user = new User({ first_name: "Vaibhav Agarwal" });

  user.save(function(err, user) {
    if (err) return console.error(err);
    console.log("Document inserted succussfully!");
  });
  res.send("Document inserted succussfully!");
});

trackRoute.post('/playlist/create', (req, res) => {

  var playlist = new Playlist({ playlist_name: "playlist2"});

  playlist.save(function(err, playlist) {
    if (err) return console.error(err);
    console.log("Document inserted successfully!");
  });

  console.log(playlist._id);
  
  User.findByIdAndUpdate('5fc7ac120f2786458c1b18b2',
    {$push: {playlists: playlist._id}},
    {safe: true, upsert: true},
    function(err, doc) {
        if(err){
        console.log(err);
        }else{
        console.log(doc);
        }
    }
  );
  res.send("Document inserted succussfully!");
});

trackRoute.get('/playlist/:playlistID', (req, res) => {
});

trackRoute.get('/playlist/:userID', (req, res) => {
});

trackRoute.get('/playlists', (req, res) => {
});

trackRoute.post('/playlist/:playlistID', (req, res) => {

  try {
    var playlistID = ObjectID(req.params.playlistID);
  } catch(err) {
    return res.status(400).json({ message: "Error" }); 
  }
  
  Playlist.findByIdAndUpdate(playlistID,
    {$push: {tracks: '5fc55724c33d7eb720a06017'}},
    {safe: true, upsert: true},
    function(err, doc) {
        if(err){
        console.log(err);
        }else{
        console.log(doc);
        }
    }
  );
  res.send("Track added in" + playlistID + "successfully!");
});

app.listen(process.env.PORT || 3005, () => {
  console.log("App listening on port 3005!");
});