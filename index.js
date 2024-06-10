const express = require("express");
const nunjucks = require("nunjucks");
const { MongoClient, ObjectId } = require('mongodb')
const cors = require('cors');
const { nanoid } = require("nanoid");
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser");
const markdownit = require('markdown-it');

const app = express();
require('dotenv').config();

const clientPromise = new MongoClient('mongodb+srv://user:wsSdw2%25%40sdfas@cluster0.djhvcyg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useUnifiedTopology: true
})

app.use(cookieParser());

nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));
app.use(cors({credentials: true, origin: 'https://practical-rwd6.onrender.com'}));

app.use(async (req, res, next) => {
  try {
    const client = await clientPromise.connect();
    req.db = client.db('node');
    next();
  } catch (err) {
    console.log(err);
  }
})

const findUserByUserName = (db, username) => {
  return db.collection("user").findOne({ username });
}

const findUserBySessionId = async (db, sessindID) => {
  const session = await db.collection("session").findOne(
    { sessindID }
  );

  if (!session) {
    return;
  }

  return db.collection("user").findOne({ _id: new ObjectId(session.userId) });
}

const createSession = async (db, userId) => {
  const sessindID = nanoid();

  await db.collection("session").insertOne({
    userId,
    sessindID
  });
  return sessindID;
}

const deleteSession = async (db, sessindID) => {
  db.collection("session").deleteOne({ sessindID });
}

const createUser = async (db, username, password) => {
  return await db.collection("user").insertOne({
    username,
    password
  });
}

function encryptPassword(password) {
  let encryptedPassword = "";
  let alphabet = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < password.length; i++) {
    encryptedPassword += alphabet[i % alphabet.length] + "2" + password[i];
  }
  return encryptedPassword.split("").reverse().join("");
}

function decryptPassword(encryptedPassword) {
  let decryptedPassword = "";
  let reversedEncryptedPassword = encryptedPassword.split("").reverse().join("");
  for (let i = 0; i < reversedEncryptedPassword.length; i += 3) {
    decryptedPassword += reversedEncryptedPassword[i + 2];
  }
  return decryptedPassword;
}

const auth = () => async (req, res, next) => {
  console.log(1);
  console.log(req.cookies);
  if (!req.cookies["sessionId"]) {
    return next();
  }

  const user = await findUserBySessionId(req.db, req.cookies["sessionId"]);
  console.log(user);
  console.log(req.cookies["sessionId"]);

  req.user = user;
  req.sessindID = req.cookies["sessionId"];
  next();
}

app.get("/", auth(), async (req, res) => {
  if (req.user !== undefined) {
    return res.render("dashboard", {
      user: req.user,
    })
  } else {
    res.render("index");
  }
});

app.get('/dashboard', auth(), async (req, res) => {
  if (req.user !== undefined) {
    return res.render("dashboard", {
      user: req.user,
    })
  } else {
    res.render("index");
  }
});

app.post("/login", bodyParser.urlencoded({ extended: false }),
  async (req, res) => {
    const { username, password } = req.body;

    const user = await findUserByUserName(req.db, username);

    if (!user || decryptPassword(user.password) !== password) {
      return res.render("index", {
        authError: 'Неверный логин или пароль'
      });
    }

    const sessindID = await createSession(req.db, user._id.toString());

    res.cookie("sessionId", sessindID, { httpOnly: false }).redirect("/dashboard")
  }
);

app.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    return res.redirect("/")
  }

  await deleteSession(req.db, req.sessindID);
  res.clearCookie("sesionId").redirect("/")
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;

  const user = await findUserByUserName(req.db, username);
  if (!user) {
    const newUser = await createUser(req.db, username, encryptPassword(password))

    const sessindID = await createSession(req.db, newUser.insertedId.toString());
    res.cookie("sessionId", sessindID, { httpOnly: false }).redirect("/dashboard")
  } else {
    return res.render("index", {
      authError: 'Логин занят'
    });
  }
});

app.post("/node", auth(), async (req, res) => {
  const { title, text, user } = req.body;

  console.log(6);
  console.log(user);
  console.log(req.cookies);
  console.log(res.cookies);
  console.log(7);
  const node = await req.db.collection("node").insertOne({
    title,
    text,
    created: Date.now(),
    isArchived: false,
    user: req.user._id
  });

  res.json(node);
});

app.get('/node', auth(), bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { age, id } = req.query;

  let nodes;

  console.log(6);
  console.log(req.user);
  console.log(req.cookies);
  console.log(res.cookies);
  console.log(7);

  if (age !== undefined) {
    if (age === 'archive') {
      nodes = await req.db.collection("node").find({ isArchived: true, user: req.user._id }).toArray();
    } else if (age === '1month') {
      const date = new Date(new Date(Date.now()).setMonth(new Date(Date.now()).getMonth() - 1));
      nodes = await req.db.collection("node").find({ created: { $gte: date.getTime() }, user: req.user._id }).toArray();
    } else if (age === '3months') {
      const date = new Date(new Date(Date.now()).setMonth(new Date(Date.now()).getMonth() - 1));
      nodes = await req.db.collection("node").find({ created: { $gte: date.getTime() }, user: req.user._id }).toArray();
    } else {
      nodes = await req.db.collection("node").find({ user: req.user._id }).toArray();
    }
  } else if (id !== undefined && id !== 'undefined') {
    nodes = await req.db.collection("node").find({ _id: new ObjectId(id), user: req.user._id }).toArray();
  } else {
    return res.status(504).send('заметок не найдено');
  }

  if (nodes.length === 0) {
    return res.status(504).send('заметок не найдено');
  }


  nodes.forEach((node) => {
    const date = new Date(node.created)
    node.created = date;

    const md = markdownit()
    node.html = md.render(node.text);
  })

  if (age !== undefined) {
    return res.json({ data: nodes });
  } else if (id !== undefined) {
    return res.json(nodes[0]);
  }
});

app.delete('/node', auth(), bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { id, isArchived } = req.body;
  let result;

  result = isArchived === "all" ? await req.db.collection("node").deleteMany({ isArchived: true, user: req.user._id }) : await req.db.collection("node").deleteOne({ _id: new ObjectId(id), user: req.user._id });

  return res.json(result);
});

app.patch('/node', auth(), bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { id, title, text, isArchived } = req.body;

  let node;

  if (isArchived === undefined) {
    node = await req.db.collection('node').updateOne({ _id: new ObjectId(id), user: req.user._id }, {
      $set: {
        title,
        text
      }
    })
  } else if (id !== undefined) {
    node = await req.db.collection('node').updateOne({ _id: new ObjectId(id), user: req.user._id }, {
      $set: {
        isArchived
      }
    })
  }

  res.json(node);
});




















const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
