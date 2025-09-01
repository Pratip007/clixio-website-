// Form Submission Handler for Clixio Dental Marketing
console.log('Form handler loaded successfully!');

// API Configuration
const API_CONFIG = {
   // baseURL: 'http://localhost:3000/api',
    baseURL: 'https://form-backend-smtp.onrender.com/api',
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
    }
};

// Form Validation Utilities
const FormValidator = {
    // Validate full name (2-100 chars, letters and spaces only)
    validateFullName(name) {
        if (!name || name.trim().length < 2) {
            return 'Full name must be at least 2 characters long';
        }
        if (name.trim().length > 100) {
            return 'Full name must be less than 100 characters';
        }
        if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
            return 'Full name can only contain letters and spaces';
        }
        return null;
    },

    // Validate email format
    validateEmail(email) {
        if (!email || email.trim().length === 0) {
            return 'Email address is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return 'Please provide a valid email address';
        }
        return null;
    },

    // Validate phone number (optional but must be valid if provided)
    validatePhone(phone) {
        if (!phone || phone.trim().length === 0) {
            return null; // Phone is optional
        }
        // Remove all non-digit characters for validation
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return 'Please provide a valid phone number';
        }
        return null;
    },

    // Validate message (optional, max 1000 chars)
    validateMessage(message) {
        if (message && message.trim().length > 1000) {
            return 'Message must be less than 1000 characters';
        }
        return null;
    }
};

