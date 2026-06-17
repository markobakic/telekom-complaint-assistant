(function () {
    'use strict';

    // const WEBHOOK_URL = "https://sinisa1989.app.n8n.cloud/webhook-test/telekom-complaint"
    const WEBHOOK_URL = "https://sinisa1989.app.n8n.cloud/webhook/telekom-complaint"

    /* --- DOM refs ------------------------------------------ */
    const form          = document.getElementById('complaintForm');
    const submitBtn     = document.getElementById('submitBtn');
    const successMsg    = document.getElementById('successMessage');
    const errorMsg      = document.getElementById('errorMessage');
    const textarea      = document.getElementById('problem');
    const charCount     = document.getElementById('charCount');
    const btnNew        = document.getElementById('btnNew');

    const MAX_CHARS = 1000;



    /* --- Char counter -------------------------------------- */
    function updateCharCount() {
        const len = textarea.value.length;
        charCount.textContent = len + ' / ' + MAX_CHARS;
        charCount.classList.toggle('over', len > MAX_CHARS);
    }

    textarea.addEventListener('input', updateCharCount);

    /* --- Inline validation --------------------------------- */
    const fields = [
        { id: 'name',    errorId: 'nameError',    msg: 'Unesite ime i prezime.' },
        { id: 'email',   errorId: 'emailError',   msg: 'Unesite ispravnu email adresu.' },
        { id: 'phone',   errorId: 'phoneError',   msg: 'Unesite broj telefona.' },
        { id: 'city',    errorId: 'cityError',     msg: 'Unesite grad.' },
        { id: 'address', errorId: 'addressError', msg: 'Unesite adresu.' },
        { id: 'problem', errorId: 'problemError', msg: 'Opišite problem.' },
    ];

    fields.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', () => validateField(id));
        el.addEventListener('input', () => {
            if (el.closest('.field-group').classList.contains('has-error')) {
                validateField(id);
            }
        });
    });

    function validateField(id) {
        const el     = document.getElementById(id);
        const group  = el.closest('.field-group');
        const value  = el.value.trim();

        let valid = value.length > 0;

        if (id === 'email' && valid) {
            valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        if (id === 'problem' && valid) {
            valid = value.length <= MAX_CHARS;
        }

        group.classList.toggle('has-error', !valid);
        return valid;
    }

    function validateAll() {
        return fields.map(({ id }) => validateField(id)).every(Boolean);
    }

    /* --- Submit -------------------------------------------- */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateAll()) {
            // Scroll to first error
            const firstError = form.querySelector('.has-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.querySelector('input, textarea')?.focus();
            }
            return;
        }

        // Collect data
        const payload = {
            name:    document.getElementById('name').value.trim(),
            email:   document.getElementById('email').value.trim(),
            phone:   document.getElementById('phone').value.trim(),
            city:    document.getElementById('city').value.trim(),
            address: document.getElementById('address').value.trim(),
            problem: document.getElementById('problem').value.trim(),
        };

        // Loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        hideMessages();

        try {
            /* -------------------------------------------------------
               INTEGRACIJA: Zamenite fetch poziv sa vašim API endpointom
               npr. await fetch('/api/support', { method:'POST', ... })
               ------------------------------------------------------- */

            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            console.log(response)

            // SUCCESS
            form.reset();
            updateCharCount();
            form.style.display = 'none';
            successMsg.classList.add('visible');
            successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

        } catch (err) {
            console.error('Submit error:', err);
            errorMsg.classList.add('visible');
            errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });

    /* --- New complaint button ------------------------------ */
    btnNew.addEventListener('click', () => {
        successMsg.classList.remove('visible');
        errorMsg.classList.remove('visible');
        form.style.display = '';
        updateCharCount();
        document.getElementById('name').focus();
    });

    function hideMessages() {
        successMsg.classList.remove('visible');
        errorMsg.classList.remove('visible');
    }



})();



