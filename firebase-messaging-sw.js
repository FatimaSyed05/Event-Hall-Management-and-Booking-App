importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC0WGt0mdrmLLr1fx8iuTcMCUWdmNeBV9k",
  authDomain: "eventhallapp-e9546.firebaseapp.com",
  projectId: "eventhallapp-e9546",
  storageBucket: "eventhallapp-e9546.firebasestorage.app",
  messagingSenderId: "239233146037",
  appId: "1:239233146037:web:733909b343b260a56472fc"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    data: payload.data,
  });
});