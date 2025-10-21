// Add this at the TOP of your script.js file (before Firebase imports)

// Splash Screen Controller
window.addEventListener('load', () => {
  const splashScreen = document.getElementById('splash-screen');
  
  // Wait for animation to complete (2.5 seconds total)
  setTimeout(() => {
    splashScreen.classList.add('fade-out');
    
    // Remove splash screen from DOM after fade out
    setTimeout(() => {
      splashScreen.remove();
    }, 600);
  }, 2500);
});
// --- Import Firebase SDKs ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- Import Firebase SDKs ---

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCbR8QP9T6VMHxUuoggj9QtGo1miS81yC4",
  authDomain: "se-16b-schedular.firebaseapp.com",
  projectId: "se-16b-schedular",
  storageBucket: "se-16b-schedular.firebasestorage.app",
  messagingSenderId: "672415806987",
  appId: "1:672415806987:web:56642840218108baf0790e"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Admin Password ---
//Not needed now cuz its now used firebase auth

// --- Select Elements ---
const eventForm = document.getElementById('eventForm');
const eventList = document.getElementById('eventList');
const adminPanel = document.getElementById('admin-panel');
const loginModal = document.getElementById('loginModal');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const closeModal = document.querySelector('.close-modal');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('adminPassword');
const emailInput = document.getElementById('adminEmail');
const logoutBtn = document.getElementById('logoutBtn');
const categoryBtns = document.querySelectorAll('.category-btn');

// --- State ---
let isAdmin = sessionStorage.getItem('isAdmin') === 'true';
let currentCategory = 'all';
let countdownInterval;
let isEditMode = false;
let editingEventId = null;
let lastVisitTime = localStorage.getItem('lastVisitTime') || 0; //to save the last visited time

// --- Initialize UI ---
function initializeUI() {
  // We don't need to check sessionStorage anymore.
  // The onAuthStateChanged listener above does all the work!

  // We also don't need to call loadEvents() here, 
  // because onAuthStateChanged calls it for us.

  startCountdownUpdates();
  // We use setTimeout to save it after 1 second
  setTimeout(() => {
    localStorage.setItem('lastVisitTime', new Date().getTime());
  }, 1000);
}

// --- Show Admin View ---
function showAdminView() {
  adminPanel.style.display = 'block';
  adminLoginBtn.style.display = 'none';
  logoutBtn.style.display = 'inline-block';
}

// --- Show Student View ---
function showStudentView() {
  adminPanel.style.display = 'none';
  adminLoginBtn.style.display = 'inline-block';
  logoutBtn.style.display = 'none';
}

// --- Open Login Modal ---
adminLoginBtn.addEventListener('click', () => {
  loginModal.style.display = 'flex';
  passwordInput.focus();
});

// --- Close Login Modal ---
closeModal.addEventListener('click', () => {
  loginModal.style.display = 'none';
  passwordInput.value = '';
});

// Close modal when clicking outside
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.style.display = 'none';
    passwordInput.value = '';
  }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && loginModal.style.display === 'flex') {
    loginModal.style.display = 'none';
    passwordInput.value = '';
  }
});

// --- Login Handler ---
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    // This is the new Firebase login function
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // We don't need to check the password here. Firebase does it.
    // We will check if they are an ADMIN in the new listener (Step 5.5)

    console.log('Login successful:', userCredential.user.email);
    loginModal.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';

  } catch (error) {
    console.error("Login failed:", error.message);
    alert('❌ Login failed! Check your email or password.');
    passwordInput.value = '';
    passwordInput.focus();
  }
});

// Allow Enter key to submit password
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

// --- Logout Handler ---
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth); // This is the new Firebase logout
    console.log('User signed out.');

    // We don't need to manually set isAdmin or reload.
    // The listener in the next step will handle it all.

  } catch (error) {
    console.error("Sign out failed:", error);
  }
});

