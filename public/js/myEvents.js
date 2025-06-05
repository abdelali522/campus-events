// public/js/myEvents.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('[myEvents.js] Script loaded.');
    console.log('[myEvents.js] initialRegisteredEvents received:', typeof initialRegisteredEvents !== 'undefined' ? initialRegisteredEvents : 'Not provided');
    console.log('[myEvents.js] initialCreatedEvents received:', typeof initialCreatedEvents !== 'undefined' ? initialCreatedEvents : 'Not provided');

    function formatDate(dateString) {
        if (!dateString) return 'Date not set';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function formatTime(timeStringOrDate) { // Can accept full datetime string or just time string
        if (!timeStringOrDate) return 'Time TBD';
        // Check if it's already just a time string (e.g., "2:00 PM")
        if (typeof timeStringOrDate === 'string' && timeStringOrDate.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
            return timeStringOrDate;
        }
        const date = new Date(timeStringOrDate);
        if (isNaN(date.getTime())) return 'Invalid Time';
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function createCardHTML(event, isCreatedEvent) {
        const categoryClass = event.category ? event.category.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'other';
        const categoryColor = event.category_color || '#6c757d'; // Default color if none provided
        const defaultImage = `https://placehold.co/350x150/${categoryColor.substring(1)}/ffffff?text=${encodeURIComponent(event.category || 'Event')}&font=roboto`;
        const imageSrc = event.event_image_url || defaultImage;

        let actionsHtml = '';
        if (isCreatedEvent) {
            actionsHtml = `
                <button class="btn btn-primary btn-sm" onclick="editEvent(${event.id})">✏️ Edit</button>
                <button class="btn btn-secondary btn-sm" onclick="viewRegistrations(${event.id})">👥 Registrations</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">🗑️ Delete</button>
            `;
        } else {
            actionsHtml = `
                <button class="btn btn-primary btn-sm" onclick="viewEventDetails(${event.id})">📋 View Details</button>
                <button class="btn btn-secondary btn-sm" onclick="unregisterFromEvent(${event.id})">❌ Unregister</button>
            `;
        }

        return `
            <div class="event-card ${isCreatedEvent ? 'created' : ''}">
                <img src="${imageSrc}" alt="${event.title || 'Event Image'}" class="event-card-image-myevents" onerror="this.src='${defaultImage}'; this.onerror=null;">
                <div class="event-card-content-myevents">
                    <div class="event-category category-${categoryClass}" style="background-color:${categoryColor};">${event.category || 'Event'}</div>
                    <h3 class="event-title">${event.title || 'Untitled Event'}</h3>
                    <div class="event-meta">
                        <div class="event-meta-item">
                            <span class="event-meta-icon">📅</span>
                            <span>${formatDate(event.date)}</span>
                        </div>
                        <div class="event-meta-item">
                            <span class="event-meta-icon">⏰</span>
                            <span>${formatTime(event.time || event.date)}</span>
                        </div>
                        <div class="event-meta-item">
                            <span class="event-meta-icon">📍</span>
                            <span>${event.location || 'Location TBD'}</span>
                        </div>
                        ${isCreatedEvent ? `
                        <div class="event-meta-item">
                            <span class="event-meta-icon">👥</span>
                            <span>${event.registrations !== undefined ? event.registrations : '0'} registered</span>
                        </div>` : `
                        <div class="event-meta-item">
                            <span class="event-meta-icon">👤</span>
                            <span>Organized by ${event.organizer || 'Unknown'}</span>
                        </div>`}
                    </div>
                    <p class="event-description">${event.description ? event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '') : 'No description available.'}</p>
                    <div class="event-actions">
                        ${actionsHtml}
                    </div>
                </div>
            </div>
        `;
    }


    function loadEvents() {
        const registeredEventsContainer = document.getElementById('registeredEvents');
        const createdEventsContainer = document.getElementById('createdEvents');
        const registeredCountEl = document.getElementById('registeredCount');
        const createdCountEl = document.getElementById('createdCount');

        const actualRegisteredEvents = (typeof initialRegisteredEvents !== 'undefined' && Array.isArray(initialRegisteredEvents)) ? initialRegisteredEvents : [];
        const actualCreatedEvents = (typeof initialCreatedEvents !== 'undefined' && Array.isArray(initialCreatedEvents)) ? initialCreatedEvents : [];

        if (registeredEventsContainer) {
            if (actualRegisteredEvents.length > 0) {
                registeredEventsContainer.innerHTML = actualRegisteredEvents.map(event => createCardHTML(event, false)).join('');
            } else {
                registeredEventsContainer.innerHTML = `<div class="no-events">You haven't registered for any events yet.<br><a href="/" class="btn btn-primary" style="margin-top: 15px;">Browse Events</a></div>`;
            }
        }
        if(registeredCountEl) registeredCountEl.textContent = actualRegisteredEvents.length;

        if (createdEventsContainer) {
            if (actualCreatedEvents.length > 0) {
                console.log("[myEvents.js] Rendering created events. Data:", actualCreatedEvents);
                createdEventsContainer.innerHTML = actualCreatedEvents.map(event => createCardHTML(event, true)).join('');
            } else {
                console.log("[myEvents.js] No created events to display.");
                createdEventsContainer.innerHTML = `<div class="no-events">You haven't created any events yet.<br><a href="/create-event" class="btn btn-primary" style="margin-top: 15px;">Create New Event</a></div>`;
            }
        }
        if(createdCountEl) createdCountEl.textContent = actualCreatedEvents.length;
    }

    // Make event action functions globally accessible
    window.viewEventDetails = function(eventId) { alert(`Viewing details for event ID: ${eventId}`); /* TODO: Implement */ };
    window.unregisterFromEvent = function(eventId) { if (confirm('Are you sure you want to unregister from this event?')) alert(`Unregistered from event ID: ${eventId}`); /* TODO: Implement API call */ };
    window.editEvent = function(eventId) { window.location.href = `/edit-event/${eventId}`; /* TODO: Create this route and page */ };
    window.viewRegistrations = function(eventId) { alert(`Viewing registrations for event ID: ${eventId}`); /* TODO: Implement */ };
    window.deleteEvent = function(eventId) { if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) alert(`Deleted event ID: ${eventId}`); /* TODO: Implement API call */ };

    // Category toggle functionality
    let currentView = 'both';
    const registeredSection = document.getElementById('registeredSection');
    const createdSection = document.getElementById('createdSection');
    const registeredBtn = document.getElementById('toggleRegistered');
    const createdBtn = document.getElementById('toggleCreated');
    const bothBtn = document.getElementById('toggleBoth');

    window.toggleCategory = function(category) {
        if (!registeredSection || !createdSection || !registeredBtn || !createdBtn || !bothBtn) return;
        [registeredBtn, createdBtn, bothBtn].forEach(btn => btn.classList.remove('active', 'inactive'));

        if (category === 'registered') {
            currentView = 'registered';
            registeredSection.style.display = 'block'; createdSection.style.display = 'none';
            registeredBtn.classList.add('active'); createdBtn.classList.add('inactive'); bothBtn.classList.remove('active');
        } else if (category === 'created') {
            currentView = 'created';
            registeredSection.style.display = 'none'; createdSection.style.display = 'block';
            createdBtn.classList.add('active'); registeredBtn.classList.add('inactive'); bothBtn.classList.remove('active');
        }
    }

    window.showBothCategories = function() {
        if (!registeredSection || !createdSection || !registeredBtn || !createdBtn || !bothBtn) return;
        currentView = 'both';
        registeredSection.style.display = 'block'; createdSection.style.display = 'block';
        registeredBtn.classList.add('active'); createdBtn.classList.add('active'); bothBtn.classList.add('active');
        registeredBtn.classList.remove('inactive'); createdBtn.classList.remove('inactive');
    }

    // Initial load
    loadEvents();
    showBothCategories(); // Default to showing both sections
});
