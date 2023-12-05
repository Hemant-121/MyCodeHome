import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyDTBROunlwYe7LDZmvc45o0h0Eh7n1YxTE",
  authDomain: "mycodehome-mern-blog.firebaseapp.com",
  projectId: "mycodehome-mern-blog",
  storageBucket: "mycodehome-mern-blog.appspot.com",
  messagingSenderId: "527717582584",
  appId: "1:527717582584:web:72a21d502ef1cae75f9d0d"
};


const app = initializeApp(firebaseConfig);

// Google Auth

const provider = new GoogleAuthProvider();

const auth = getAuth();

export const authWithGoogle = async () =>{
    let user = null;
    await signInWithPopup(auth, provider)
    .then((result) => {
        user = result.user
    })
    .catch((err) =>{
        console.log(err)
    })
    return user;
}