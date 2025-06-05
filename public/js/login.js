// public/js/login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailGroup = document.getElementById('emailGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const successMessageDiv = document.getElementById('loginSuccessMessage');
    const generalErrorDiv = document.querySelector('.login-page-container .general-server-error');

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function displayFieldErrors(errors) {
        document.querySelectorAll('.form-group .error-text.server-error').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
        document.querySelectorAll('.form-group.error').forEach(group => group.classList.remove('error'));
        if (generalErrorDiv) generalErrorDiv.style.display = 'none';

        errors.forEach(error => {
            const fieldGroup = document.getElementById(error.param + 'Group');
            const errorTextSpan = fieldGroup ? fieldGroup.querySelector('.error-text') : null;
            if (fieldGroup) {
                fieldGroup.classList.add('error');
                if (errorTextSpan) {
                    errorTextSpan.textContent = error.msg;
                    errorTextSpan.style.display = 'block';
                    errorTextSpan.classList.add('server-error');
                }
            } else {
                showGeneralServerError(error.msg);
            }
        });
    }

    function showGeneralServerError(message) {
        if (generalErrorDiv) {
            generalErrorDiv.textContent = message;
            generalErrorDiv.style.display = 'block';
        } else {
            alert(message);
        }
        if (successMessageDiv) successMessageDiv.style.display = 'none';
    }

    function clearClientSideErrors() {
        document.querySelectorAll('.form-group .error-text:not(.server-error)').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
         document.querySelectorAll('.form-group.error').forEach(group => {
            // Only remove 'error' class if there isn't a server error still displayed for it
            const serverErrorSpan = group.querySelector('.error-text.server-error');
            if (!serverErrorSpan || serverErrorSpan.style.display === 'none') {
                group.classList.remove('error');
            }
        });
        if (generalErrorDiv && !generalErrorDiv.classList.contains('server-persisted-error')) { // Add a class if server error should persist
            generalErrorDiv.style.display = 'none';
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearClientSideErrors();
            let clientSideValid = true;

            if (!emailInput.value || !isValidEmail(emailInput.value)) {
                // ... (client-side validation as before, simplified for brevity)
                clientSideValid = false;
            }
            if (!passwordInput.value) {
                // ...
                clientSideValid = false;
            }

            if (!clientSideValid) {
                console.log('[Client JS] Client-side validation failed.');
                return;
            }

            if (successMessageDiv) successMessageDiv.style.display = 'none';
            const submitButton = loginForm.querySelector('.btn-login');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Logging in...';
            }

            try {
                console.log('[Client JS] Attempting to fetch /login with POST');
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
                });

                console.log('[Client JS] Fetch response status:', response.status);
                const data = await response.json(); // Always try to parse JSON
                console.log('[Client JS] Fetch response data:', data);

                if (response.ok && data.success) {
                    console.log('[Client JS] Login successful via fetch. Server responded with data:', data);
                    if (successMessageDiv) {
                        successMessageDiv.textContent = data.message || 'Login successful! Redirecting...';
                        successMessageDiv.style.display = 'block';
                    }
                    
                    // CRITICAL: Redirect should be the last operation related to this flow.
                    const redirectTo = data.redirectTo || '/';
                    console.log(`[Client JS] Attempting to redirect to: ${redirectTo}`);
                    window.location.href = redirectTo; 
                    // No more console.logs or operations after this line in this block.
                } else {
                    if (data.errors && data.errors.length > 0) {
                        displayFieldErrors(data.errors);
                    } else {
                        showGeneralServerError(data.message || 'Login failed. Please check credentials.');
                    }
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Login';
                    }
                }
            } catch (error) {
                console.error('[Client JS] Login fetch/processing error:', error);
                showGeneralServerError('An unexpected error occurred. Please try again or check the console.');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
            }
        });
        
    }
});
