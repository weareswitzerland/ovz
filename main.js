import { birds } from './data/birds.js';
import { locations } from './data/locations.js';

// DOM Elements
const birdListEl = document.getElementById('bird-list');
const searchInput = document.getElementById('search-input');
const navBirds = document.getElementById('nav-birds');
const navMap = document.getElementById('nav-map');
const viewBirds = document.getElementById('view-birds');
const viewMap = document.getElementById('view-map');
const modal = document.getElementById('bird-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const familyFilterEl = document.getElementById('family-filter');

// Add "Show Location" button to modal HTML dynamically or ensure it exists
let modalLocationBtn = document.getElementById('modal-location-btn');
let modalEbirdBtn = document.getElementById('modal-ebird-btn');
const modalActions = document.querySelector('.modal-actions');

if (!modalActions) {
    // Fallback if index.html isn't updated for some reason, though it should be
    console.error("Modal actions container not found");
}

function createModalButton(id, text, className = 'badge') {
    const btn = document.createElement('a'); // Using 'a' for links, but can be button
    btn.id = id;
    btn.className = `modal-btn ${className}`;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    return btn;
}

if (!modalActions.querySelector('#modal-ebird-btn')) {
    modalEbirdBtn = createModalButton('modal-ebird-btn', 'eBird Info', 'btn-secondary');
    modalEbirdBtn.textContent = 'eBird Info 🐦';
    modalActions.appendChild(modalEbirdBtn);
} else {
    modalEbirdBtn = modalActions.querySelector('#modal-ebird-btn');
}

if (!modalActions.querySelector('#modal-location-btn')) {
    modalLocationBtn = document.createElement('button');
    modalLocationBtn.id = 'modal-location-btn';
    modalLocationBtn.className = 'modal-btn btn-primary';
    modalLocationBtn.textContent = 'Show Location 📍';
    modalActions.appendChild(modalLocationBtn);
} else {
    modalLocationBtn = modalActions.querySelector('#modal-location-btn');
}

let mapInitialized = false;
let mapInstance = null;
let currentBirdLocationId = null;
let activeCategory = 'Alle';

// Initialize
function init() {
    renderFamilyFilter();
    applyFilters();
    setupEventListeners();
}

// Render Birds
function renderBirds(list) {
    birdListEl.innerHTML = '';
    list.forEach(bird => {
        const card = document.createElement('div');
        card.className = 'bird-card';
        const initial = bird.name.charAt(0);

        card.innerHTML = `
      <div class="bird-icon">${initial}</div>
      <div class="bird-name">${bird.name}</div>
      <div class="bird-category">${bird.category}</div>
    `;

        card.addEventListener('click', () => openModal(bird));
        birdListEl.appendChild(card);
    });
}

// Generate and Render Family Filter
function renderFamilyFilter() {
    const categories = ['Alle', ...new Set(birds.map(bird => bird.category))].sort();

    familyFilterEl.innerHTML = '';
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${category === activeCategory ? 'active' : ''}`;
        btn.textContent = category;
        btn.addEventListener('click', () => {
            activeCategory = category;
            updateFilterButtons();
            applyFilters();
            // Scroll selected into view if needed
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
        familyFilterEl.appendChild(btn);
    });
}

function updateFilterButtons() {
    const buttons = familyFilterEl.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.textContent === activeCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Apply Filters (Search + Category)
function applyFilters() {
    const term = searchInput.value.toLowerCase();

    const filtered = birds.filter(bird => {
        const matchesSearch = bird.name.toLowerCase().includes(term) ||
            bird.category.toLowerCase().includes(term);
        const matchesCategory = activeCategory === 'Alle' || bird.category === activeCategory;

        return matchesSearch && matchesCategory;
    });

    renderBirds(filtered);
}

// Event Listeners
function setupEventListeners() {
    navBirds.addEventListener('click', () => switchView('birds'));
    navMap.addEventListener('click', () => switchView('map'));

    searchInput.addEventListener('input', (e) => {
        applyFilters();
    });

    closeModalBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
    });

    // Location Button Logic
    modalLocationBtn.addEventListener('click', () => {
        if (currentBirdLocationId) {
            modal.close();
            showLocationOnMap(currentBirdLocationId);
        }
    });
}

// Switch View
function switchView(viewName) {
    if (viewName === 'birds') {
        viewBirds.classList.add('active');
        viewBirds.classList.remove('hidden');
        viewMap.classList.remove('active');
        viewMap.classList.add('hidden');
        navBirds.classList.add('active');
        navMap.classList.remove('active');
    } else {
        viewBirds.classList.remove('active');
        viewBirds.classList.add('hidden');
        viewMap.classList.add('active');
        viewMap.classList.remove('hidden');
        navBirds.classList.remove('active');
        navMap.classList.add('active');

        if (!mapInitialized) {
            initMap();
        } else if (mapInstance) {
            setTimeout(() => mapInstance.invalidateSize(), 100);
        }
    }
}

// Map Initialization
function initMap() {
    mapInstance = L.map('map').setView([47.169, 8.513], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(mapInstance);

    locations.forEach(loc => {
        const marker = L.marker([loc.lat, loc.lng]).addTo(mapInstance);
        marker.bindPopup(`<b>${loc.name}</b><br>${loc.description}`);
        // Store marker reference in location object for zooming
        loc.marker = marker;
    });

    mapInitialized = true;
}

// Show Location Logic
function showLocationOnMap(locationId) {
    switchView('map');

    // Ensure map is initialized if we jump straight here
    if (!mapInitialized) initMap();

    const location = locations.find(l => l.id === locationId);
    if (location) {
        // W