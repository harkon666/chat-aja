/* eslint-disable no-restricted-globals */
import React, { useRef, useState, useEffect } from 'react';
import './App.css';
// import { getMessaging } from "firebase/messaging";
import { initializeApp } from 'firebase/app';
import { collection, getFirestore, query, orderBy, setDoc, doc, Timestamp, enableIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, onMessage, getToken } from "firebase/messaging";
import { getStorage, ref, uploadBytes, getDownloadURL  } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import 'firebase/firestore';
import 'firebase/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

import SignIn from './components/SignIn';
import SignOut from './components/SignOut';
import ChatMessage from './components/ChatMessage';

initializeApp({
  //initialize here
});

const db = getFirestore();
enableIndexedDbPersistence(db).catch(e => console.log(e))

const auth = getAuth();

const messaging = getMessaging();
getToken(messaging, { vapidKey: '<your_vapid_key>' }).then((currentToken) => {
  if (currentToken) {
    // Send the token to your server and update the UI if necessary
    // ...
  } else {
    // Show permission request UI
    console.log('No registration token available. Request permission to generate one.');
    // ...
  }
}).catch((err) => {
  console.log('An error occurred while retrieving token. ', err);
  // ...
});
onMessage(messaging);

function App() {
  const [userActive] = useAuthState(auth);
  const [btnVisible, setBtnVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
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
    });
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

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
    .then((result) => {
      // This gives you a Google Access Token. You can use it to access the Google API.
      GoogleAuthProvider.credentialFromResult(result);
      // ...
    }).catch((error) => {
      // Handle Errors here.
      GoogleAuthProvider.credentialFromError(error);
      // ...
    });
  }

  const signOut = () => {
    auth.signOut();
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src="/manifest-icon-192.maskable.png" alt="logo"/>
        Chat Aja
        {btnVisible && <button onClick={installApp}>download</button>}
        <SignOut signOut={signOut} auth={auth} />
      </header>
      <section>
        { userActive ? <ChatRoom /> : <SignIn signInWithGoogle={signInWithGoogle} />}
      </section>
    </div>
  );
}

function ChatRoom() {
  const dummy = useRef();
  const inputRef = useRef();
  const messageRef = collection(db, 'messages');
  const q = query(messageRef, orderBy('createdAt'));
  const storage = getStorage();

  const [messages] = useCollectionData(q, { idField: 'id' });
  useEffect(() => {
    if (messages) {
      if (auth?.currentUser?.uid !== messages[messages.length -1]?.uid) {
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
    const inputFile = e.target.files[0];
    const fileFormat = inputFile.name.slice(inputFile.name.length - 4).toLowerCase();
    if (fileFormat === '.png' || fileFormat === '.jpg' || fileFormat === 'jpeg' ) {
      const storageRef = ref(storage, inputFile.name + new Date().getTime());
      let data = new FormData();
      data.append('files',inputFile)
      await uploadBytes(storageRef, inputFile);
      let imageURL = '';
      await getDownloadURL(storageRef);
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

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} auth={auth} />)}

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

export default App;
