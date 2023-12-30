import express, { json } from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import User from "./Schema/User.js";
import { nanoid } from "nanoid";
import jwt, { decode } from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccountKey from "./mycodehome-mern-blog-firebase-adminsdk-bzef7-2efaa80449.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import aws from 'aws-sdk';

const server = express();
let PORT = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());

server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
  autoIndex: true,
});




// Setting up S3 Bucket
const s3 = new aws.S3({
  region: 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

const generateUploadURL = async () => {
    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
    
    return await s3.getSignedUrlPromise('putObject', {
      Bucket: 'mycodehome-blog',
      Key: imageName,
      Expires: 1000,
      ContentType: 'image/jpeg'
    })
}





const formateDatatoSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );

  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
    email: user.personal_info.email,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let isUsernameNotUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  isUsernameNotUnique ? (username += nanoid().substring(0, 5)) : "";

  return username;
};


// upload iamge url route

server.get('/get-upload-url', (req, res) => {
  generateUploadURL().then(url => res.status(200).json({uploadURL: url}))
  .catch(err => {
    console.log(err.message);
    return res.status(500).json({error: err.message })
  })
})







server.post("/signup", (req, res) => {
  let { fullname, email, password } = req.body;

  // Validating the data from the frontend
  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "Fullname must be at least 3 letters long" });
  }
  if (!email.length) {
    return res.status(403).json({ error: "Enter a valid email" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Email is Invalid! " });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "Password should be 6 to 20 characters logn with a numeric, 1 lowercase and 1 Uppercase letters ! ",
    });
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {
    let username = await generateUsername(email);

    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });

    user
      .save()
      .then((u) => {
        return res.status(200).json(formateDatatoSend(u));
      })
      .catch((err) => {
        if (err.code == 11000) {
          return res.status(500).json({ error: "Email already exists" });
        }

        return res.status(500).json({ error: err.message });
      });
  });
});

server.post("/signin", (req, res) => {
  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ error: "Email not found !" });
      }

      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(403)
              .json({ error: "Error occured while login please try again" });
          }
          if (!result) {
            return res.status(403).json({ error: "Incorrect Password" });
          } else {
            return res.status(200).json(formateDatatoSend(user));
          }
        });
      } else {
        return res
          .status(403)
          .json({
            error:
              "Your account was created using google. Try to Login Using with Google! ",
          });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(403).json({ error: err.message });
    });
});

server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;

     getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;

      picture = picture.replace("s96-c", "s384-c");

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img personal_info.google_auth"
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {    // login
        if (!user.goole_auth) {
          return res.status(403).json({
            error:
              "This email was signed up without google. Please log in with email and password to access the account",
          });
        } else {
          return res.status(200).json(formateDatatoSend(user));
        }
      } else {
        let username = await generateUsername(email);

        user = new User({
          personal_info: {
            fullname: name,
            email,
            profile_img: picture,
            username,
          },
          google_auth: true,
        });

        await user
          .save()
          .then((u) => {
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }
      return res.status(200).json(formateDatatoSend(user));
    })
    .catch((err) => {
      return res.status(500).json({
        error:
          "Failed to authenticate you with google. Try with some other google account",
      });
    });
});


// server.post("/google-auth", async (req, res) => {
//   try {
//     const { access_token } = req.body;

//     const decodedUser = await getAuth().verifyIdToken(access_token);
//     const { email, name, picture } = decodedUser;

//     // Try to find the user by email
//     let user = await User.findOne({ "personal_info.email": email });

//     if (user) {
//       // User found, log them in
//       if (!user.google_auth) {
//         return res.status(403).json({
//           error:
//             "This email was signed up without Google. Please log in with email and password to access the account.",
//         });
//       } else {
//         return res.status(200).json(formateDatatoSend(user));
//       }
//     } else {
//       // User not found, create a new user with Google authentication
//       const username = await generateUsername(email);

//       user = new User({
//         personal_info: {
//           fullname: name,
//           email,
//           profile_img: picture,
//           username,
//         },
//         google_auth: true,
//       });

//       await user.save();
//       return res.status(200).json(formateDatatoSend(user));
//     }
//   } catch (err) {
//     return res.status(500).json({
//       error:
//         "Failed to authenticate you with Google. Try with some other Google account",
//     });
//   }
// });



server.listen(PORT, () => {
  console.log("Listing on port --> " + PORT);
});
