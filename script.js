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
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ImgBB API Key
const IMGBB_API_KEY = 'IMGBB_API_KEY';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "se-16b-schedular.firebaseapp.com",
  projectId: "se-16b-schedular",
  storageBucket: "se-16b-schedular.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Class Configuration ---
const CLASS_CODE = "BA9E00"; // SE 16B class code

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
const timeFilterBtns = document.querySelectorAll('.time-btn');
const eventListTitle = document.querySelector('#events h2');

// Announcement elements
const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
const announcementModal = document.getElementById('announcementModal');
const closeAnnouncementModal = document.getElementById('closeAnnouncementModal');
const announcementForm = document.getElementById('announcementForm');
const carouselTrack = document.getElementById('carouselTrack');
const carouselDots = document.getElementById('carouselDots');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const announcementImage = document.getElementById('announcementImage');
const imagePreview = document.getElementById('imagePreview');

// --- State ---
let isAdmin = false;
let currentCategory = 'all';
let currentTimeFilter = 'upcoming'; // 'upcoming' or 'past'
let countdownInterval;
let isEditMode = false;
let editingEventId = null;
let lastVisitTime = parseInt(localStorage.getItem('lastVisitTime')) || 0;
let seenEvents = JSON.parse(localStorage.getItem('seenEvents')) || [];

// Announcement state
let currentSlide = 0;
let announcements = [];
let autoplayInterval;
let isEditingAnnouncement = false;
let editingAnnouncementId = null;
let uploadedImageFile = null;

// --- Initialize UI ---
function initializeUI() {
  startCountdownUpdates();
  loadAnnouncements();
  setTimeout(() => {
    localStorage.setItem('lastVisitTime', new Date().getTime().toString());
  }, 1000);
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

// --- Admin UI Functions ---
function showAdminView() {
  if (adminPanel) adminPanel.style.display = 'block';
  if (adminLoginBtn) adminLoginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'inline-block';
  if (addAnnouncementBtn) addAnnouncementBtn.style.display = 'inline-block';
}

function showStudentView() {
  if (adminPanel) adminPanel.style.display = 'none';
  if (adminLoginBtn) adminLoginBtn.style.display = 'inline-block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (addAnnouncementBtn) addAnnouncementBtn.style.display = 'none';
}

// --- Modal Handlers ---
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', () => {
    if (loginModal) {
      loginModal.style.display = 'flex';
      if (emailInput) emailInput.focus();
    }
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    if (loginModal) loginModal.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
    if (emailInput) emailInput.value = '';
  });
}

if (loginModal) {
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      loginModal.style.display = 'none';
      if (passwordInput) passwordInput.value = '';
      if (emailInput) emailInput.value = '';
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (loginModal && loginModal.style.display === 'flex') {
      loginModal.style.display = 'none';
      if (passwordInput) passwordInput.value = '';
      if (emailInput) emailInput.value = '';
    }
    if (announcementModal && announcementModal.style.display === 'flex') {
      closeAnnouncementForm();
    }
  }
});

if (notificationClose) {
  notificationClose.addEventListener('click', () => {
    hideNotification();
  });
}

// --- Login/Logout ---
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

if (passwordInput) {
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && loginBtn) loginBtn.click();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  });
}

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
  loadAnnouncements();
});

// --- ANNOUNCEMENT CAROUSEL FUNCTIONS ---

async function loadAnnouncements() {
  try {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    
    announcements = [];
    const now = new Date();
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Filter out expired announcements
      if (data.expiryDate) {
        const expiryDate = data.expiryDate.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
        if (expiryDate < now) {
          console.log('Skipping expired announcement:', data.title);
          return; // Skip expired announcements
        }
      }
      
      announcements.push({
        id: docSnap.id,
        ...data
      });
    });
    
    // Limit to 10 active announcements after filtering
    announcements = announcements.slice(0, 10);

    displayAnnouncements();
    if (announcements.length > 0) {
      startAutoplay();
    }
  } catch (error) {
    console.error("Error loading announcements:", error);
    console.error("Full error details:", error.message, error.code);
  }
}

