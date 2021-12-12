/* eslint-disable no-restricted-globals */
import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from 'firebase/app';
import { collection, getFirestore, query, orderBy, setDoc, doc, Timestamp, enableIndexedDbPersistence  } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL  } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import 'firebase/firestore';
import 'firebase/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

const fb = initializeApp({
  //initialize firebase here
});

const db = getFirestore();
const messaging = getMessaging(fb);
const auth = getAuth();

enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          // ...
      } else if (err.code === 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          // ...
      }
  });

function App() {
  const [userActive] = useAuthState(auth);
  const [btnVisible, setBtnVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  getToken(messaging, {vapidKey: ""}) //your vapidKey from firebase cloud message
  .then((currToken) => {
    if (currToken) {
      // Send the token to your server and update the UI if necessary
      // ...
      console.log("anjai nemu token", currToken)
    } else {
      // Show permission request UI
      console.log('No registration token available. Request permission to generate one.');
      // ...
    }
  })
  .catch(err => console.log('error', err));

  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    // ...
  });

  useEffect(() => {
    console.log("Listening for Install prompt");
    window.addEventListener('beforeinstallprompt',e=>{
      // For older browsers
      e.preventDefault();
      console.log("Install Prompt fired");
      setInstallPrompt(e);
      // See if the app is already installed, in that case, do nothing
      if((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true){
        return false;
      }
      // Set the state variable to make button visible
      setBtnVisible(true);
    })
  })

  const installApp = async () => {
    if(!installPrompt) return false;
    installPrompt.prompt();
    let outcome = await installPrompt.userChoice;
    if(outcome.outcome === 'accepted'){
      console.log("App Installed")
    }
    else{
      console.log("App not installed");
    }
    // Remove the event reference
    setInstallPrompt(null);
    // Hide the button
    setBtnVisible(false)
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <img src="../manifest-icon-192.maskable.png" alt="logo"/>
        Chat Aja
        {btnVisible && <button onClick={installApp}>download</button>}
        <SignOut />
      </header>
      <section>
        { userActive ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
    .then((result) => {
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      // The signed-in user info.
      const user = result.user;
      console.log(token, user)
      // ...
    }).catch((error) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.log(errorCode, errorMessage, email, credential)
      // ...
    });
  }

  return (
    <button onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  )
}

function SignOut() {
  const signOut = () => {
    auth.signOut().then(value => console.log(value)).catch(err => console.log(err))
  }
  return auth.currentUser && (
    <button onClick={signOut}>
      Sign Out
    </button>
  )
}

function ChatRoom() {
  const dummy = useRef();
  const inputRef = useRef();
  const messageRef = collection(db, 'messages');
  const q = query(messageRef, orderBy('createdAt'));
  const storage = getStorage();

  const [messages] = useCollectionData(q, { idField: 'id' });
  console.log(messages)
  useEffect(() => {
    if (messages) {
      if (auth.currentUser.uid !== messages[messages.length -1].uid) {
        if (!("Notification" in window)) {
          alert("This browser does not support desktop notification");
        }
      
        // Let's check whether notification permissions have already been granted
        else if (Notification.permission === "granted") {
          // If it's okay let's create a notification
          new Notification("New Message");
        }
      
        // Otherwise, we need to ask the user for permission
        else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(function (permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
              new Notification("New Message");
            }
          });
        }
      }
    }
  }, [messages])

  const sendMessage = (attachment = null) => async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await setDoc(doc(messageRef), {
      text: formValue,
      createdAt: Timestamp.now(),
      uid,
      photoURL,
      attachment
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  const [formValue, setFormValue] = useState('');

  const sendImage = async (e) => {
    e.preventDefault();
    console.log(e.target.files[0])
    const inputFile = e.target.files[0];
    const fileFormat = inputFile.name.slice(inputFile.name.length - 4).toLowerCase();
    if (fileFormat === '.png' || fileFormat === '.jpg' || fileFormat === 'jpeg' ) {
      const storageRef = ref(storage, inputFile.name + new Date().getTime());
      let data = new FormData();
      data.append('files',inputFile)
      await uploadBytes(storageRef, inputFile).then((snapshot) => {
        console.log('Uploaded a blob or file!', snapshot);
      });
      let imageURL = '';
      await getDownloadURL(storageRef).then(url => imageURL = url);
      sendMessage(imageURL)(e);
    } else {
      console.log('harus input gambar')
    }
  }

  const clickFileInput = (e) => {
    e.preventDefault();
    inputRef.current.click()
  }
  return (<>
    <main>

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

      <span ref={dummy}></span>

    </main>

    <form onSubmit={sendMessage()}>

      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />

      <input ref={inputRef} style={{ display: 'none' }} type="file" id="myFile" name="filename" onChange={sendImage} />
      <button type="button" onClick={clickFileInput}>
        <img className="button" src="https://cdn-icons-png.flaticon.com/512/54/54719.png" alt="attach" />
      </button>
      <button type="submit" disabled={!formValue}>
        <img className="button" src="https://cdn-icons-png.flaticon.com/512/724/724954.png" alt="attach" />
      </button>

    </form>
  </>)
}

function ChatMessage(props) {
  const { text, uid, photoURL, attachment } = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      <img alt="PP" src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} />
      {!attachment && <p>{text}</p>}
      {attachment && <p><img className="attachment" src={attachment} alt="attachment" /></p>}
    </div>
  </>)
}

export default App;
