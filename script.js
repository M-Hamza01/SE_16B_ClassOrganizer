// Splash Screen Controller
window.addEventListener('load', () => {
  const splashScreen = document.getElementById('splash-screen');
  
  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('fade-out');
      setTimeout(() => {
        splashScreen.remove();
      }, 600);
    }, 2500);
  }
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
const notificationBanner = document.getElementById('notificationBanner');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationClose = document.querySelector('.notification-close');
const newEventsBadge = document.getElementById('newEventsBadge');

// --- State ---
let isAdmin = false;
let currentCategory = 'all';
let countdownInterval;
let isEditMode = false;
let editingEventId = null;
let lastVisitTime = parseInt(localStorage.getItem('lastVisitTime')) || 0;
let seenEvents = JSON.parse(localStorage.getItem('seenEvents')) || [];

// --- Initialize UI ---
function initializeUI() {
  startCountdownUpdates();
  // Save current visit time after 1 second
  setTimeout(() => {
    localStorage.setItem('lastVisitTime', new Date().getTime().toString());
  }, 1000);
}

// --- Show Admin View ---
function showAdminView() {
  if (adminPanel) adminPanel.style.display = 'block';
  if (adminLoginBtn) adminLoginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'inline-block';
}

// --- Show Student View ---
function showStudentView() {
  if (adminPanel) adminPanel.style.display = 'none';
  if (adminLoginBtn) adminLoginBtn.style.display = 'inline-block';
  if (logoutBtn) logoutBtn.style.display = 'none';
}

// --- Notification Functions ---
function showNotification(title, message, duration = 5000) {
  if (!notificationBanner || !notificationTitle || !notificationMessage) return;
  
  notificationTitle.textContent = title;
  notificationMessage.textContent = message;
  notificationBanner.classList.add('show');

  setTimeout(() => {
    hideNotification();
  }, duration);
}

function hideNotification() {
  if (!notificationBanner) return;
  notificationBanner.classList.remove('show');
}

function updateNewEventsBadge() {
  if (!newEventsBadge) return;
  
  const newEventsCount = document.querySelectorAll('.event-card.new-event').length;
  
  if (newEventsCount > 0) {
    newEventsBadge.textContent = `${newEventsCount} new`;
    newEventsBadge.style.display = 'inline-block';
  } else {
    newEventsBadge.style.display = 'none';
  }
}

function isEventNew(eventId, createdAt) {
  if (seenEvents.includes(eventId)) return false;
  
  const twentyFourHoursAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
  const eventTime = createdAt?.toMillis ? createdAt.toMillis() : new Date(createdAt).getTime();
  
  return eventTime > lastVisitTime && eventTime > twentyFourHoursAgo;
}

function markEventAsSeen(eventId) {
  if (!seenEvents.includes(eventId)) {
    seenEvents.push(eventId);
    localStorage.setItem('seenEvents', JSON.stringify(seenEvents));
    updateNewEventsBadge();
  }
}

// --- Open Login Modal ---
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', () => {
    if (loginModal) {
      loginModal.style.display = 'flex';
      if (emailInput) emailInput.focus();
    }
  });
}

// --- Close Login Modal ---
if (closeModal) {
  closeModal.addEventListener('click', () => {
    if (loginModal) loginModal.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
    if (emailInput) emailInput.value = '';
  });
}

// Close modal when clicking outside
if (loginModal) {
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.style.display = 'none';
      if (passwordInput) passwordInput.value = '';
      if (emailInput) emailInput.value = '';
    }
  });
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && loginModal && loginModal.style.display === 'flex') {
    loginModal.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
    if (emailInput) emailInput.value = '';
  }
});

// --- Notification Close ---
if (notificationClose) {
  notificationClose.addEventListener('click', () => {
    hideNotification();
  });
}

// --- Login Handler ---
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = emailInput?.value;
    const password = passwordInput?.value;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (loginModal) loginModal.style.display = 'none';
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    } catch (error) {
      console.error("Login failed:", error.message);
      alert('❌ Login failed! Check your email or password.');
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
      }
    }
  });
}

// Allow Enter key to submit
if (passwordInput) {
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && loginBtn) loginBtn.click();
  });
}

// --- Logout Handler ---
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  });
}

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
  const ADMIN_UIDS = [
    'd8wZidDzSiOcOhdziF06mcPF5o52', 
    'hdPYYzaLiBRxw5cDcy5hqdwcpDJ2',
    'iQfW7F9fJqYRLkWPc18sD92nSMA3'
  ];

  if (user && ADMIN_UIDS.includes(user.uid)) {
    console.log('Admin user is logged in:', user.email);
    isAdmin = true;
    showAdminView();
  } else {
    if (user) {
      console.log('User is logged in, but is not an admin:', user.email);
    }
    isAdmin = false;
    showStudentView();
  }

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
if (eventForm) {
  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('eventTitle')?.value.trim();
    const dateTime = document.getElementById('eventDateTime')?.value;
    const poster = document.getElementById('posterName')?.value.trim();
    const description = document.getElementById('eventDescription')?.value.trim();
    const category = document.getElementById('eventCategory')?.value;

    if (!title || !dateTime || !poster || !category) {
      alert('Please fill in all required fields!');
      return;
    }

    try {
      if (isEditMode && editingEventId) {
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
        await addDoc(collection(db, "events"), {
          title,
          dateTime,
          poster,
          description,
          category,
          createdAt: new Date()
        });
        
        showNotification(
          '🎉 Event Created!',
          `${getCategoryLabel(category).split(' ')[1]} - ${title} has been added`,
          5000
        );
        
        alert("✅ Event added successfully!");
      }
      eventForm.reset();
      loadEvents();
    } catch (error) {
      console.error("❌ Error saving event:", error);
      alert("Error saving event. Check console for details.");
    }
  });
}

