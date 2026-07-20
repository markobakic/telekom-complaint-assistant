(function () {
    'use strict';

    // const WEBHOOK_URL = "https://sinisa1989.app.n8n.cloud/webhook-test/telekom-complaint"
    // const WEBHOOK_URL = "https://sinisa1989.app.n8n.cloud/webhook/telekom-complaint"
    // const WEBHOOK_URL = "https://markobakic.app.n8n.cloud/webhook-test/telekom-complaint"
    const WEBHOOK_URL = "https://markobakic.app.n8n.cloud/webhook/telekom-complaint"

    // TODO: podesiti pravi n8n webhook koji radi OCR/AI ekstrakciju podataka iz uploadovanog dokumenta.
    // Očekivani odgovor (JSON): { name, email, phone, city, address, documentCode }
    // Polja koja ne postoje ili su prazna u odgovoru jednostavno se preskaču.
    // const EXTRACT_WEBHOOK_URL = "https://markobakic.app.n8n.cloud/webhook-test/extract-document"
    const EXTRACT_WEBHOOK_URL = "https://markobakic.app.n8n.cloud/webhook/extract-document"



    /* --- DOM refs ------------------------------------------ */
    const form            = document.getElementById('complaintForm');
    const submitBtn       = document.getElementById('submitBtn');
    const successMsg      = document.getElementById('successMessage');
    const errorMsg        = document.getElementById('errorMessage');
    const textarea        = document.getElementById('problem');
    const charCount       = document.getElementById('charCount');
    const btnNew          = document.getElementById('btnNew');

    const documentInput   = document.getElementById('document');
    const uploadDropzone  = document.getElementById('uploadDropzone');
    const uploadText      = document.getElementById('uploadText');
    const uploadStatus    = document.getElementById('uploadStatus');
    const documentCodeEl  = document.getElementById('documentCode');

    const MAX_CHARS = 1000;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const AUTO_FILL_FIELDS = ['name', 'email', 'phone', 'city', 'address'];

    let isExtracting = false;



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

    /* --- Document upload & auto-fill ------------------------ */
    // Polja koja su auto-popunjena iz dokumenta gube tu oznaku čim ih korisnik ručno izmeni,
    // tako da ostaje jasno da je vrednost sada potvrđena/uneta od strane korisnika.
    [...AUTO_FILL_FIELDS, 'documentCode'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            el.closest('.field-group').classList.remove('auto-filled');
        });
    });

    documentInput.addEventListener('change', async () => {
        const file = documentInput.files[0];
        if (!file) return;

        uploadText.textContent = file.name;
        uploadDropzone.classList.add('has-file');

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setUploadStatus('error', 'Nepodržan format fajla. Priložite PDF ili sliku (JPG, PNG, WEBP).');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setUploadStatus('error', 'Fajl je prevelik. Maksimalna veličina je 10MB.');
            return;
        }

        isExtracting = true;
        setUploadStatus('loading', 'Analiziram dokument...');

        try {
            const extractPayload = new FormData();
            extractPayload.append('document', file);

            const response = await fetch(EXTRACT_WEBHOOK_URL, {
                method: 'POST',
                body: extractPayload
            });

            if (!response.ok) throw new Error('Extraction request failed');

            const data = await response.json();
            applyExtractedData(data);
            setUploadStatus('success', 'Podaci su prepoznati iz dokumenta. Proverite ih i po potrebi ispravite.');

        } catch (err) {
            console.error('Document extraction error:', err);
            setUploadStatus('error', 'Nismo uspeli da automatski pročitamo podatke iz dokumenta. Unesite ih ručno.');
        } finally {
            isExtracting = false;
        }
    });

    function setUploadStatus(type, message) {
        const icons = { loading: 'ti-loader-2 spin', success: 'ti-circle-check', error: 'ti-alert-circle' };
        uploadStatus.className = 'upload-status ' + type;
        uploadStatus.innerHTML = '<i class="ti ' + icons[type] + '"></i><span></span>';
        uploadStatus.querySelector('span').textContent = message;
    }

    // n8n webhook vraća { output: { full_name, email, phone_number, city, address, user_code } }
    // (ponekad umotano u niz) — mapiramo te ključeve na ID-jeve polja u formi.
    const EXTRACT_FIELD_MAP = {
        name:    'full_name',
        email:   'email',
        phone:   'phone_number',
        city:    'city',
        address: 'address',
    };

    function extractOutput(data) {
        if (Array.isArray(data)) data = data[0];
        if (!data || typeof data !== 'object') return null;
        return data.output && typeof data.output === 'object' ? data.output : data;
    }

    function applyExtractedData(data) {
        const output = extractOutput(data);
        if (!output) return;

        AUTO_FILL_FIELDS.forEach((id) => {
            const value = output[EXTRACT_FIELD_MAP[id]];
            const el = document.getElementById(id);
            if (!el || typeof value !== 'string' || !value.trim()) return;
            el.value = value.trim();
            el.closest('.field-group').classList.add('auto-filled');
            validateField(id);
        });

        if (typeof output.user_code === 'string' && output.user_code.trim()) {
            documentCodeEl.value = output.user_code.trim();
            documentCodeEl.closest('.field-group').classList.add('auto-filled');
        }
    }

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

        if (isExtracting) {
            setUploadStatus('error', 'Sačekajte da se završi analiza dokumenta pre slanja forme.');
            uploadStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Collect data (FormData jer se prilaže i fajl dokumenta)
        const payload = new FormData();
        payload.append('name',          document.getElementById('name').value.trim());
        payload.append('email',         document.getElementById('email').value.trim());
        payload.append('phone',         document.getElementById('phone').value.trim());
        payload.append('city',          document.getElementById('city').value.trim());
        payload.append('address',       document.getElementById('address').value.trim());
        payload.append('problem',       document.getElementById('problem').value.trim());
        payload.append('documentCode',  documentCodeEl.value.trim());

        const documentFile = documentInput.files[0];
        if (documentFile) {
            payload.append('document', documentFile);
        }

        // Loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        hideMessages();

        try {
            /* -------------------------------------------------------
               INTEGRACIJA: Zamenite fetch poziv sa vašim API endpointom
               npr. await fetch('/api/support', { method:'POST', ... })
               NAPOMENA: telo je sada multipart/form-data (zbog fajla),
               n8n webhook treba da prihvata "Multipart Form Data".
               ------------------------------------------------------- */

            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                body: payload
            });

            console.log(response)

            // SUCCESS
            form.reset();
            updateCharCount();
            resetUploadUI();
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

    function resetUploadUI() {
        uploadDropzone.classList.remove('has-file');
        uploadText.textContent = 'Kliknite da izaberete fajl (PDF, JPG, PNG) — maks. 10MB';
        uploadStatus.className = 'upload-status';
        uploadStatus.innerHTML = '';
        [...AUTO_FILL_FIELDS, 'documentCode'].forEach((id) => {
            document.getElementById(id)?.closest('.field-group').classList.remove('auto-filled');
        });
    }



})();



