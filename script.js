// --- Import Firebase SDKs ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Admin Password (Change this to whatever you want) ---
const ADMIN_PASSWORD = "SE16B2025";

// --- Select Elements ---
const eventForm = document.getElementById('eventForm');
const eventList = document.getElementById('eventList');
const adminPanel = document.getElementById('admin-panel');
const loginSection = document.getElementById('login-section');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('adminPassword');
const logoutBtn = document.getElementById('logoutBtn');

// --- Check if already logged in ---
let isAdmin = sessionStorage.getItem('isAdmin') === 'true';

// --- Initialize UI ---
function initializeUI() {
  if (isAdmin) {
    showAdminView();
  } else {
    showStudentView();
  }
  loadEvents();
}

// --- Show Admin View ---
function showAdminView() {
  adminPanel.style.display = 'block';
  loginSection.style.display = 'none';
  logoutBtn.style.display = 'inline-block';
}

// --- Show Student View ---
function showStudentView() {
  adminPanel.style.display = 'none';
  loginSection.style.display = 'block';
  logoutBtn.style.display = 'none';
}

// --- Login Handler ---
loginBtn.addEventListener('click', () => {
  const enteredPassword = passwordInput.value;
  
  if (enteredPassword === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem('isAdmin', 'true');
    showAdminView();
    passwordInput.value = '';
    alert('✅ Admin access granted!');
  } else {
    alert('❌ Incorrect password!');
    passwordInput.value = '';
  }
});

// --- Logout Handler ---
logoutBtn.addEventListener('click', () => {
  isAdmin = false;
  sessionStorage.removeItem('isAdmin');
  showStudentView();
  alert('✅ Logged out successfully!');
});

// --- Submit Form ---
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('eventTitle').value.trim();
  const dateTime = document.getElementById('eventDateTime').value;
  const poster = document.getElementById('posterName').value.trim();
  const description = document.getElementById('eventDescription').value.trim();

  if (!title || !dateTime || !poster) {
    alert('Please fill in all required fields!');
    return;
  }

  try {
    await addDoc(collection(db, "events"), {
      title,
      dateTime,
      poster,
      description,
      createdAt: new Date()
    });
    alert("✅ Event added successfully!");
    eventForm.reset();
    loadEvents();
  } catch (error) {
    console.error("❌ Error adding event:", error);
    alert("Error adding event. Check console for details.");
  }
});

// --- Load Events from Firestore ---
async function loadEvents() {
  try {
    eventList.innerHTML = "<p>Loading events...</p>";

    const q = query(collection(db, "events"), orderBy("dateTime"));
    const querySnapshot = await getDocs(q);

    eventList.innerHTML = "";

    if (querySnapshot.empty) {
      eventList.innerHTML = "<p>No events yet. Add your first event!</p>";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const event = docSnap.data();
      const eventId = docSnap.id;
      displayEvent(event, eventId);
    });
  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventList.innerHTML = "<p>Error loading events. Check Firestore rules.</p>";
  }
}

// --- Display Single Event ---
function displayEvent(event, eventId) {
  const eventCard = document.createElement('div');
  eventCard.classList.add('event-card');

  const date = new Date(event.dateTime);
  const formattedDate = date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  eventCard.innerHTML = `
    ${isAdmin ? `<button class="delete-btn" data-id="${eventId}" title="Delete event">❌</button>` : ''}
    <div class="event-title">${event.title}</div>
    <div class="event-datetime">📅 ${formattedDate}</div>
    <div class="event-poster">👤 ${event.poster}</div>
    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
  `;

  // Add delete functionality only for admins
  if (isAdmin) {
    const deleteBtn = eventCard.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteEvent(eventId));
  }

  eventList.appendChild(eventCard);
}

// --- Delete Event ---
async function deleteEvent(eventId) {
  const confirmDelete = confirm("Are you sure you want to delete this event?");
  
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "events", eventId));
    alert("✅ Event deleted successfully!");
    loadEvents();
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    alert("Error deleting event. Check console for details.");
  }
}

// --- Initialize on page load ---
initializeUI();