// --- Load Events ---
async function loadEvents() {
  if (!eventList) return;
  
  try {
    eventList.innerHTML = "<p>Loading events...</p>";

    const now = new Date();
    const q = query(collection(db, "events"), orderBy("dateTime"));
    const querySnapshot = await getDocs(q);

    eventList.innerHTML = "";
    let filteredEvents = [];
    let newEventsCount = 0;

    querySnapshot.forEach((docSnap) => {
      const event = docSnap.data();
      const eventId = docSnap.id;
      const eventDate = new Date(event.dateTime);
      const eventIsNew = isEventNew(eventId, event.createdAt);
      
      if (eventIsNew) newEventsCount++;

      if (eventDate > now) {
        if (currentCategory === 'all' || event.category === currentCategory) {
          filteredEvents.push({ event, eventId, eventDate, isNew: eventIsNew });
        }
      }
    });

    // Show notification if there are new events
    if (newEventsCount > 0 && !isAdmin) {
      showNotification(
        'New Events!',
        `You have ${newEventsCount} new event${newEventsCount > 1 ? 's' : ''} to check`,
        12000
      );
    }

    if (filteredEvents.length === 0) {
      eventList.innerHTML = "<p>No upcoming events in this category.</p>";
      updateNewEventsBadge();
      return;
    }

    filteredEvents.forEach(({ event, eventId, eventDate, isNew }) => {
      displayEvent(event, eventId, eventDate, isNew);
    });
    
    updateNewEventsBadge();
  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventList.innerHTML = "<p>Error loading events. Check Firestore rules.</p>";
  }
}

// --- Display Event ---
function displayEvent(event, eventId, eventDate, isNew) {
  const eventCard = document.createElement('div');
  eventCard.classList.add('event-card');
  eventCard.dataset.eventId = eventId;
  eventCard.dataset.eventTime = eventDate.getTime();

  const categoryClass = event.category || 'others';
  eventCard.classList.add(`category-${categoryClass}`);
  
  if (isNew) {
    eventCard.classList.add('new-event');
  }

  const formattedDate = eventDate.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const countdown = getCountdown(eventDate);
  const isUrgent = countdown.isLastHour;

  let adminButtons = '';
  if (isAdmin) {
    adminButtons = `
      <button class="edit-btn" title="Edit event">✏️</button>
      <button class="delete-btn" title="Delete event">🗑️</button>
    `;
  }

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
  
  // Mark as seen when clicked
  eventCard.addEventListener('click', () => {
    if (isNew) {
      markEventAsSeen(eventId);
      eventCard.classList.remove('new-event');
    }
  });

  if (eventList) eventList.appendChild(eventCard);
}

// --- Get Countdown ---
function getCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    return { text: "Event started!", isLastHour: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const isLastHour = diff <= 60 * 60 * 1000;

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

// --- Update Countdowns ---
function updateCountdowns() {
  const countdownElements = document.querySelectorAll('.countdown');
  const now = new Date();

  countdownElements.forEach(el => {
    const targetTime = parseInt(el.dataset.target);
    const targetDate = new Date(targetTime);
    const countdown = getCountdown(targetDate);
    
    el.textContent = `⏱️ ${countdown.text}`;

    const eventCard = el.closest('.event-card');
    if (targetDate <= now) {
      eventCard.style.opacity = '0';
      setTimeout(() => {
        eventCard.remove();
        if (eventList && eventList.children.length === 0) {
          eventList.innerHTML = "<p>No upcoming events in this category.</p>";
        }
      }, 500);
    }

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

  document.getElementById('eventTitle').value = event.title;
  document.getElementById('eventCategory').value = event.category;
  document.getElementById('eventDateTime').value = event.dateTime;
  document.getElementById('posterName').value = event.poster;
  document.getElementById('eventDescription').value = event.description || '';

  const formTitle = document.querySelector('#admin-panel h2');
  if (formTitle) formTitle.textContent = '✏️ Edit Event';
  
  const submitBtn = document.querySelector('#eventForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'Update Event';
    submitBtn.style.background = 'linear-gradient(45deg, #ff9800, #ff5722)';
  }

  if (!document.getElementById('cancelEditBtn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancelEditBtn';
    cancelBtn.textContent = 'Cancel Edit';
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.marginTop = '0.5rem';
    cancelBtn.addEventListener('click', cancelEdit);
    if (submitBtn) submitBtn.after(cancelBtn);
  }

  if (adminPanel) adminPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// --- Cancel Edit ---
function cancelEdit() {
  isEditMode = false;
  editingEventId = null;

  if (eventForm) eventForm.reset();

  const formTitle = document.querySelector('#admin-panel h2');
  if (formTitle) formTitle.textContent = 'Add New Event';
  
  const submitBtn = document.querySelector('#eventForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'Add Event';
    submitBtn.style.background = 'linear-gradient(45deg, #00bcd4, #009688)';
  }

  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) cancelBtn.remove();
}

// --- Initialize ---
initializeUI();