function displayAnnouncements() {
  if (!carouselTrack) return;

  if (announcements.length === 0) {
    carouselTrack.innerHTML = '<div class="no-announcements"><p>No announcements yet</p></div>';
    if (carouselDots) carouselDots.innerHTML = '';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  carouselTrack.innerHTML = '';
  if (carouselDots) carouselDots.innerHTML = '';

  announcements.forEach((announcement, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    if (index === 0) slide.classList.add('active');

    let imageHTML = '';
    if (announcement.imageUrl) {
      imageHTML = `<img src="${announcement.imageUrl}" alt="${announcement.title}" class="announcement-image">`;
    }

    let linkHTML = '';
    if (announcement.link) {
      const buttonText = announcement.linkButtonText || 'Learn More';
      // Add https:// if protocol is missing
      let url = announcement.link;
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="announcement-link">${buttonText}</a>`;
    }

    let contactHTML = '';
    if (announcement.contactWhatsApp || announcement.contactPhone) {
      contactHTML = '<div class="announcement-contacts">';
      if (announcement.contactWhatsApp) {
        contactHTML += `<a href="https://wa.me/${announcement.contactWhatsApp.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="contact-btn whatsapp-btn">💬 WhatsApp</a>`;
      }
      if (announcement.contactPhone) {
        contactHTML += `<a href="tel:${announcement.contactPhone}" class="contact-btn phone-btn">📞 Call</a>`;
      }
      contactHTML += '</div>';
    }

    let actionsHTML = '';
    if (isAdmin) {
      actionsHTML = `
        <div class="announcement-actions">
          <button class="edit-announcement-btn" data-id="${announcement.id}">✏️</button>
          <button class="delete-announcement-btn" data-id="${announcement.id}">🗑️</button>
        </div>
      `;
    }

    slide.innerHTML = `
      ${actionsHTML}
      ${imageHTML}
      <div class="announcement-content">
        <h3 class="announcement-title">${announcement.title}</h3>
        ${announcement.description ? `<p class="announcement-description">${announcement.description}</p>` : ''}
        ${linkHTML}
        ${contactHTML}
      </div>
    `;

    carouselTrack.appendChild(slide);

    // Dots
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(index));
    if (carouselDots) carouselDots.appendChild(dot);
  });

  // Add event listeners for admin buttons
  if (isAdmin) {
    document.querySelectorAll('.edit-announcement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        editAnnouncement(id);
      });
    });

    document.querySelectorAll('.delete-announcement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        deleteAnnouncement(id);
      });
    });
  }

  if (prevBtn) prevBtn.disabled = false;
  if (nextBtn) nextBtn.disabled = false;
}

function goToSlide(index) {
  if (index < 0 || index >= announcements.length) return;

  currentSlide = index;
  const offset = -currentSlide * 100;
  if (carouselTrack) carouselTrack.style.transform = `translateX(${offset}%)`;

  document.querySelectorAll('.carousel-slide').forEach((slide, i) => {
    slide.classList.toggle('active', i === currentSlide);
  });

  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function nextSlide() {
  const nextIndex = (currentSlide + 1) % announcements.length;
  goToSlide(nextIndex);
}

function prevSlide() {
  const prevIndex = (currentSlide - 1 + announcements.length) % announcements.length;
  goToSlide(prevIndex);
}

function startAutoplay() {
  stopAutoplay();
  autoplayInterval = setInterval(() => {
    nextSlide();
  }, 6000); // 6 seconds
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
}

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    prevSlide();
    stopAutoplay();
    startAutoplay();
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    nextSlide();
    stopAutoplay();
    startAutoplay();
  });
}

