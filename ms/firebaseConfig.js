// firebaseConfig.js

// Cấu hình thông số đám mây kết nối Realtime Database gốc của bạn
export const firebaseConfig = { 
  apiKey: "AIzaSyDErjt9kYyMdyiuFQAi3IhFl0tP4pbT_5A", 
  databaseURL: "https://wolfmessenger-v1-default-rtdb.firebaseio.com", 
  projectId: "wolfmessenger-v1" 
};

// Khởi tạo Firebase core tương thích nếu chưa được nạp
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();