// --- Listens for Login/Logout State Changes ---
onAuthStateChanged(auth, (user) => {

  // Put your 3 Admin UIDs here!
  const ADMIN_UIDS = [
    'd8wZidDzSiOcOhdziF06mcPF5o52', 
    'hdPYYzaLiBRxw5cDcy5hqdwcpDJ2',
    'iQfW7F9fJqYRLkWPc18sD92nSMA3' 
    //paste others UID here in single quotes
  ];

  if (user && ADMIN_UIDS.includes(user.uid)) {
    // --- USER IS LOGGED IN *AND* IS AN ADMIN ---
    console.log('Admin user is logged in:', user.email);
    isAdmin = true;
    showAdminView();

  } else {
    // --- USER IS LOGGED OUT OR IS NOT AN ADMIN ---
    if (user) {
      console.log('User is logged in, but is not an admin:', user.email);
    } else {
      console.log('User is logged out.');
    }
    isAdmin = false;
    showStudentView();
  }

  // Now that we know if they are an admin or not,
  // load the events (so the edit/delete buttons show or hide)
  loadEvents(); 
});

// --- Category Filter ---
categoryBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    loadEvents();
  });
});

// --- Submit Form ---
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('eventTitle').value.trim();
  const dateTime = document.getElementById('eventDateTime').value;
  const poster = document.getElementById('posterName').value.trim();
  const description = document.getElementById('eventDescription').value.trim();
  const category = document.getElementById('eventCategory').value;

  if (!title || !dateTime || !poster || !category) {
    alert('Please fill in all required fields!');
    return;
  }

  try {
    if (isEditMode && editingEventId) {
      // Update existing event
      await updateDoc(doc(db, "events", editingEventId), {
        title,
        dateTime,
        poster,
        description,
        category,
        updatedAt: new Date()
      });
      alert("✅ Event updated successfully!");
      cancelEdit();
    } else {
      // Add new event
      await addDoc(collection(db, "events"), {
        title,
        dateTime,
        poster,
        description,
        category,
        createdAt: new Date()
      });
      alert("✅ Event added successfully!");
    }
    eventForm.reset();
    loadEvents();
  } catch (error) {
    console.error("❌ Error saving event:", error);
    alert("Error saving event. Check console for details.");
  }
});

// --- Load Events from Firestore ---
async function loadEvents() {
  try {
    eventList.innerHTML = "<p>Loading events...</p>";

    const now = new Date();
    const q = query(collection(db, "events"), orderBy("dateTime"));
    const querySnapshot = await getDocs(q);

    eventList.innerHTML = "";

    let filteredEvents = [];

    querySnapshot.forEach((docSnap) => {
      const event = docSnap.data();
      const eventId = docSnap.id;
      const eventDate = new Date(event.dateTime);
      // Get the event's creation time, default to 0 if it doesn't exist
      const eventCreationTime = event.createdAt ? event.createdAt.toMillis() : 0;
      // Compare it to the user's last visit
      const isNew = eventCreationTime > lastVisitTime;

      // Only show upcoming events (not past)
      if (eventDate > now) {
        // Filter by category
        if (currentCategory === 'all' || event.category === currentCategory) {
          filteredEvents.push({ event, eventId, eventDate });
        }
      }
    });

    if (filteredEvents.length === 0) {
      eventList.innerHTML = "<p>No upcoming events in this category.</p>";
      return;
    }

    filteredEvents.forEach(({ event, eventId, eventDate }) => {
      displayEvent(event, eventId, eventDate);
    });
  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventList.innerHTML = "<p>Error loading events. Check Firestore rules.</p>";
  }
}

// --- Display Single Event ---
function displayEvent(event, eventId, eventDate, isNew) {
  const eventCard = document.createElement('div');
  eventCard.classList.add('event-card');
  eventCard.dataset.eventId = eventId;
  eventCard.dataset.eventTime = eventDate.getTime();

  const categoryClass = event.category || 'others';
  eventCard.classList.add(`category-${categoryClass}`);

  const formattedDate = eventDate.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const countdown = getCountdown(eventDate);
  const isUrgent = countdown.isLastHour;

  // Build admin buttons HTML
  let adminButtons = '';
  if (isAdmin) {
    adminButtons = `
      <button class="edit-btn" title="Edit event">✏️</button>
      <button class="delete-btn" title="Delete event">🗑️</button>
    `;
  }
  const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';

  eventCard.innerHTML = `
    ${adminButtons}
    <span class="category-badge">${getCategoryLabel(event.category)}</span>
    ${isUrgent ? '<span class="urgent-badge">⚠️ LAST HOUR!</span>' : ''}
    <div class="event-title">${event.title}</div>
    <div class="event-datetime">📅 ${formattedDate}</div>
    <div class="countdown" data-target="${eventDate.getTime()}">
      ⏱️ ${countdown.text}
    </div>
    <div class="event-poster">👤 ${event.poster}</div>
    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
  `;

  if (isUrgent) {
    eventCard.classList.add('urgent');
  }

  // Add event listeners for admin buttons
  if (isAdmin) {
    const deleteBtn = eventCard.querySelector('.delete-btn');
    const editBtn = eventCard.querySelector('.edit-btn');
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEvent(eventId);
      });
    }
    
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editEvent(eventId, event);
      });
    }
  }

  eventList.appendChild(eventCard);
}

