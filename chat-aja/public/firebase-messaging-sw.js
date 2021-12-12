/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

// Scripts for firebase and firebase messaging
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js");
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js");


const fb = firebase.initializeApp({
  apiKey: "AIzaSyD2M5wCyWvJ5tK38j1WXYyRX9GE9MC5QuU",
  authDomain: "chat-aja-f795f.firebaseapp.com",
  projectId: "chat-aja-f795f",
  storageBucket: "chat-aja-f795f.appspot.com",
  messagingSenderId: "228961367030",
  appId: "1:228961367030:web:70c3866e45e39783494dd7"
});

const messaging = firebase.messaging(fb);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../firebase-messaging-sw.js')
      .then(function(registration) {
        console.log('Registration successful, scope is:', registration.scope);
      }).catch(function(err) {
        console.log('Service worker registration failed, error:', err);
      });
  }

  messaging.onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/logo192.png'
  };
  
  self.registration.showNotification(notificationTitle,
     notificationOptions);
  });