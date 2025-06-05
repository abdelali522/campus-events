// public/js/register.js
document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registrationForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerBtn = document.getElementById('registerBtn');
    const errorMessageDiv = document.getElementById('errorMessage'); // General error display
    const successMessageDiv = document.getElementById('successMessage');
    const passwordStrengthDiv = document.getElementById('passwordStrength');

    // Helper to display field-specific errors from server
    function displayFieldErrors(errors) {
        // Clear previous general error
        if(errorMessageDiv) errorMessageDiv.style.display = 'none';
        // Clear previous field errors
        document.querySelectorAll('.form-group .error-message-field').forEach(span => span.textContent = '');

        errors.forEach(error => {
            const fieldErrorSpan = document.getElementById(error.param + 'Error'); // e.g., titleError
            if (fieldErrorSpan) {
                fieldErrorSpan.textContent = error.msg;
                fieldErrorSpan.style.display = 'block'; // Make sure it's visible
                const inputField = document.getElementById(error.param);
                if(inputField) inputField.style.borderColor = '#dc2626'; // Highlight field
            } else {
                // Fallback to general error message if specific span not found
                showError(error.msg);
            }
        });
    }


    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Clear all previous field-specific error messages and borders
            document.querySelectorAll('.form-group .error-message').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            document.querySelectorAll('.registration-container input, .registration-container select').forEach(el => {
                el.style.borderColor = '#e1e8ed'; // Reset to default border
            });

            if (validateForm()) { // Client-side validation first
                registerUser();
            } else {
                // If client-side validation fails, errors are already shown by validateForm
                // Ensure general error message is hidden if specific field errors are shown
                if (document.querySelector('.form-group input[style*="border-color: rgb(220, 38, 38)"]')) {
                     if(errorMessageDiv) errorMessageDiv.style.display = 'none';
                }
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener('blur', function() { validateEmail(this.value.trim()); });
        emailInput.addEventListener('input', function() { clearErrorForField(this, 'emailError'); });
    }
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
            validatePasswordMatch();
            clearErrorForField(this, 'passwordError'); // Assuming you add passwordError span
        });
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            validatePasswordMatch();
            clearErrorForField(this, 'confirmPasswordError'); // Assuming you add confirmPasswordError span
        });
    }

    function clearErrorForField(inputElement, errorId) {
        if(inputElement) inputElement.style.borderColor = '#e1e8ed';
        const errorSpan = document.getElementById(errorId);
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
        }
        // If clearing a field error, also consider hiding the general error message
        // if (errorMessageDiv && errorMessageDiv.textContent !== '') {
        //    // Check if the general error was related or just hide it
        // }
    }

    function validateForm() {
        let isValid = true;
        hideError(); // Hide general error message first

        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const email = emailInput; // Already a reference
        const role = document.getElementById('role');
        const password = passwordInput; // Already a reference
        const confirmPassword = confirmPasswordInput; // Already a reference

        // Reset borders
        [firstName, lastName, email, role, password, confirmPassword].forEach(el => {
            if (el) el.style.borderColor = '#e1e8ed';
        });


        if (!firstName.value.trim()) {
            showFieldError(firstName, 'firstNameError', 'First name is required.'); isValid = false;
        }
        if (!lastName.value.trim()) {
            showFieldError(lastName, 'lastNameError', 'Last name is required.'); isValid = false;
        }
        if (!validateEmail(email.value.trim(), true)) { // Pass true for form submission context
            isValid = false; // validateEmail will call showFieldError
        }
        if (!role.value) {
            showFieldError(role, 'roleError', 'Please select your role.'); isValid = false;
        }
        if (password.value.length < 8) {
            showFieldError(password, 'passwordError', 'Password must be at least 8 characters long.'); isValid = false;
        }
        checkPasswordStrength(password.value); // Update visual
        if (password.value !== confirmPassword.value) {
            showFieldError(confirmPassword, 'confirmPasswordError', 'Passwords do not match.');
            if(password.value) password.style.borderColor = '#dc2626'; // Also mark original password field
            isValid = false;
        }
        return isValid;
    }

    function validateEmail(emailValue, isSubmitting = false) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailField = document.getElementById('email'); // Get the field itself

        if (!emailValue) {
            if (isSubmitting) { // Only show "required" error on submit
                showFieldError(emailField, 'emailError', 'Email address is required.');
                return false;
            }
            clearErrorForField(emailField, 'emailError');
            return true; // Not submitting and empty is fine for blur
        }
        if (!emailPattern.test(emailValue)) {
            showFieldError(emailField, 'emailError', 'Please enter a valid email address format.');
            return false;
        }
        if (!emailValue.includes('.edu') && !emailValue.includes('.ac.')) {
            showFieldError(emailField, 'emailError', 'Please use a university email address (e.g., name@university.edu).');
            return false;
        }
        clearErrorForField(emailField, 'emailError'); // Valid
        return true;
    }

    function checkPasswordStrength(passwordVal) { /* ... same as before ... */
        if (!passwordStrengthDiv) return;
        let strength = 0; let feedback = [];
        const criteria = { length: passwordVal.length >= 8, lowercase: /[a-z]/.test(passwordVal), uppercase: /[A-Z]/.test(passwordVal), number: /[0-9]/.test(passwordVal), special: /[^A-Za-z0-9]/.test(passwordVal)};
        if (criteria.length) strength++; else feedback.push('8+ chars');
        if (criteria.lowercase) strength++; else feedback.push('lowercase');
        if (criteria.uppercase) strength++; else feedback.push('uppercase');
        if (criteria.number) strength++; else feedback.push('number');
        if (criteria.special) strength++; else feedback.push('special');
        passwordStrengthDiv.className = 'password-strength';
        if (passwordVal.length === 0) { passwordStrengthDiv.textContent = ''; }
        else if (strength < 3) { passwordStrengthDiv.textContent = `Weak. Needs: ${feedback.slice(0,2).join(', ')}${feedback.length > 2 ? '...' : ''}`; passwordStrengthDiv.classList.add('strength-weak');}
        else if (strength < 5) { passwordStrengthDiv.textContent = `Medium.${feedback.length > 0 ? ' Add: '+feedback.join(', ') : ''}`; passwordStrengthDiv.classList.add('strength-medium');}
        else { passwordStrengthDiv.textContent = 'Strong!'; passwordStrengthDiv.classList.add('strength-strong');}
    }

    function validatePasswordMatch() { /* ... same as before, ensure clearErrorForField is used ... */
        if (!passwordInput || !confirmPasswordInput) return;
        const passwordVal = passwordInput.value;
        const confirmPasswordVal = confirmPasswordInput.value;
        if (confirmPasswordVal && passwordVal !== confirmPasswordVal) {
            showFieldError(confirmPasswordInput, 'confirmPasswordError', 'Passwords do not match.');
        } else if (confirmPasswordVal) { // Passwords match and confirm has value
            clearErrorForField(confirmPasswordInput, 'confirmPasswordError');
            confirmPasswordInput.style.borderColor = '#059669'; // Green for match
        } else { // Confirm is empty
            clearErrorForField(confirmPasswordInput, 'confirmPasswordError');
        }
    }


    window.togglePassword = function(fieldId) { /* ... same as before ... */
        const field = document.getElementById(fieldId);
        if (!field) return;
        const button = field.closest('.password-group').querySelector('.password-toggle');
        if (field.type === 'password') { field.type = 'text'; if(button) button.textContent = '🙈'; }
        else { field.type = 'password'; if(button) button.textContent = '👁️'; }
    };

    async function registerUser() {
        if (!registerBtn || !registrationForm) return;

        const formData = new FormData(registrationForm);
        const data = Object.fromEntries(formData.entries()); // Convert FormData to plain object for JSON

        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        hideError(); // Hide general error
        if(successMessageDiv) successMessageDiv.style.display = 'none';


        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showSuccess(result.message || 'Account created successfully! Please log in.');
                registrationForm.reset();
                if (passwordStrengthDiv) {
                    passwordStrengthDiv.textContent = '';
                    passwordStrengthDiv.className = 'password-strength';
                }
                document.querySelectorAll('.registration-container input, .registration-container select').forEach(el => el.style.borderColor = '#e1e8ed');
                
                setTimeout(() => {
                    // Redirect to login page after success
                    window.location.href = '/login'; // Direct redirect
                }, 2000); // Delay to show success message

            } else {
                // Handle validation errors from server or other errors
                if (result.errors && result.errors.length > 0) {
                    displayFieldErrors(result.errors); // Use the new function
                } else {
                    showError(result.message || 'Registration failed. Please try again.');
                }
            }
        } catch (error) {
            console.error('Registration fetch error:', error);
            showError('An unexpected error occurred during registration. Please try again.');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
    }

    function showFieldError(fieldElement, errorId, message) {
        if(fieldElement) fieldElement.style.borderColor = '#dc2626'; // Red border for error
        const errorSpan = document.getElementById(errorId);
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        } else {
            // Fallback to general error message if specific span not found
            showError(`${fieldElement ? fieldElement.previousElementSibling.textContent : 'Field'} error: ${message}`);
        }
    }

    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            errorMessageDiv.classList.add('general-form-error'); // Ensure it uses the general style
        }
        if (successMessageDiv) successMessageDiv.style.display = 'none';
    }
    function showSuccess(message) {
        if (successMessageDiv) {
            successMessageDiv.textContent = message;
            successMessageDiv.style.display = 'block';
        }
        if (errorMessageDiv) errorMessageDiv.style.display = 'none';
    }
    function hideError() {
        if (errorMessageDiv) errorMessageDiv.style.display = 'none';
    }

    // Focus animations (from original script)
    document.querySelectorAll('.registration-container input, .registration-container select').forEach(element => {
        const parentFormGroup = element.closest('.form-group');
        if(parentFormGroup) {
            element.addEventListener('focus', function() {
                parentFormGroup.style.transform = 'scale(1.02)';
                parentFormGroup.style.transition = 'transform 0.2s ease-out';
            });
            element.addEventListener('blur', function() {
                parentFormGroup.style.transform = 'scale(1)';
            });
        }
    });
});








window.handleRegisterClick = async function(eventId, buttonElement) {
    console.log('[mainEvents.js] handleRegisterClick called for event ID:', eventId, 'Button:', buttonElement);
    console.log('[mainEvents.js] isLoggedIn status:', isLoggedIn);

    if (typeof isLoggedIn === 'undefined' || !isLoggedIn) {
        alert('Please log in to register for events.');
        window.location.href = '/login';
        return;
    }

    
    try {
        console.log('[mainEvents.js] Sending registration request for event:', eventId);
        const response = await fetch(`/api/events/${eventId}/register`, { /* ... */ });
        console.log('[mainEvents.js] Raw response:', response);
        const result = await response.json();
        console.log('[mainEvents.js] Parsed JSON result:', result);
        // ... rest of response handling
    } catch (error) {
        console.error('[mainEvents.js] Error in handleRegisterClick:', error);
        alert('An error occurred (see console for details).');
        // ...
    }
};