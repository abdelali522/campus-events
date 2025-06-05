// public/js/userProfile.js
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = (typeof initialUserData !== 'undefined' && initialUserData) ? 
                      JSON.parse(JSON.stringify(initialUserData)) : 
                      { profile_photo_url: null, first_name: '', last_name: '', email: '', role: 'student', stats: { eventsCreated: 0, eventsAttended: 0 }, created_at: null, updated_at: null };
    let isEditMode = false;
    let newPhotoFile = null;

    // Main Profile Display Elements (in profile-card)
    const profilePhotoEl = document.getElementById('profilePhoto');
    const userNameDisplayEl = document.getElementById('userNameDisplay');
    const userRoleDisplayEl = document.getElementById('userRoleDisplay');
    const eventsCreatedDisplayEl = document.getElementById('eventsCreatedDisplay');
    const eventsAttendedDisplayEl = document.getElementById('eventsAttendedDisplay');
    const changePhotoOverlayButton = document.getElementById('changePhotoOverlayButton');

    // Info Card Display Elements
    const userInfoDisplayDiv = document.getElementById('userInfoDisplay');
    const firstNameDisplayEl = document.getElementById('firstNameDisplay');
    const lastNameDisplayEl = document.getElementById('lastNameDisplay');
    const emailDisplayEl = document.getElementById('emailDisplay');
    const roleDisplayInfoCardEl = document.getElementById('roleDisplayInfoCard');
    const memberSinceDisplayEl = document.getElementById('memberSinceDisplay');
    const lastUpdatedDisplayEl = document.getElementById('lastUpdatedDisplay');

    // Edit Form and its Elements
    const editForm = document.getElementById('userProfileEditForm');
    const photoInput = document.getElementById('photoInput'); // File input for new photo
    const editFirstNameEl = document.getElementById('editFirstName');
    const editLastNameEl = document.getElementById('editLastName');
    const editEmailEl = document.getElementById('editEmail');
    const editRoleEl = document.getElementById('editRole');
    const editFormActionsContainer = document.getElementById('editFormActionsContainer'); // Contains Save/Cancel for form

    // General Buttons & Messages
    const mainEditButton = document.getElementById('mainEditButton'); // The "Edit Profile" / "Cancel Edit" button
    const successMessageDiv = document.getElementById('successMessage');
    const generalErrorDiv = document.getElementById('formGeneralError');

    function capitalizeFirst(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
    function formatDateForDisplay(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}) : 'N/A'; }
    
    function loadUserProfileDisplay() {
        if (!currentUser) return;
        if (profilePhotoEl) profilePhotoEl.src = (currentUser.profile_photo_url && currentUser.profile_photo_url.startsWith('/uploads/')) ? currentUser.profile_photo_url : '/pics/default-avatar.png';
        if (userNameDisplayEl) userNameDisplayEl.textContent = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'User Name';
        if (userRoleDisplayEl) {
            userRoleDisplayEl.textContent = capitalizeFirst(currentUser.role || 'member');
            userRoleDisplayEl.className = `user-role role-${currentUser.role || 'member'}`;
        }
        if (eventsCreatedDisplayEl) eventsCreatedDisplayEl.textContent = currentUser.stats?.eventsCreated || 0;
        if (eventsAttendedDisplayEl) eventsAttendedDisplayEl.textContent = currentUser.stats?.eventsAttended || 0;
        if (firstNameDisplayEl) firstNameDisplayEl.textContent = currentUser.first_name || 'N/A';
        if (lastNameDisplayEl) lastNameDisplayEl.textContent = currentUser.last_name || 'N/A';
        if (emailDisplayEl) emailDisplayEl.textContent = currentUser.email || 'N/A';
        if (roleDisplayInfoCardEl) roleDisplayInfoCardEl.textContent = capitalizeFirst(currentUser.role || 'N/A');
        if (memberSinceDisplayEl) memberSinceDisplayEl.textContent = formatDateForDisplay(currentUser.created_at);
        if (lastUpdatedDisplayEl) lastUpdatedDisplayEl.textContent = formatDateForDisplay(currentUser.updated_at);
    }

    function populateEditForm() {
        if (!currentUser) return;
        if (editFirstNameEl) editFirstNameEl.value = currentUser.first_name || '';
        if (editLastNameEl) editLastNameEl.value = currentUser.last_name || '';
        if (editEmailEl) editEmailEl.value = currentUser.email || '';
        if (editRoleEl) editRoleEl.value = currentUser.role || 'student';
        if (photoInput) photoInput.value = ''; // Clear file input when entering edit mode
        newPhotoFile = null; // Reset selected file
    }

    function setupPhotoUpload() {
        if (photoInput && profilePhotoEl) {
            photoInput.addEventListener('change', function(e) {
                const file = e.target.files[0]; newPhotoFile = null; // Reset
                if (file) {
                    if (!file.type.startsWith('image/')) { alert('Please select a valid image file.'); photoInput.value = ''; return; }
                    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB.'); photoInput.value = ''; return; }
                    newPhotoFile = file;
                    const reader = new FileReader();
                    reader.onload = (event) => { profilePhotoEl.src = event.target.result; }; // Preview on main image
                    reader.readAsDataURL(file);
                    clearFieldError('profile_photo_file');
                }
            });
        }
    }

    window.toggleEditMode = function() {
        isEditMode = !isEditMode;
        if (userInfoDisplayDiv) userInfoDisplayDiv.style.display = isEditMode ? 'none' : 'block';
        if (editForm) editForm.style.display = isEditMode ? 'block' : 'none';
        if (changePhotoOverlayButton) changePhotoOverlayButton.style.display = isEditMode ? 'flex' : 'none'; // Show overlay in edit mode
        
        if (mainEditButton) mainEditButton.innerHTML = isEditMode ? '❌ Cancel Edit' : '✏️ Edit Profile';
        
        if (isEditMode) {
            populateEditForm(); // Populate form with current data
            clearAllErrorMessages();
        } else { // When cancelling or finishing edit
            loadUserProfileDisplay(); // Revert to display values (especially if save failed or was cancelled)
             if (profilePhotoEl && currentUser.profile_photo_url) { // Revert photo preview if cancelled
                profilePhotoEl.src = currentUser.profile_photo_url.startsWith('/uploads/') ? currentUser.profile_photo_url : '/pics/default-avatar.png';
            } else if (profilePhotoEl) {
                profilePhotoEl.src = '/pics/default-avatar.png';
            }
            if(photoInput) photoInput.value = "";
            newPhotoFile = null;
        }
    };
    
    window.cancelEdit = function() { isEditMode = false; toggleEditMode(); };

    function clearFieldError(fieldId) { /* ... as in previous final version ... */ }
    function showFieldError(fieldId, message) { /* ... as in previous final version ... */ }
    function displayServerFieldErrors(errors) { /* ... as in previous final version ... */ }
    function showGeneralServerError(message) { /* ... as in previous final version ... */ }
    function clearAllErrorMessages() { /* ... as in previous final version ... */ }

    window.saveProfile = async function() {
        clearAllErrorMessages();
        let isValid = true;
        // Basic client-side validation
        if (!editFirstNameEl.value.trim()) { showFieldError('first_name', 'First name is required.'); isValid = false; }
        if (!editLastNameEl.value.trim()) { showFieldError('last_name', 'Last name is required.'); isValid = false; }
        if (!editEmailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmailEl.value.trim())) { showFieldError('email', 'Valid email is required.'); isValid = false; }
        if (!isValid) { showGeneralServerError("Please correct highlighted errors."); return; }

        const formData = new FormData();
        formData.append('first_name', editFirstNameEl.value.trim());
        formData.append('last_name', editLastNameEl.value.trim());
        formData.append('email', editEmailEl.value.trim());
        if (!editRoleEl.disabled) formData.append('role', editRoleEl.value);
        if (newPhotoFile) formData.append('profile_photo_file', newPhotoFile);

        const saveButton = editForm.querySelector('.btn-success');
        const originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner" style="width:1em;height:1em;border-width:2px;margin-right:5px;"></span> Saving...';

        try {
            const response = await fetch('/api/user/profile', { method: 'PUT', body: formData });
            const result = await response.json();
            if (response.ok && result.success) {
                currentUser = result.updatedUser; // Update client-side data
                loadUserProfileDisplay(); // Refresh displayed info
                toggleEditMode(); // Switch back to display mode
                if(successMessageDiv) { successMessageDiv.textContent = result.message || '✅ Profile updated!'; successMessageDiv.style.display = 'block'; setTimeout(() => { successMessageDiv.style.display = 'none'; }, 3000); }
                if(photoInput) photoInput.value = ""; newPhotoFile = null;
                const navProfileImg = document.querySelector('.main-nav .profile-menu img');
                if (navProfileImg) navProfileImg.src = (currentUser.profileImageUrl && currentUser.profileImageUrl.startsWith('/uploads/')) ? currentUser.profileImageUrl : '/pics/default-avatar.png';
            } else {
                if (result.errors && result.errors.length > 0) { displayServerFieldErrors(result.errors); showGeneralServerError("Please correct errors."); }
                else { showGeneralServerError(result.message || 'Failed to update profile.'); }
            }
        } catch (error) { console.error('Error saving profile:', error); showGeneralServerError('An error occurred.');
        } finally { saveButton.disabled = false; saveButton.innerHTML = originalButtonText; }
    };

    if (initialUserData && initialUserData.user_id) { // Check if initialUserData is valid
        loadUserProfileDisplay();
        setupPhotoUpload();
    } else {
        console.warn("[userProfile.js] Initial user data not provided or invalid.");
        if(document.body.classList.contains('user-logged-in')) {
             showGeneralServerError("Could not load profile data. Please try refreshing or re-login.");
        }
    }
});
