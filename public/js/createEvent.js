// public/js/createEvent.js
document.addEventListener('DOMContentLoaded', function() {
    // Use initialCategories if passed from EJS, otherwise use sample data
    const categories = (typeof initialCategories !== 'undefined' && initialCategories.length > 0) ? initialCategories : [
        { id: 1, name: 'Academic', color: '#2ecc71' }, { id: 2, name: 'Social', color: '#e74c3c' },
        { id: 3, name: 'Sports', color: '#f39c12' }, { id: 4, name: 'Club', color: '#9b59b6' },
        { id: 5, name: 'Career', color: '#1abc9c' }, { id: 6, name: 'Arts & Culture', color: '#e67e22' },
        { id: 7, name: 'Workshop', color: '#3498db' }, { id: 8, name: 'Other', color: '#95a5a6' }
    ];
    let selectedLogoFile = null;

    const createEventForm = document.getElementById('createEventForm');
    const successMessageDiv = document.getElementById('successMessage');
    const generalErrorDiv = document.getElementById('formGeneralError'); // For general form/server errors

    // --- UI Helper Functions ---
    function showFieldError(fieldId, message) {
        const fieldElement = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        if (fieldElement) fieldElement.style.borderColor = '#e74c3c'; // Highlight field
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        } else {
            // Fallback to general error if specific span not found
            showGeneralFormError(`${fieldId} error: ${message}`);
        }
    }

    function clearFieldError(fieldId) {
        const fieldElement = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        if (fieldElement) fieldElement.style.borderColor = ''; // Reset border
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
        }
    }

    function displayServerFieldErrors(errors) {
        errors.forEach(error => {
            // error.param should match the input field's id
            showFieldError(error.param, error.msg);
        });
    }

    function showGeneralFormError(message) {
        if (generalErrorDiv) {
            generalErrorDiv.innerHTML = `<div>${message}</div>`; // Use innerHTML if message might contain simple HTML
            generalErrorDiv.style.display = 'block';
        } else {
            alert(message); // Fallback
        }
        if (successMessageDiv) successMessageDiv.style.display = 'none';
    }

    function clearAllErrors() {
        document.querySelectorAll('.form-group .error-message').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
        document.querySelectorAll('.form-container input, .form-container select, .form-container textarea').forEach(el => {
            el.style.borderColor = '';
        });
        if (generalErrorDiv) {
            generalErrorDiv.innerHTML = '';
            generalErrorDiv.style.display = 'none';
        }
        if(successMessageDiv) successMessageDiv.style.display = 'none';
    }

    // --- Form Element Setup Functions ---
    function setupLogoUpload() {
        const logoInput = document.getElementById('logo');
        const uploadContainer = document.getElementById('logoUploadContainer');
        const logoPreview = document.getElementById('logoPreview');
        const fileInfo = document.getElementById('fileInfo');
        const removeLogoBtn = document.getElementById('removeLogo');

        if (!logoInput || !uploadContainer || !logoPreview || !fileInfo || !removeLogoBtn) return;

        logoInput.addEventListener('change', handleLogoSelect);
        uploadContainer.addEventListener('dragover', (e) => { e.preventDefault(); uploadContainer.classList.add('dragover'); });
        uploadContainer.addEventListener('dragleave', (e) => { e.preventDefault(); uploadContainer.classList.remove('dragover'); });
        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault(); uploadContainer.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) { logoInput.files = e.dataTransfer.files; handleLogoSelect(); }
        });
        removeLogoBtn.addEventListener('click', () => {
            logoInput.value = ''; selectedLogoFile = null;
            logoPreview.style.display = 'none'; logoPreview.src = '#';
            fileInfo.style.display = 'none'; fileInfo.innerHTML = '';
            removeLogoBtn.style.display = 'none'; clearFieldError('logo');
        });
    }

    function handleLogoSelect() {
        const logoInput = document.getElementById('logo');
        const file = logoInput.files[0];
        const logoPreview = document.getElementById('logoPreview');
        const fileInfo = document.getElementById('fileInfo');
        const removeLogoBtn = document.getElementById('removeLogo');

        clearFieldError('logo'); // Clear previous logo errors

        if (!file) {
            if(selectedLogoFile) removeLogoBtn.click(); // If a file was selected then cancelled
            return;
        }
        if (!file.type.startsWith('image/')) {
            showFieldError('logo', 'Please select a valid image file (JPG, PNG, GIF).');
            logoInput.value = ''; return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showFieldError('logo', 'File size must be less than 5MB.');
            logoInput.value = ''; return;
        }
        selectedLogoFile = file;
        fileInfo.innerHTML = `<strong>Selected:</strong> ${file.name}<br><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        fileInfo.style.display = 'block';
        const reader = new FileReader();
        reader.onload = (e) => { logoPreview.src = e.target.result; logoPreview.style.display = 'block'; };
        reader.readAsDataURL(file);
        removeLogoBtn.style.display = 'inline-block';
    }

    function loadCategories() {
        const categorySelect = document.getElementById('category');
        if (!categorySelect) return;
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    function setMinDateTime() {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000; // Get offset in milliseconds
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);

        const startDatetimeEl = document.getElementById('startDatetime');
        const endDatetimeEl = document.getElementById('endDatetime');
        if (startDatetimeEl) startDatetimeEl.min = localISOTime;
        if (endDatetimeEl) endDatetimeEl.min = localISOTime;
    }

    // --- Client-Side Form Validation ---
    function validateForm() {
        let isValid = true;
        clearAllErrors(); // Clear all previous errors first

        // Title
        const titleInput = document.getElementById('title');
        if (!titleInput.value.trim()) { showFieldError('title', 'Event title is required.'); isValid = false; }
        else if (titleInput.value.trim().length > 100) { showFieldError('title', 'Title must be 100 characters or less.'); isValid = false; }
        else { clearFieldError('title'); }

        // Description (optional, but check length if provided)
        const descriptionInput = document.getElementById('description');
        if (descriptionInput.value.trim().length > 5000) { showFieldError('description', 'Description must be 5000 characters or less.'); isValid = false; }
        else { clearFieldError('description'); }

        // Category
        const categoryInput = document.getElementById('category');
        if (!categoryInput.value) { showFieldError('category', 'Please select an event category.'); isValid = false; }
        else { clearFieldError('category'); }

        // Location
        const locationInput = document.getElementById('location');
        if (!locationInput.value.trim()) { showFieldError('location', 'Event location is required.'); isValid = false; }
        else if (locationInput.value.trim().length > 100) { showFieldError('location', 'Location must be 100 characters or less.'); isValid = false; }
        else { clearFieldError('location'); }

        // Dates
        const startDatetimeInput = document.getElementById('startDatetime');
        const endDatetimeInput = document.getElementById('endDatetime');
        const startDate = new Date(startDatetimeInput.value);
        const endDate = new Date(endDatetimeInput.value);
        const now = new Date();

        if (!startDatetimeInput.value) { showFieldError('startDatetime', 'Start date and time is required.'); isValid = false; }
        else if (startDate <= now) { showFieldError('startDatetime', 'Start date must be in the future.'); isValid = false; }
        else { clearFieldError('startDatetime'); }

        if (!endDatetimeInput.value) { showFieldError('endDatetime', 'End date and time is required.'); isValid = false; }
        else if (startDatetimeInput.value && endDate <= startDate) { showFieldError('endDatetime', 'End date must be after start date.'); isValid = false; }
        else { clearFieldError('endDatetime'); }

        // Max Attendees (optional, but validate if present)
        const maxAttendeesInput = document.getElementById('maxAttendees');
        if (maxAttendeesInput.value) {
            const maxAtt = parseInt(maxAttendeesInput.value);
            if (isNaN(maxAtt) || maxAtt < 1 || maxAtt > 100000) {
                showFieldError('maxAttendees', 'Max attendees must be a number between 1 and 100,000.');
                isValid = false;
            } else { clearFieldError('maxAttendees'); }
        } else { clearFieldError('maxAttendees'); }

        // Logo (selectedLogoFile is already validated in handleLogoSelect)
        // No specific client-side error here unless handleLogoSelect sets one

        if (!isValid) {
            showGeneralFormError("Please correct the errors above.");
        }
        return isValid;
    }

    // --- Form Submission ---
    if (createEventForm) {
        createEventForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearAllErrors();

            if (!validateForm()) {
                console.log('[Client JS CreateEvent] Client-side validation failed.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const submitButton = createEventForm.querySelector('button[type="submit"]');
            const spinner = document.getElementById('submitSpinner');
            
            if(submitButton) submitButton.disabled = true;
            if(spinner) spinner.style.display = 'inline-block';
            
            const formData = new FormData(); // Use FormData for file uploads
            formData.append('title', document.getElementById('title').value.trim());
            formData.append('description', document.getElementById('description').value.trim());
            formData.append('location', document.getElementById('location').value.trim());
            formData.append('start_datetime', document.getElementById('startDatetime').value);
            formData.append('end_datetime', document.getElementById('endDatetime').value);
            formData.append('category_id', document.getElementById('category').value);
            const maxAttendeesVal = document.getElementById('maxAttendees').value;
            if (maxAttendeesVal) formData.append('max_attendees', maxAttendeesVal);
            formData.append('is_public', document.getElementById('isPublic').checked.toString()); // Send as 'true' or 'false' string

            if (selectedLogoFile) {
                formData.append('event_logo_file', selectedLogoFile, selectedLogoFile.name);
            }

            console.log('[Client JS CreateEvent] Submitting FormData...');
            // For debugging FormData: for(let pair of formData.entries()) { console.log(pair[0]+ ': '+ pair[1]); }

            try {
                const response = await fetch('/api/events', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();
                console.log('[Client JS CreateEvent] Server response:', result);

                if (response.ok && result.success) {
                    const successMsgEl = document.getElementById('successMessage');
                    if(successMsgEl) {
                        successMsgEl.textContent = result.message || '✅ Event created successfully!';
                        successMsgEl.style.display = 'block';
                    }
                    createEventForm.reset();
                    document.getElementById('removeLogo')?.click();
                    loadCategories(); // Repopulate and reset category select
                    setMinDateTime();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    if (result.errors && result.errors.length > 0) {
                        displayServerFieldErrors(result.errors);
                        showGeneralFormError("Please correct the errors highlighted below.");
                    } else {
                        showGeneralFormError(result.message || 'Failed to create event. Please try again.');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error('[Client JS CreateEvent] Fetch error:', error);
                showGeneralFormError('An unexpected error occurred. Please check the console.');
            } finally {
                if(submitButton) submitButton.disabled = false;
                if(spinner) spinner.style.display = 'none';
            }
        });
    }
    
    // --- Global Reset Form Function (called by button onclick) ---
    window.resetForm = function() {
        if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
            if(createEventForm) createEventForm.reset();
            clearAllErrors();
            document.getElementById('removeLogo')?.click();
            loadCategories();
            setMinDateTime();
            const successMsgEl = document.getElementById('successMessage');
            if(successMsgEl) successMsgEl.style.display = 'none';
        }
    }

    // --- Initialize Page ---
    loadCategories();
    setMinDateTime();
    setupLogoUpload();
    
    // Auto-update end datetime min value and default if start changes
    const startDatetimeEl = document.getElementById('startDatetime');
    if (startDatetimeEl) {
        startDatetimeEl.addEventListener('change', function() {
            const startDate = new Date(this.value);
            const endDatetimeEl = document.getElementById('endDatetime');
            if (!this.value) { // If start date is cleared, reset end date min
                setMinDateTime(); // This will reset both based on current time
                return;
            }

            if (startDate && endDatetimeEl) {
                endDatetimeEl.min = this.value;
                if (!endDatetimeEl.value || new Date(endDatetimeEl.value) <= startDate) {
                    const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour later
                    const year = newEndDate.getFullYear();
                    const month = (newEndDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = newEndDate.getDate().toString().padStart(2, '0');
                    const hours = newEndDate.getHours().toString().padStart(2, '0');
                    const minutes = newEndDate.getMinutes().toString().padStart(2, '0');
                    endDatetimeEl.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            }
        });
    }
});