// API Service
const ApiService = {
    // Generic API call method
    async makeRequest(endpoint, data, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        try {
            const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    ...API_CONFIG.headers,
                    ...options.headers
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Request failed');
            }

            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            
            throw error;
        }
    },

    // Submit general enquiry
    async submitEnquiry(formData) {
        return this.makeRequest('/enquiry/submit', {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone ? formData.phone.trim() : undefined,
            message: formData.message ? formData.message.trim() : undefined
        });
    },

    // Submit DSO partner enquiry
    async submitDSOPartner(formData) {
        return this.makeRequest('/dso/submit', {
            fullName: formData.fullName.trim(),
            email: formData.email.trim()
        });
    },

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${API_CONFIG.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

// UI Utilities
const UIUtils = {
    // Show loading state on button
    setButtonLoading(button, isLoading, originalText = null) {
        if (isLoading) {
            button.dataset.originalText = originalText || button.textContent;
            button.textContent = 'Sending...';
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.textContent = button.dataset.originalText || originalText || 'Submit';
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    // Show success message
    showSuccess(container, message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 animate-fade-in-up';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span>${message}</span>
            </div>
        `;
        
        // Remove any existing messages
        this.clearMessages(container);
        
        // Insert at the top of the container
        container.insertBefore(successDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    },

    // Show error message
    showError(container, message, errors = []) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in-up';
        
        let errorHTML = `
            <div class="flex items-start">
                <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <div>
                    <p class="font-semibold">${message}</p>
        `;
        
        if (errors.length > 0) {
            errorHTML += '<ul class="mt-2 list-disc list-inside text-sm">';
            errors.forEach(error => {
                errorHTML += `<li>${error.message || error}</li>`;
            });
            errorHTML += '</ul>';
        }
        
        errorHTML += '</div></div>';
        errorDiv.innerHTML = errorHTML;
        
        // Remove any existing messages
        this.clearMessages(container);
        
        // Insert at the top of the container
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    },

    // Clear all messages
    clearMessages(container) {
        const messages = container.querySelectorAll('.bg-green-100, .bg-red-100, .bg-yellow-100');
        messages.forEach(msg => msg.remove());
    },

    // Show validation errors on specific fields
    showFieldError(field, message) {
        // Remove existing error
        this.clearFieldError(field);
        
        // Add error class to field
        field.classList.add('border-red-500', 'focus:border-red-500');
        
        // Create error message element
        const errorElement = document.createElement('p');
        errorElement.className = 'text-red-500 text-sm mt-1 field-error';
        errorElement.textContent = message;
        
        // Insert after the field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    },

    // Clear field error
    clearFieldError(field) {
        field.classList.remove('border-red-500', 'focus:border-red-500');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    },

    // Clear all field errors in a form
    clearAllFieldErrors(form) {
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach(field => this.clearFieldError(field));
    }
};

// Form Handlers
const FormHandlers = {
    // Handle general enquiry form submission
    async handleGeneralEnquiry(formElement, submitButton) {
        const formData = new FormData(formElement);
        let message = formData.get('message') || '';
        
        // Handle additional fields from detailed contact forms
        const practice = formData.get('practice');
        const service = formData.get('service');
        
        // Append additional fields to message if they exist
        if (practice || service) {
            const additionalInfo = [];
            if (practice) additionalInfo.push(`Practice: ${practice}`);
            if (service) additionalInfo.push(`Service Interest: ${service}`);
            
            if (message) {
                message += '\n\nAdditional Information:\n' + additionalInfo.join('\n');
            } else {
                message = 'Additional Information:\n' + additionalInfo.join('\n');
            }
        }
        
        const data = {
            fullName: formData.get('fullName') || formData.get('name') || '',
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            message: message
        };

        // Clear previous errors
        UIUtils.clearAllFieldErrors(formElement);
        UIUtils.clearMessages(formElement);

        // Validate form data
        const errors = [];
        const fullNameError = FormValidator.validateFullName(data.fullName);
        const emailError = FormValidator.validateEmail(data.email);
        const phoneError = FormValidator.validatePhone(data.phone);
        const messageError = FormValidator.validateMessage(data.message);

        if (fullNameError) {
            errors.push({ field: 'fullName', message: fullNameError });
            const nameField = formElement.querySelector('[name="fullName"], [name="name"]');
            if (nameField) UIUtils.showFieldError(nameField, fullNameError);
        }

        if (emailError) {
            errors.push({ field: 'email', message: emailError });
            const emailField = formElement.querySelector('[name="email"]');
            if (emailField) UIUtils.showFieldError(emailField, emailError);
        }

        if (phoneError) {
            errors.push({ field: 'phone', message: phoneError });
            const phoneField = formElement.querySelector('[name="phone"]');
            if (phoneField) UIUtils.showFieldError(phoneField, phoneError);
        }

        if (messageError) {
            errors.push({ field: 'message', message: messageError });
            const messageField = formElement.querySelector('[name="message"]');
            if (messageField) UIUtils.showFieldError(messageField, messageError);
        }

        if (errors.length > 0) {
            UIUtils.showError(formElement, 'Please fix the following errors:', errors);
            return false;
        }

        // Show loading state
        UIUtils.setButtonLoading(submitButton, true);

        try {
            // Submit to API
            const result = await ApiService.submitEnquiry(data);
            
            // Show success message
            UIUtils.showSuccess(formElement, result.message || 'Thank you for your enquiry. We will get back to you within 24 hours.');
            
            // Reset form
            formElement.reset();
            
            // Close modal after success (if in modal)
            setTimeout(() => {
                const modal = formElement.closest('#contactModal, .modal');
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }, 2000);
            
            return true;
        } catch (error) {
            console.error('Form submission error:', error);
            UIUtils.showError(formElement, error.message || 'Failed to submit form. Please try again.');
            return false;
        } finally {
            UIUtils.setButtonLoading(submitButton, false);
        }
    },

    // Handle DSO partner form submission
    async handleDSOPartner(formElement, submitButton) {
        const formData = new FormData(formElement);
        const data = {
            fullName: formData.get('fullName') || formData.get('name') || '',
            email: formData.get('email') || ''
        };

        // Clear previous errors
        UIUtils.clearAllFieldErrors(formElement);
        UIUtils.clearMessages(formElement);

        // Validate form data
        const errors = [];
        const fullNameError = FormValidator.validateFullName(data.fullName);
        const emailError = FormValidator.validateEmail(data.email);

        if (fullNameError) {
            errors.push({ field: 'fullName', message: fullNameError });
            const nameField = formElement.querySelector('[name="fullName"], [name="name"]');
            if (nameField) UIUtils.showFieldError(nameField, fullNameError);
        }

        if (emailError) {
            errors.push({ field: 'email', message: emailError });
            const emailField = formElement.querySelector('[name="email"]');
            if (emailField) UIUtils.showFieldError(emailField, emailError);
        }

        if (errors.length > 0) {
            UIUtils.showError(formElement, 'Please fix the following errors:', errors);
            return false;
        }

        // Show loading state
        UIUtils.setButtonLoading(submitButton, true);

        try {
            // Submit to API
            const result = await ApiService.submitDSOPartner(data);
            
            // Show success message
            UIUtils.showSuccess(formElement, result.message || 'Thank you for your interest in partnering with us. We will contact you within 24 hours.');
            
            // Reset form
            formElement.reset();
            
            // Close modal after success (if in modal)
            setTimeout(() => {
                const modal = formElement.closest('#dsoModal, .modal');
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }, 2000);
            
            return true;
        } catch (error) {
            console.error('DSO form submission error:', error);
            UIUtils.showError(formElement, error.message || 'Failed to submit form. Please try again.');
            return false;
        } finally {
            UIUtils.setButtonLoading(submitButton, false);
        }
    }
};

// Form Initialization
function initializeForms() {
    // Handle all forms with data-form-type attribute
    document.querySelectorAll('form[data-form-type]').forEach(form => {
        const formType = form.getAttribute('data-form-type');
        const submitButton = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn');
        
        if (!submitButton) {
            console.warn('No submit button found for form:', form);
            return;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (formType === 'enquiry' || formType === 'general') {
                await FormHandlers.handleGeneralEnquiry(form, submitButton);
            } else if (formType === 'dso' || formType === 'dso-partner') {
                await FormHandlers.handleDSOPartner(form, submitButton);
            } else {
                console.warn('Unknown form type:', formType);
                UIUtils.showError(form, 'Invalid form type. Please refresh the page and try again.');
            }
        });

        // Clear field errors on input
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('input', () => {
                UIUtils.clearFieldError(field);
            });
        });
    });

    // Auto-detect forms without data-form-type based on their content
    document.querySelectorAll('form:not([data-form-type])').forEach(form => {
        const submitButton = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn');
        if (!submitButton) return;

        // Check if form has DSO-related content
        const isDSOForm = form.textContent.toLowerCase().includes('dso') || 
                         form.textContent.toLowerCase().includes('partner') ||
                         form.id.toLowerCase().includes('dso');

        // Check if it's a general enquiry form (has message field or general content)
        const hasMessageField = form.querySelector('[name="message"]');
        const isGeneralForm = hasMessageField || 
                             form.textContent.toLowerCase().includes('enquiry') ||
                             form.textContent.toLowerCase().includes('contact');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (isDSOForm) {
                await FormHandlers.handleDSOPartner(form, submitButton);
            } else if (isGeneralForm) {
                await FormHandlers.handleGeneralEnquiry(form, submitButton);
            } else {
                // Default to general enquiry
                await FormHandlers.handleGeneralEnquiry(form, submitButton);
            }
        });

        // Clear field errors on input
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('input', () => {
                UIUtils.clearFieldError(field);
            });
        });
    });
}

// Health Check and API Status
async function checkAPIHealth() {
    try {
        const isHealthy = await ApiService.healthCheck();
        if (!isHealthy) {
            console.warn('API health check failed. Forms may not work properly.');
            
            // Show a subtle warning to users if any forms are present
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
                forms.forEach(form => {
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-sm';
                    warningDiv.innerHTML = `
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Service temporarily unavailable. Please try again later.</span>
                        </div>
                    `;
                    form.insertBefore(warningDiv, form.firstChild);
                });
            }
        }
    } catch (error) {
        console.error('API health check error:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing form handlers...');
    initializeForms();
    checkAPIHealth();
});

// Export for external use
window.FormHandlers = FormHandlers;
window.ApiService = ApiService;
window.FormValidator = FormValidator;

console.log('Form.js loaded successfully with API integration!'); 