// Pause autoplay on hover
if (carouselTrack) {
  carouselTrack.addEventListener('mouseenter', stopAutoplay);
  carouselTrack.addEventListener('mouseleave', () => {
    if (announcements.length > 0) startAutoplay();
  });

  // Touch/tap to pause (mobile)
  let touchStartX = 0;
  let touchEndX = 0;
  let isPaused = false;

  carouselTrack.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stopAutoplay();
  });

  carouselTrack.addEventListener('touchmove', (e) => {
    touchEndX = e.touches[0].clientX;
  });

  carouselTrack.addEventListener('touchend', () => {
    const swipeDistance = touchStartX - touchEndX;
    
    // Swipe left (next)
    if (swipeDistance > 50) {
      nextSlide();
    }
    // Swipe right (previous)
    else if (swipeDistance < -50) {
      prevSlide();
    }
    
    // Resume autoplay after 3 seconds of inactivity
    setTimeout(() => {
      if (announcements.length > 0) startAutoplay();
    }, 3000);
  });

  // Tap to pause/resume
  carouselTrack.addEventListener('click', (e) => {
    // Don't interfere with button clicks
    if (e.target.closest('button') || e.target.closest('a')) return;
    
    if (autoplayInterval) {
      stopAutoplay();
      isPaused = true;
      // Show pause indicator
      const pauseIndicator = document.createElement('div');
      pauseIndicator.className = 'pause-indicator';
      pauseIndicator.textContent = '⏸';
      pauseIndicator.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:3rem;opacity:0.8;pointer-events:none;z-index:100;';
      carouselTrack.style.position = 'relative';
      carouselTrack.appendChild(pauseIndicator);
      
      setTimeout(() => pauseIndicator.remove(), 800);
    } else if (isPaused) {
      startAutoplay();
      isPaused = false;
      // Show play indicator
      const playIndicator = document.createElement('div');
      playIndicator.className = 'play-indicator';
      playIndicator.textContent = '▶';
      playIndicator.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:3rem;opacity:0.8;pointer-events:none;z-index:100;';
      carouselTrack.style.position = 'relative';
      carouselTrack.appendChild(playIndicator);
      
      setTimeout(() => playIndicator.remove(), 800);
    }
  });
}

// --- ANNOUNCEMENT FORM ---

if (addAnnouncementBtn) {
  addAnnouncementBtn.addEventListener('click', () => {
    openAnnouncementForm();
  });
}

if (closeAnnouncementModal) {
  closeAnnouncementModal.addEventListener('click', () => {
    closeAnnouncementForm();
  });
}

if (announcementModal) {
  announcementModal.addEventListener('click', (e) => {
    if (e.target === announcementModal) {
      closeAnnouncementForm();
    }
  });
}

if (document.getElementById('cancelAnnouncementBtn')) {
  document.getElementById('cancelAnnouncementBtn').addEventListener('click', () => {
    closeAnnouncementForm();
  });
}

if (announcementImage) {
  announcementImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedImageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (imagePreview) {
          imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

function openAnnouncementForm() {
  isEditingAnnouncement = false;
  editingAnnouncementId = null;
  uploadedImageFile = null;
  
  if (announcementForm) announcementForm.reset();
  if (imagePreview) imagePreview.innerHTML = '';
  
  const formTitle = document.getElementById('announcementFormTitle');
  if (formTitle) formTitle.textContent = 'Add Announcement';
  
  const submitBtn = document.getElementById('submitAnnouncementBtn');
  if (submitBtn) submitBtn.textContent = 'Add Announcement';
  
  if (announcementModal) announcementModal.style.display = 'flex';
}

function closeAnnouncementForm() {
  if (announcementModal) announcementModal.style.display = 'none';
  if (announcementForm) announcementForm.reset();
  if (imagePreview) imagePreview.innerHTML = '';
  isEditingAnnouncement = false;
  editingAnnouncementId = null;
  uploadedImageFile = null;
}

if (announcementForm) {
  announcementForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('announcementTitle')?.value.trim();
    const description = document.getElementById('announcementDescription')?.value.trim();
    const link = document.getElementById('announcementLink')?.value.trim();
    const linkButtonText = document.getElementById('announcementLinkButtonText')?.value.trim();
    const contactPhone = document.getElementById('announcementContactPhone')?.value.trim();
    const contactWhatsApp = document.getElementById('announcementContactWhatsApp')?.value.trim();
    const durationDays = parseInt(document.getElementById('announcementDurationDays')?.value) || 7;

    if (!title) {
      alert('Please enter a title!');
      return;
    }

    if (announcements.length >= 10 && !isEditingAnnouncement) {
      alert('Maximum 10 announcements allowed. Please delete some old ones first.');
      return;
    }

    try {
      let imageUrl = '';

      // Upload image to ImgBB if provided
      if (uploadedImageFile) {
        const formData = new FormData();
        formData.append('image', uploadedImageFile);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          imageUrl = data.data.url;
        } else {
          throw new Error('Image upload failed');
        }
      }

      // Calculate expiry date
      const now = new Date();
      const expiryDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));

      const announcementData = {
        title,
        description: description || '',
        link: link || '',
        linkButtonText: linkButtonText || '',
        contactPhone: contactPhone || '',
        contactWhatsApp: contactWhatsApp || '',
        durationDays,
        expiryDate,
        imageUrl: imageUrl || (isEditingAnnouncement ? announcements.find(a => a.id === editingAnnouncementId)?.imageUrl || '' : ''),
        createdAt: isEditingAnnouncement ? announcements.find(a => a.id === editingAnnouncementId)?.createdAt : new Date()
      };

      if (isEditingAnnouncement && editingAnnouncementId) {
        await updateDoc(doc(db, "announcements", editingAnnouncementId), announcementData);
        showNotification('✅ Updated!', 'Announcement updated successfully');
      } else {
        await addDoc(collection(db, "announcements"), announcementData);
        showNotification('🎉 Added!', 'New announcement added successfully');
      }

      closeAnnouncementForm();
      loadAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert('Error saving announcement. Check console.');
    }
  });
}

