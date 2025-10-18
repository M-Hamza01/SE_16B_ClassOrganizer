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

// --- Admin Password ---
const ADMIN_PASSWORD = "SE16B2025";

// --- Select Elements ---
const eventForm = document.getElementById('eventForm');
const eventList = document.getElementById('eventList');
const adminPanel = document.getElementById('admin-panel');
const loginSection = document.getElementById('login-section');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('adminPassword');
const logoutBtn = document.getElementById('logoutBtn');
const categoryBtns = document.querySelectorAll('.category-btn');

// --- State ---
let isAdmin = sessionStorage.getItem('isAdmin') === 'true';
let currentCategory = 'all';
let countdownInterval;
let isEditMode = false;
let editingEventId = null;

// --- Initialize UI ---
function initializeUI() {
  if (isAdmin) {
    showAdminView();
  } else {
    showStudentView();
  }
  loadEvents();
  startCountdownUpdates();
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
    loadEvents(); // Reload to show edit/delete buttons
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
  cancelEdit(); // Cancel any ongoing edits
  alert('✅ Logged out successfully!');
  loadEvents(); // Reload to hide edit/delete buttons
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
function displayEvent(event, eventId, eventDate) {
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