// --- Get Countdown Text ---
function getCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    return { text: "Event started!", isLastHour: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const isLastHour = diff <= 60 * 60 * 1000; // Less than 1 hour

  let text = "";
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else {
    text = `${minutes}m`;
  }

  return { text: text + " left", isLastHour };
}

// --- Get Category Label ---
function getCategoryLabel(category) {
  const labels = {
    'quiz': '📝 Quiz',
    'makeup': '📚 Makeup',
    'assignment': '📋 Assignment',
    'others': '📌 Others'
  };
  return labels[category] || '📌 Others';
}

// --- Update All Countdowns ---
function updateCountdowns() {
  const countdownElements = document.querySelectorAll('.countdown');
  const now = new Date();

  countdownElements.forEach(el => {
    const targetTime = parseInt(el.dataset.target);
    const targetDate = new Date(targetTime);
    const countdown = getCountdown(targetDate);
    
    el.textContent = `⏱️ ${countdown.text}`;

    // Check if event should be removed (past events)
    const eventCard = el.closest('.event-card');
    if (targetDate <= now) {
      eventCard.style.opacity = '0';
      setTimeout(() => {
        eventCard.remove();
        if (eventList.children.length === 0) {
          eventList.innerHTML = "<p>No upcoming events in this category.</p>";
        }
      }, 500);
    }

    // Add urgent class if in last hour
    if (countdown.isLastHour && !eventCard.classList.contains('urgent')) {
      eventCard.classList.add('urgent');
      const urgentBadge = document.createElement('span');
      urgentBadge.className = 'urgent-badge';
      urgentBadge.textContent = '⚠️ LAST HOUR!';
      const categoryBadge = eventCard.querySelector('.category-badge');
      if (categoryBadge) {
        categoryBadge.after(urgentBadge);
      }
    }
  });
}

// --- Start Countdown Updates ---
function startCountdownUpdates() {
  // Update every 10 seconds
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdowns, 10000);
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

// --- Edit Event ---
function editEvent(eventId, event) {
  isEditMode = true;
  editingEventId = eventId;

  // Populate form with existing data
  document.getElementById('eventTitle').value = event.title;
  document.getElementById('eventCategory').value = event.category;
  document.getElementById('eventDateTime').value = event.dateTime;
  document.getElementById('posterName').value = event.poster;
  document.getElementById('eventDescription').value = event.description || '';

  // Update form UI
  const formTitle = document.querySelector('#admin-panel h2');
  formTitle.textContent = '✏️ Edit Event';
  
  const submitBtn = document.querySelector('#eventForm button[type="submit"]');
  submitBtn.textContent = 'Update Event';
  submitBtn.style.background = 'linear-gradient(45deg, #ff9800, #ff5722)';

  // Add cancel button if not exists
  if (!document.getElementById('cancelEditBtn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancelEditBtn';
    cancelBtn.textContent = 'Cancel Edit';
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.marginTop = '0.5rem';
    cancelBtn.addEventListener('click', cancelEdit);
    submitBtn.after(cancelBtn);
  }

  // Scroll to form
  adminPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- Cancel Edit ---
function cancelEdit() {
  isEditMode = false;
  editingEventId = null;

  // Reset form
  eventForm.reset();

  // Reset form UI
  const formTitle = document.querySelector('#admin-panel h2');
  formTitle.textContent = 'Add New Event';
  
  const submitBtn = document.querySelector('#eventForm button[type="submit"]');
  submitBtn.textContent = 'Add Event';
  submitBtn.style.background = 'linear-gradient(45deg, #00bcd4, #009688)';

  // Remove cancel button
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) cancelBtn.remove();
}

// --- Initialize on page load ---
initializeUI();

// --- Register Service Worker ---
// This tells the browser to use our update rules
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered!');
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}