async function editAnnouncement(id) {
  const announcement = announcements.find(a => a.id === id);
  if (!announcement) return;

  isEditingAnnouncement = true;
  editingAnnouncementId = id;

  document.getElementById('announcementTitle').value = announcement.title;
  document.getElementById('announcementDescription').value = announcement.description || '';
  document.getElementById('announcementLink').value = announcement.link || '';
  document.getElementById('announcementLinkButtonText').value = announcement.linkButtonText || '';
  document.getElementById('announcementContactPhone').value = announcement.contactPhone || '';
  document.getElementById('announcementContactWhatsApp').value = announcement.contactWhatsApp || '';
  document.getElementById('announcementDurationDays').value = announcement.durationDays || 7;

  if (announcement.imageUrl && imagePreview) {
    imagePreview.innerHTML = `<img src="${announcement.imageUrl}" alt="Current">`;
  }

  const formTitle = document.getElementById('announcementFormTitle');
  if (formTitle) formTitle.textContent = 'Edit Announcement';

  const submitBtn = document.getElementById('submitAnnouncementBtn');
  if (submitBtn) submitBtn.textContent = 'Update Announcement';

  if (announcementModal) announcementModal.style.display = 'flex';
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;

  try {
    // Note: Images on ImgBB stay there (no delete API in free tier)
    // This is fine - they don't count against your quota
    await deleteDoc(doc(db, "announcements", id));
    showNotification('🗑️ Deleted!', 'Announcement deleted');
    loadAnnouncements();
  } catch (error) {
    console.error("Error deleting announcement:", error);
    alert('Error deleting announcement.');
  }
}

// --- EVENTS FUNCTIONALITY ---

categoryBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    categoryBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    loadEvents();
  });
});
// --- NEW: TIME FILTER LOGIC ---
timeFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    timeFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTimeFilter = btn.dataset.filter;
    if (currentTimeFilter === 'upcoming') {
      eventListTitle.textContent = 'Upcoming Events';
    } else {
      eventListTitle.textContent = 'Finished';
    }
    loadEvents(); // Reload events with the new time filter
  });
});

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
        await updateDoc(doc(db, `classes/${CLASS_CODE}/events`, editingEventId), {
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
        await addDoc(collection(db, `classes/${CLASS_CODE}/events`), {
          title,
          dateTime,
          poster,
          description,
          category,
          createdAt: new Date()
        });
        
        showNotification(
          '🎉 Event Created!',
          `${getCategoryLabel(category).split(' ')[0]} - ${title} has been added`,
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

// --- MODIFIED FUNCTION ---
async function loadEvents() {
  if (!eventList) return;
  
  try {
    eventList.innerHTML = "<p>Loading events...</p>";

    const now = new Date();
    // This is our 24-hour cutoff
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Query is simpler: just get events and order by date
    const q = query(collection(db, `classes/${CLASS_CODE}/events`), orderBy("dateTime"));
    const querySnapshot = await getDocs(q);

    let upcomingEvents = [];
    let pastEvents = [];
    let newEventsCount = 0;

    querySnapshot.forEach((docSnap) => {
      const event = docSnap.data();
      const eventId = docSnap.id;
      const eventDate = new Date(event.dateTime);

      // --- NEW LOGIC IS HERE ---
      if (eventDate < oneDayAgo) {
        // Event is MORE than 1 day old, auto-delete it.
        console.log(`Auto-deleting event older than 24h: ${event.title}`);
        // This is "fire and forget" - we don't wait for it to finish.
        deleteDoc(doc(db, `classes/${CLASS_CODE}/events`, eventId))
          .catch(err => console.error("Error auto-deleting event:", eventId, err));

      } else if (eventDate < now) {
        // Event is in the past, but LESS than 1 day old.
        const eventData = { event, eventId, eventDate, isNew: false };
        pastEvents.push(eventData);

      } else {
        // Event is in the future.
        const eventIsNew = isEventNew(eventId, event.createdAt);
        if (eventIsNew) newEventsCount++;
        const eventData = { event, eventId, eventDate, isNew: eventIsNew };
        upcomingEvents.push(eventData);
      }
      // --- END OF NEW LOGIC ---
    });

    // Show new event notification only for upcoming events
    if (newEventsCount > 0 && !isAdmin && currentTimeFilter === 'upcoming') {
      showNotification(
        '🆕 New Events!',
        `You have ${newEventsCount} new event${newEventsCount > 1 ? 's' : ''} to check`,
        6000
      );
    }

    let eventsToDisplay = [];

    if (currentTimeFilter === 'upcoming') {
      eventsToDisplay = upcomingEvents;
      // Already sorted oldest-to-newest by query
    } else {
      eventsToDisplay = pastEvents.sort((a, b) => b.eventDate - a.eventDate);
      // Sort past events newest-to-oldest
    }

    // Now, filter by category
    const filteredEvents = eventsToDisplay.filter(({ event }) => {
      return currentCategory === 'all' || event.category === currentCategory;
    });

    // Clear list
    eventList.innerHTML = "";

    if (filteredEvents.length === 0) {
      if (currentTimeFilter === 'upcoming') {
        eventList.innerHTML = "<p>No upcoming events in this category.</p>";
      } else {
        // This message now means "no events from the last 24h"
        eventList.innerHTML = "<p>No past events found in this category.</p>";
      }
      updateNewEventsBadge();
      return;
    }

    filteredEvents.forEach(({ event, eventId, eventDate, isNew }) => {
      // Only pass 'isNew' if we are in the upcoming view
      displayEvent(event, eventId, eventDate, currentTimeFilter === 'upcoming' && isNew);
    });
    
    // Update badge (it will correctly count 0 if in 'past' view)
    updateNewEventsBadge();

  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventList.innerHTML = "<p>Error loading events. Check Firestore rules.</p>";
  }
}

// --- MODIFIED FUNCTION ---
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

  // --- MODIFIED COUNTDOWN/URGENT LOGIC ---
  const now = new Date();
  const isPastEvent = eventDate <= now;
  let countdownHTML = '';
  let isUrgent = false;

  if (isPastEvent) {
    // Event is in the past, show "Completed"
    countdownHTML = `<div class="countdown past">✅ Completed</div>`;
  } else {
    // Event is in the future, show countdown
    const countdown = getCountdown(eventDate);
    isUrgent = countdown.isLastHour;
    countdownHTML = `
      <div class="countdown" data-target="${eventDate.getTime()}">
        ⏱️ ${countdown.text}
      </div>
    `;
  }
  // --- END MODIFIED LOGIC ---

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
    ${countdownHTML}
    <div class="event-poster">👤 ${event.poster}</div>
    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
  `;

  if (isUrgent) {
    eventCard.classList.add('urgent');
  }

  if (isAdmin) {
    // ... (Your existing deleteBtn and editBtn logic remains unchanged)
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
  
  eventCard.addEventListener('click', () => {
    if (isNew) {
      markEventAsSeen(eventId);
      eventCard.classList.remove('new-event');
    }
  });

  if (eventList) eventList.appendChild(eventCard);
}

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

function getCategoryLabel(category) {
  const labels = {
    'quiz': '📝 Quiz',
    'makeup': '📚 Makeup',
    'assignment': '📋 Assignment',
    'lab' : '🔬 Lab',
    'others': '📌 Others'
    
  };
  return labels[category] || 'Others';
}

function updateCountdowns() {
  if (currentTimeFilter === 'past') return;
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

function startCountdownUpdates() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdowns, 10000);
}

async function deleteEvent(eventId) {
  const confirmDelete = confirm("Are you sure you want to delete this event?");
  
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, `classes/${CLASS_CODE}/events`, eventId));
    alert("✅ Event deleted successfully!");
    loadEvents();
  } catch (error) {
    console.error("❌ Error deleting event:", error);
    alert("Error deleting event. Check console for details.");
  }
}

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
