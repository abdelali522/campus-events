// public/js/mainEvents.js
document.addEventListener('DOMContentLoaded', function() {
    if (typeof isLoggedIn !== 'undefined') {
        console.log("[mainEvents.js] Script loaded. User is " + (isLoggedIn ? "LOGGED IN" : "NOT LOGGED IN") + " (global var).");
    } else {
        console.error("[mainEvents.js] CRITICAL ERROR: 'isLoggedIn' VARIABLE IS NOT DEFINED. Event registration will fail. Ensure head.ejs is included correctly in your main EJS view and defines 'isLoggedIn' BEFORE this script is loaded.");
    }
    // if (typeof currentUser !== 'undefined') { // You can also log currentUser if needed for debugging
    //     console.log("[mainEvents.js] Current user data (global var):", currentUser);
    // }

    const eventsGrid = document.getElementById('eventsGrid');
    const noEventsPlaceholder = document.getElementById('noEventsPlaceholder');
    const eventsLoadingIndicator = document.getElementById('eventsLoadingIndicator');
    const paginationControls = document.getElementById('paginationControls');
    const categoryFilters = document.querySelectorAll('.filter-tags .filter-tag');
    const dateFilterSelect = document.getElementById('dateFilter');
    const sortFilterSelect = document.getElementById('sortFilter');
    const paginationPrev = document.getElementById('prevPage');
    const paginationNext = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const navSearchInput = document.getElementById('navSearchInput');
    const navSearchButton = document.getElementById('navSearchButton');
    const navSearchIconButton = document.getElementById('navSearchIconButton');

    let allFetchedEvents = [];
    let currentPage = 1;
    const itemsPerPage = 6;
    let currentFilters = { category: 'all', date: 'all', sort: 'upcoming', searchTerm: '' };

    function formatDate(dateString) {
        if (!dateString) return 'Date TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(dateString) {
        if (!dateString) return 'Time TBD';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function renderEvents(eventsToRender) {
        if (!eventsGrid) {
            console.error("[mainEvents.js] Cannot render events: 'eventsGrid' element not found in the DOM.");
            return;
        }
        eventsGrid.innerHTML = '';
        if (eventsLoadingIndicator) eventsLoadingIndicator.style.display = 'none';

        if (eventsToRender.length === 0) {
            if (noEventsPlaceholder) noEventsPlaceholder.style.display = 'flex';
            if (eventsGrid) eventsGrid.style.display = 'none';
            if (paginationControls) paginationControls.style.display = 'none';
            return;
        }

        if (noEventsPlaceholder) noEventsPlaceholder.style.display = 'none';
        if (eventsGrid) eventsGrid.style.display = 'grid';
        if (paginationControls) paginationControls.style.display = 'flex';

        eventsToRender.forEach(event => {
            const categoryColor = event.category_color || '#6c757d';
            const defaultImage = `https://placehold.co/400x200/${categoryColor.substring(1)}/ffffff?text=${encodeURIComponent(event.category || 'Event')}&font=roboto`;
            const imageSrc = event.event_image_url || defaultImage;
            const eventId = parseInt(event.id, 10);

            const cardHTML = `
                <div class="event-card" data-category="${event.category ? event.category.toLowerCase() : 'other'}">
                    <a href="/event/${event.id}" class="event-card-link">
                        <div class="event-image-container">
                            <img src="${imageSrc}" class="event-image" alt="${event.title || 'Event Image'}" onerror="this.src='${defaultImage}'; this.onerror=null;">
                            <div class="event-category category-${event.category ? event.category.toLowerCase() : 'other'}" style="background-color:${categoryColor};">${event.category || 'General'}</div>
                        </div>
                        <div class="event-details">
                            <div class="event-date">
                                <i class="far fa-calendar"></i>
                                <span>${formatDate(event.date)} &bull; ${formatTime(event.date)}</span>
                            </div>
                            <h3 class="event-title">${event.title || 'Untitled Event'}</h3>
                            <p class="event-description">${event.description ? event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '') : 'No description available.'}</p>
                            <div class="event-location">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.location || 'Location TBD'}</span>
                            </div>
                            <div class="event-footer">
                                <div class="attendees">
                                    <div class="attendees-avatars">
                                        <img src="https://via.placeholder.com/28/4f46e5/ffffff?text=A" class="attendee-avatar" alt="Attendee">
                                    </div>
                                    <span class="attendees-count">${event.attendees || 0} attending</span>
                                </div>
                                <button class="register-button" data-event-id="${eventId}" onclick="event.preventDefault(); window.handleRegisterClick(${eventId}, this);">Register</button>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            eventsGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
    
    window.handleRegisterClick = async function(eventId, buttonElement) {
        console.log(`[mainEvents.js] handleRegisterClick called for event ID: ${eventId}.`);
        if (typeof isLoggedIn === 'undefined' || !isLoggedIn) {
            console.warn("[mainEvents.js] User is NOT LOGGED IN or 'isLoggedIn' variable is undefined. Registration aborted.");
            alert('Please log in to register for events.');
            window.location.href = '/login';
            return;
        }
        console.log("[mainEvents.js] User IS logged in. Proceeding with registration API call for event:", eventId);
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="spinner"></span> Registering...';
        }
        try {
            const response = await fetch(`/api/events/${eventId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            console.log('[mainEvents.js] Server response from registration API:', result);
            if (response.ok && result.success) {
                alert(result.message || 'Successfully registered for the event!');
                if (buttonElement) {
                    buttonElement.textContent = 'Registered';
                    buttonElement.classList.add('btn-success');
                    buttonElement.classList.remove('register-button');
                }
                const card = buttonElement.closest('.event-card');
                if (card) {
                    const attendeesSpan = card.querySelector('.attendees-count');
                    if (attendeesSpan) {
                        const currentCountMatch = attendeesSpan.textContent.match(/\d+/);
                        let currentCount = currentCountMatch ? parseInt(currentCountMatch[0], 10) : 0;
                        attendeesSpan.textContent = `${currentCount + 1} attending`;
                    }
                }
            } else {
                alert(result.message || 'Registration failed. Please try again.');
                if (buttonElement) {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = 'Register';
                }
            }
        } catch (error) {
            console.error('[mainEvents.js] JavaScript error during registration API call for event:', eventId, error);
            alert('An unexpected error occurred while trying to register. Please check the console and try again.');
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = 'Register';
            }
        }
    };

    function applyFiltersAndSort(events) {
        let filteredEvents = [...events];
        if (currentFilters.searchTerm) {
            const term = currentFilters.searchTerm.toLowerCase();
            filteredEvents = filteredEvents.filter(event =>
                (event.title && event.title.toLowerCase().includes(term)) ||
                (event.description && event.description.toLowerCase().includes(term)) ||
                (event.category && event.category.toLowerCase().includes(term)) ||
                (event.location && event.location.toLowerCase().includes(term))
            );
        }
        if (currentFilters.category !== 'all') {
            filteredEvents = filteredEvents.filter(event => event.category && event.category.toLowerCase() === currentFilters.category);
        }
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (currentFilters.date === 'today') {
            filteredEvents = filteredEvents.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= todayStart && eventDate < new Date(new Date(todayStart).setDate(todayStart.getDate() + 1));
            });
        }
        if (currentFilters.sort === 'upcoming') filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (currentFilters.sort === 'popular') filteredEvents.sort((a, b) => (b.attendees || 0) - (a.attendees || 0));
        else if (currentFilters.sort === 'newest') filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        return filteredEvents;
    }

    function paginateEvents(events) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return events.slice(startIndex, endIndex);
    }

    function updatePaginationControls(totalItems) {
        if(!pageIndicator || !paginationPrev || !paginationNext || !paginationControls) return;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        paginationPrev.disabled = currentPage === 1;
        paginationNext.disabled = currentPage === totalPages || totalPages === 0;
        paginationControls.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    async function fetchAndDisplayEvents() {
        if (eventsLoadingIndicator) eventsLoadingIndicator.style.display = 'block';
        if (noEventsPlaceholder) noEventsPlaceholder.style.display = 'none';
        if (eventsGrid) {
            eventsGrid.innerHTML = '';
            eventsGrid.style.display = 'none';
        }
        if (paginationControls) paginationControls.style.display = 'none';
        try {
            const apiUrl = `/api/events?page=${currentPage}&limit=${itemsPerPage}&category=${currentFilters.category}&date=${currentFilters.date}&sort=${currentFilters.sort}&search=${encodeURIComponent(currentFilters.searchTerm)}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${await response.text()}`);
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.events)) {
                allFetchedEvents = data.events;
                displayCurrentEvents();
            } else {
                console.error("[mainEvents.js] API call successful but data format incorrect or 'success' is false:", data);
                allFetchedEvents = [];
                displayCurrentEvents();
            }
        } catch (error) {
            console.error("[mainEvents.js] Error fetching or processing events:", error);
            allFetchedEvents = [];
            displayCurrentEvents();
            if (eventsGrid && (!noEventsPlaceholder || noEventsPlaceholder.style.display !== 'flex')) {
                 eventsGrid.innerHTML = `<p class="no-events-message" style="text-align:center;color:red;">Could not load events. ${error.message || 'Please try again.'}</p>`;
                 if (eventsGrid) eventsGrid.style.display = 'block';
            }
        } finally {
            if (eventsLoadingIndicator) eventsLoadingIndicator.style.display = 'none';
        }
    }

    function displayCurrentEvents() {
        const processedEvents = applyFiltersAndSort(allFetchedEvents);
        const paginatedEvents = paginateEvents(processedEvents);
        renderEvents(paginatedEvents);
        updatePaginationControls(processedEvents.length);
    }

    if (categoryFilters) {
        categoryFilters.forEach(tag => tag.addEventListener('click', function() {
            categoryFilters.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilters.category = this.dataset.category;
            currentPage = 1;
            fetchAndDisplayEvents();
        }));
    }
    if (dateFilterSelect) dateFilterSelect.addEventListener('change', function() { currentFilters.date = this.value; currentPage = 1; fetchAndDisplayEvents(); });
    if (sortFilterSelect) sortFilterSelect.addEventListener('change', function() { currentFilters.sort = this.value; currentPage = 1; fetchAndDisplayEvents(); });
    if (paginationPrev) paginationPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; displayCurrentEvents(); }});
    if (paginationNext) paginationNext.addEventListener('click', () => { const totalEvents = applyFiltersAndSort(allFetchedEvents).length; if (currentPage < Math.ceil(totalEvents / itemsPerPage)) { currentPage++; displayCurrentEvents(); }});
    
    function performSearch() { currentFilters.searchTerm = navSearchInput ? navSearchInput.value.trim() : ''; currentPage = 1; fetchAndDisplayEvents(); }
    if(navSearchButton) navSearchButton.addEventListener('click', performSearch);
    if(navSearchInput) navSearchInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); performSearch(); }});
    if(navSearchIconButton) navSearchIconButton.addEventListener('click', performSearch);

    fetchAndDisplayEvents();
});



