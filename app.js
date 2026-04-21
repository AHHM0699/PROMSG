(() => {
  const DEFAULT_COUNTRY_CODE = '51';

  const STORAGE_KEY = 'promsg.contacts.v2';
  const LEGACY_STORAGE_KEY = 'promsg.contacts.v1';

  const form = document.getElementById('form');
  const actions = document.getElementById('actions');
  const waLink = document.getElementById('waLink');
  const downloadBtn = document.getElementById('downloadIcs');
  const pickContactBtn = document.getElementById('pickContact');
  const countryInput = document.getElementById('country');
  const phoneInput = document.getElementById('phone');
  const previewPhone = document.getElementById('previewPhone');
  const previewMessage = document.getElementById('previewMessage');
  const previewWhen = document.getElementById('previewWhen');
  const contactsList = document.getElementById('contactsList');
  const newContactName = document.getElementById('newContactName');
  const saveContactBtn = document.getElementById('saveContact');

  let lastIcs = null;
  let lastFilename = 'recordatorio.ics';

  const sanitizeDigits = (s) => (s || '').replace(/\D+/g, '');

  const readPhoneFields = () => {
    const country = sanitizeDigits(countryInput.value) || DEFAULT_COUNTRY_CODE;
    const local = sanitizeDigits(phoneInput.value);
    return { country, local, full: country + local };
  };

  const setPhoneFields = (country, local) => {
    countryInput.value = country || DEFAULT_COUNTRY_CODE;
    phoneInput.value = local || '';
  };

  const pad = (n) => String(n).padStart(2, '0');

  const toIcsUtc = (date) => {
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z'
    );
  };

  const escapeIcs = (s) =>
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

  const simpleFold = (line) => {
    if (line.length <= 73) return line;
    const chunks = [];
    let i = 0;
    while (i < line.length) {
      chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
      i += 73;
    }
    return chunks.join('\r\n');
  };

  const buildWaUrl = (phoneDigits, message) =>
    `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;

  const buildIcs = ({ phoneDigits, message, when, title }) => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@promsg`;
    const dtstamp = toIcsUtc(new Date());
    const dtstart = toIcsUtc(when);
    const dtend = toIcsUtc(new Date(when.getTime() + 15 * 60 * 1000));
    const waUrl = buildWaUrl(phoneDigits, message);
    const summary = title && title.trim() ? title.trim() : `Enviar WhatsApp a +${phoneDigits}`;
    const description = `Toca el enlace para abrir WhatsApp con el mensaje listo:\n${waUrl}\n\nMensaje:\n${message}`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PROMSG//WhatsApp Scheduler//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `URL:${waUrl}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(summary)}`,
      'TRIGGER:-PT0M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    return lines.map(simpleFold).join('\r\n') + '\r\n';
  };

  const formatPreviewDate = (d) =>
    d.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const { country, local, full: phoneDigits } = readPhoneFields();
    const message = document.getElementById('message').value.trim();
    const whenRaw = document.getElementById('when').value;
    const title = document.getElementById('title').value;

    if (!country) {
      alert('Falta el código de país.');
      return;
    }
    if (!local || local.length < 6) {
      alert('Número de destino inválido.');
      return;
    }
    if (!message) {
      alert('Falta el mensaje.');
      return;
    }
    if (!whenRaw) {
      alert('Falta la fecha y hora del recordatorio.');
      return;
    }

    const when = new Date(whenRaw);
    if (isNaN(when.getTime())) {
      alert('Fecha y hora inválidas.');
      return;
    }
    const waUrl = buildWaUrl(phoneDigits, message);

    waLink.href = waUrl;
    previewPhone.textContent = `+${phoneDigits}`;
    previewMessage.textContent = message;
    previewWhen.textContent = formatPreviewDate(when);

    lastIcs = buildIcs({ phoneDigits, message, when, title });
    lastFilename = `whatsapp-${phoneDigits}-${when.toISOString().slice(0, 16).replace(/[:T-]/g, '')}.ics`;

    actions.classList.add('visible');
    actions.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const migrateLegacy = () => {
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacy) return null;
      const parsed = JSON.parse(legacy);
      if (!Array.isArray(parsed)) return null;
      const migrated = parsed
        .filter((c) => c && typeof c.phone === 'string' && c.name)
        .map((c) => {
          const digits = sanitizeDigits(c.phone);
          const country = digits.slice(0, Math.max(0, digits.length - 9)) || DEFAULT_COUNTRY_CODE;
          const local = digits.slice(country.length);
          return { name: c.name, country, local };
        });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    } catch {
      return null;
    }
  };

  const loadContacts = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return migrateLegacy() || [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistContacts = (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('No se pudo guardar contactos:', err);
    }
  };

  const renderContacts = () => {
    const list = loadContacts();
    contactsList.innerHTML = '';
    list
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .forEach((c) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.setAttribute('aria-label', `Usar ${c.name} (+${c.country} ${c.local})`);

        const label = document.createElement('span');
        label.textContent = c.name;
        chip.appendChild(label);

        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'x';
        x.textContent = '×';
        x.setAttribute('aria-label', `Borrar ${c.name}`);
        x.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (!confirm(`Borrar contacto "${c.name}"?`)) return;
          const remaining = loadContacts().filter(
            (other) => other.name !== c.name || other.country !== c.country || other.local !== c.local,
          );
          persistContacts(remaining);
          renderContacts();
        });
        chip.appendChild(x);

        chip.addEventListener('click', () => {
          setPhoneFields(c.country, c.local);
        });
        contactsList.appendChild(chip);
      });
  };

  saveContactBtn.addEventListener('click', () => {
    const name = newContactName.value.trim();
    const { country, local } = readPhoneFields();
    if (!name) {
      alert('Escribe un nombre para guardar.');
      newContactName.focus();
      return;
    }
    if (!country || !local || local.length < 6) {
      alert('El teléfono actual no es válido.');
      phoneInput.focus();
      return;
    }
    const list = loadContacts();
    if (list.some((c) => c.country === country && c.local === local)) {
      alert('Ya tienes un contacto con ese número.');
      return;
    }
    list.push({ name, country, local });
    persistContacts(list);
    newContactName.value = '';
    renderContacts();
  });

  renderContacts();

  if ('contacts' in navigator && typeof navigator.contacts.select === 'function') {
    pickContactBtn.hidden = false;
    pickContactBtn.addEventListener('click', async () => {
      try {
        const contacts = await navigator.contacts.select(['tel', 'name'], { multiple: false });
        if (!contacts || contacts.length === 0) return;
        const c = contacts[0];
        const tel = Array.isArray(c.tel) && c.tel.length ? c.tel[0] : '';
        if (!tel) {
          alert('Ese contacto no tiene número.');
          return;
        }
        const digits = sanitizeDigits(tel);
        const hasPlus = String(tel).trim().startsWith('+');
        if (hasPlus && digits.length > 9) {
          const country = digits.slice(0, digits.length - 9);
          const local = digits.slice(country.length);
          setPhoneFields(country, local);
        } else {
          setPhoneFields(DEFAULT_COUNTRY_CODE, digits);
        }
      } catch (err) {
        console.error(err);
        alert('No se pudo abrir Contactos: ' + err.message);
      }
    });
  }

  downloadBtn.addEventListener('click', () => {
    if (!lastIcs) return;
    const blob = new Blob([lastIcs], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lastFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
})();
