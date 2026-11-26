'use strict';

const $ = id => document.getElementById(id);

const presets = {
    facebook: [
        ['Post', 1200, 630],
        ['Cover', 820, 312],
        ['Square', 1080, 1080]
    ],
    instagram: [
        ['Square post', 1080, 1080],
        ['Portrait post', 1080, 1350],
        ['Story', 1080, 1920]
    ],
    whatsapp: [
        ['Profile photo', 640, 640],
        ['Status', 1080, 1920]
    ],
    twitter: [
        ['Post', 1600, 900],
        ['Header', 1500, 500]
    ]
};

let files = [];
let sourceURLs = [];
let outputURLs = [];
let busy = false;

const size = n =>
    n < 1024
        ? `${n} B`
        : n < 1048576
            ? `${(n / 1024).toFixed(1)} KB`
            : `${(n / 1048576).toFixed(1)} MB`;

function status(s, error = false) {
    $('status').textContent = s;
    $('status').classList.toggle('error', error);
}

function el(tag, cls, text) {
    const x = document.createElement(tag);

    if (cls) x.className = cls;
    if (text !== undefined) x.textContent = text;

    return x;
}

function clearResults() {
    outputURLs.forEach(URL.revokeObjectURL);
    outputURLs = [];

    $('results').replaceChildren();
    $('zip').hidden = true;
    $('zip').removeAttribute('href');
    $('empty-result').hidden = false;
}

function renderQueue() {
    sourceURLs.forEach(URL.revokeObjectURL);
    sourceURLs = [];

    $('queue').replaceChildren();

    files.forEach((f, i) => {
        const row = el('div', 'queue-row');
        const img = el('img', 'thumb');

        img.src = URL.createObjectURL(f);
        sourceURLs.push(img.src);
        img.alt = '';

        const d = el('div', 'file-desc');

        d.append(
            el('strong', '', f.name),
            el('small', '', size(f.size))
        );

        const remove = el('button', 'icon-btn', '×');

        remove.type = 'button';
        remove.title = 'Remove image';
        remove.disabled = busy;

        remove.onclick = () => {
            files.splice(i, 1);
            clearResults();
            renderQueue();
            status('');
        };

        row.append(img, d, remove);
        $('queue').append(row);
    });

    $('count').textContent = `${files.length} / 10 images`;

    $('total').textContent = size(
        files.reduce((a, f) => a + f.size, 0)
    );

    $('process').disabled = busy || !files.length;
    $('clear').disabled = busy || !files.length;
    $('browse').disabled = busy;
}

function addFiles(list) {
    if (busy) return;

    let errors = [];

    for (const f of list) {
        if (files.length >= 10) {
            errors.push('Maximum 10 images.');
            break;
        }

        if (
            !/\.(jpe?g|png|webp)$/i.test(f.name) ||
            !f.size ||
            f.size > 4000000
        ) {
            errors.push(
                `${f.name}: unsupported or larger than 4 MB.`
            );
            continue;
        }

        if (
            files.reduce((a, x) => a + x.size, 0) +
            f.size > 40000000
        ) {
            errors.push('Maximum batch size 40 MB.');
            continue;
        }

        files.push(f);
    }

    clearResults();
    renderQueue();
    status(errors.join(' '), !!errors.length);
}

/* IMAGE UPLOAD */

$('browse').onclick = e => {
    e.stopPropagation();
    $('file').click();
};

$('drop').onclick = () => {
    if (!busy) $('file').click();
};

$('drop').onkeydown = e => {
    if (
        !busy &&
        e.target === $('drop') &&
        ['Enter', ' '].includes(e.key)
    ) {
        e.preventDefault();
        $('file').click();
    }
};

$('file').onchange = e => {
    addFiles(e.target.files);
    e.target.value = '';
};

$('clear').onclick = () => {
    files = [];
    clearResults();
    renderQueue();
    status('');
};

/* DRAG AND DROP */

for (const name of ['dragover', 'dragenter']) {
    $('drop').addEventListener(name, e => {
        e.preventDefault();
        $('drop').classList.add('dragging');
    });
}

$('drop').addEventListener('dragleave', () => {
    $('drop').classList.remove('dragging');
});

$('drop').addEventListener('drop', e => {
    e.preventDefault();
    $('drop').classList.remove('dragging');
    addFiles(e.dataTransfer.files);
});

/* SOCIAL MEDIA PRESETS */

for (const btn of document.querySelectorAll('.platform')) {
    btn.onclick = () => {
        document.querySelectorAll('.platform').forEach(b => {
            b.setAttribute(
                'aria-pressed',
                String(b === btn)
            );
        });

        $('preset').replaceChildren(
            new Option(
                'Custom / original dimensions',
                'custom'
            )
        );

        for (
            const [label, w, h]
            of presets[btn.dataset.platform]
        ) {
            $('preset').add(
                new Option(
                    `${label} · ${w} × ${h}`,
                    `${w},${h}`
                )
            );
        }

        $('preset').selectedIndex = 1;
        applyPreset();
    };
}

function applyPreset() {
    const v = $('preset').value;

    if (v === 'custom') {
        $('width').value = '';
        $('height').value = '';
    } else {
        const [w, h] = v.split(',');

        $('width').value = w;
        $('height').value = h;
    }

    $('fit').value = 'contain';
}

$('preset').onchange = applyPreset;

for (const id of ['width', 'height']) {
    $(id).oninput = () => {
        $('preset').value = 'custom';

        document.querySelectorAll('.platform').forEach(b => {
            b.setAttribute('aria-pressed', 'false');
        });
    };
}

/* QUALITY AND FORMAT */

$('quality').oninput = () => {
    $('quality-value').textContent =
        $('quality').value + '%';
};

$('format').onchange = () => {
    $('quality-wrap').hidden =
        $('format').value === 'PNG';
};

/* IMAGE UPSCALE */

const upscaleField = el('div', 'quality');

const upscaleLabel = el(
    'label',
    '',
    'Image upscale'
);

upscaleLabel.htmlFor = 'upscale';

const upscaleSelect = el('select');
upscaleSelect.id = 'upscale';

const upscaleOptions = [
    ['Off — use original or custom dimensions', '1'],
    ['2× — double resolution', '2'],
    ['3× — triple resolution', '3'],
    ['4× — quadruple resolution', '4']
];

for (const [label, value] of upscaleOptions) {
    upscaleSelect.add(
        new Option(label, value)
    );
}

const upscaleHint = el(
    'p',
    'subtitle',
    'Lanczos resampling; preserves aspect ratio. Max 8192 px per side / 32 MP.'
);

upscaleField.append(
    upscaleLabel,
    upscaleSelect,
    upscaleHint
);

const upscaleAnchor =
    $('width').closest('.dimensions') ||
    $('width').closest('label') ||
    $('width');

upscaleAnchor.before(upscaleField);

upscaleSelect.addEventListener('change', () => {
    if (upscaleSelect.value !== '1') {
        $('preset').value = 'custom';
        $('width').value = '';
        $('height').value = '';

        document.querySelectorAll('.platform').forEach(b => {
            b.setAttribute('aria-pressed', 'false');
        });
    }
});

for (const id of ['width', 'height']) {
    $(id).addEventListener('input', () => {
        upscaleSelect.value = '1';
    });
}

$('preset').addEventListener('change', () => {
    upscaleSelect.value = '1';
});

for (const btn of document.querySelectorAll('.platform')) {
    btn.addEventListener('click', () => {
        upscaleSelect.value = '1';
    });
}

/* EXPORT RESULTS */

function showResults(entries, manifest) {
    $('empty-result').hidden = true;

    let ok = 0;

    for (const item of manifest) {
        const card = el('article', 'export-card');

        if (item.error) {
            card.append(
                el('strong', '', item.source),
                el('p', 'error-text', item.error)
            );
        } else {
            ok++;

            const ext = item.name.split('.').pop();

            const mime =
                ext === 'jpg'
                    ? 'image/jpeg'
                    : `image/${ext}`;

            const url = URL.createObjectURL(
                new Blob(
                    [entries.get(item.name)],
                    { type: mime }
                )
            );

            outputURLs.push(url);

            const img = el(
                'img',
                'export-img checker'
            );

            img.src = url;
            img.alt = item.name;

            const d = el('div', 'export-detail');

            d.append(
                el('strong', '', item.name),

                el(
                    'small',
                    '',
                    `${item.width} × ${item.height} · ${size(item.original_size)} → ${size(item.size)}`
                ),

                el(
                    'small',
                    'verified',
                    '✓ Common metadata fields checked'
                )
            );

            const dl = el(
                'a',
                'primary small',
                'Download'
            );

            dl.href = url;
            dl.download = item.name;

            d.append(dl);
            card.append(img, d);
        }

        $('results').append(card);
    }

    if (ok) {
        const zip = URL.createObjectURL(
            makeZip(entries)
        );

        outputURLs.push(zip);

        $('zip').href = zip;
        $('zip').hidden = false;
    }

    status(
        `${ok} of ${manifest.length} images exported.` +
        (
            ok < manifest.length
                ? ' Review failed files below.'
                : ''
        ),
        ok < manifest.length
    );
}

/* PROCESS BATCH */

$('process').onclick = async () => {
    if (busy || !files.length) return;

    for (const id of ['width', 'height']) {
        const x = $(id);

        if (x.value && !x.checkValidity()) {
            status(
                'Enter valid dimensions (1–8192).',
                true
            );
            return;
        }
    }

    clearResults();

    busy = true;

    renderQueue();

    $('process').querySelector('span').textContent =
        'Processing…';

    const query = new URLSearchParams({
        width: $('width').value,
        height: $('height').value,
        format: $('format').value,
        fit: $('fit').value,
        quality: $('quality').value,
        upscale: $('upscale').value
    });

    const entries = new Map();
    const manifest = [];
    const used = new Set();

    try {
        for (const [i, file] of files.entries()) {
            status(
                `Processing image ${i + 1} of ${files.length}…`
            );

            try {
                const r = await fetch(
                    '/api/process?' + query,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/octet-stream'
                        },

                        body: file
                    }
                );

                if (!r.ok) {
                    let msg =
                        `Processing failed (${r.status}).`;

                    try {
                        const e = await r.json();

                        if (typeof e.detail === 'string') {
                            msg = e.detail;
                        }
                    } catch {}

                    throw Error(msg);
                }

                const ext = r.headers.get(
                    'X-Image-Extension'
                );

                const width = Number(
                    r.headers.get('X-Image-Width')
                );

                const height = Number(
                    r.headers.get('X-Image-Height')
                );

                if (
                    !['jpg', 'png', 'webp'].includes(ext) ||
                    !width ||
                    !height
                ) {
                    throw Error('Invalid image response.');
                }

                const bytes = await r.arrayBuffer();

                const stem =
                    file.name
                        .replace(/\.[^.]+$/, '')
                        .replace(/[^a-zA-Z0-9_-]+/g, '_')
                        .replace(/^_+|_+$/g, '')
                        .slice(0, 80) || 'image';

                let name = `${stem}-export.${ext}`;
                let n = 2;

                while (used.has(name.toLowerCase())) {
                    name = `${stem}-export-${n++}.${ext}`;
                }

                used.add(name.toLowerCase());

                entries.set(name, bytes);

                manifest.push({
                    source: file.name,
                    name,
                    width,
                    height,
                    size: bytes.byteLength,
                    original_size: file.size
                });

            } catch (e) {
                manifest.push({
                    source: file.name,
                    error: e.message
                });
            }
        }

        showResults(entries, manifest);

        $('output').scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });

    } catch (e) {
        status(e.message, true);

    } finally {
        busy = false;

        renderQueue();

        $('process').querySelector('span').textContent =
            'Process batch';
    }
};

/* INITIALIZE */

$('year').textContent = new Date().getFullYear();

renderQueue();


/* =========================================
   ADDITIONAL MARKETPLACE & SOCIAL PRESETS
========================================= */

(function () {

    const marketplacePresets = {

        pinterest: [
            ['Standard Pin (Recommended)', 1000, 1500],
            ['Square Pin', 1000, 1000],
            ['Full Screen Vertical', 1080, 1920]
        ],

        etsy: [
            ['Listing Photo - Square', 2000, 2000],
            ['Listing Photo - Landscape', 2800, 2100],
            ['Shop Icon', 500, 500],
            ['Profile Photo', 400, 400],
            ['Mini Shop Banner', 1600, 213],
            ['Mini Shop Banner - Minimum', 1200, 160],
            ['Order Receipt Banner', 760, 100],
            ['Team Logo', 170, 100]
        ],

        amazon: [
            ['Product Image (Recommended)', 2000, 2000],
            ['Product Image - Standard', 1600, 1600],
            ['Zoom Enabled - Square', 1000, 1000],
            ['Minimum Size - Square', 500, 500]
        ],

        ebay: [
            ['Listing Photo (Recommended)', 1600, 1600],
            ['Landscape Photo - 16:9', 1600, 900],
            ['High Resolution Square', 2000, 2000],
            ['Minimum Size - Square', 500, 500]
        ]

    };

    const newPlatforms = [

        {
            id: 'pinterest',
            name: 'Pinterest',
            color: '#E60023',
            icon: `
                <svg viewBox="0 0 24 24"
                     width="20" height="20">
                    <text x="12" y="19"
                          text-anchor="middle"
                          font-family="Georgia, serif"
                          font-size="24"
                          font-weight="bold"
                          font-style="italic"
                          fill="white">P</text>
                </svg>
            `
        },

        {
            id: 'etsy',
            name: 'Etsy',
            color: '#F1641E',
            icon: `
                <svg viewBox="0 0 24 24"
                     width="20" height="20">
                    <text x="12" y="19"
                          text-anchor="middle"
                          font-family="Georgia, serif"
                          font-size="23"
                          fill="white">E</text>
                </svg>
            `
        },

        {
            id: 'amazon',
            name: 'Amazon',
            color: '#232F3E',
            icon: `
                <svg viewBox="0 0 24 24"
                     width="20" height="20">
                    <text x="12" y="16"
                          text-anchor="middle"
                          font-family="Arial, sans-serif"
                          font-size="23"
                          font-weight="bold"
                          fill="white">a</text>
                    <path d="M4 18 Q12 24 20 18"
                          fill="none"
                          stroke="#FF9900"
                          stroke-width="2"
                          stroke-linecap="round"/>
                </svg>
            `
        },

        {
            id: 'ebay',
            name: 'eBay',
            color: '#FFFFFF',
            icon: `
                <svg viewBox="0 0 36 24"
                     width="25" height="20">
                    <text x="1" y="17"
                          font-size="14"
                          font-family="Arial, sans-serif"
                          font-weight="bold">
                        <tspan fill="#E53238">e</tspan>
                        <tspan fill="#0064D2">b</tspan>
                        <tspan fill="#F5AF02">a</tspan>
                        <tspan fill="#86B817">y</tspan>
                    </text>
                </svg>
            `
        }

    ];

    const platformContainer =
        document.querySelector('.platforms');

    if (!platformContainer) {
        console.warn('Platform container not found.');
        return;
    }

    /* Responsive 4-column layout */

    platformContainer.style.display = 'grid';

    platformContainer.style.gridTemplateColumns =
        'repeat(4, minmax(0, 1fr))';

    /* Register additional presets */

    Object.assign(presets, marketplacePresets);

    /* Create platform buttons */

    newPlatforms.forEach(platform => {

        if (
            platformContainer.querySelector(
                `[data-platform="${platform.id}"]`
            )
        ) {
            return;
        }

        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'platform';

        button.dataset.platform = platform.id;

        button.setAttribute('aria-pressed', 'false');

        const iconWrapper =
            document.createElement('span');

        iconWrapper.style.background =
            platform.color;

        iconWrapper.innerHTML = platform.icon;

        if (platform.id === 'ebay') {
            iconWrapper.style.border =
                '1px solid #E2E8F0';

            const svg = iconWrapper.querySelector('svg');

            if (svg) {
                svg.style.width = '27px';
            }
        }

        button.append(
            iconWrapper,
            document.createTextNode(platform.name)
        );

        /* Handle platform selection */

        button.addEventListener('click', () => {

            document
                .querySelectorAll('.platform')
                .forEach(item => {

                    item.setAttribute(
                        'aria-pressed',
                        String(item === button)
                    );

                });

            const presetSelect =
                document.getElementById('preset');

            presetSelect.replaceChildren(
                new Option(
                    'Custom size / original dimensions',
                    'custom'
                )
            );

            marketplacePresets[platform.id]
                .forEach(([label, width, height]) => {

                    presetSelect.add(
                        new Option(
                            `${label} - ${width} × ${height}`,
                            `${width},${height}`
                        )
                    );

                });

            presetSelect.selectedIndex = 1;

            /* Disable upscale for fixed dimensions */

            const upscale =
                document.getElementById('upscale');

            if (upscale) {
                upscale.value = '1';
            }

            /* Apply selected dimensions */

            presetSelect.dispatchEvent(
                new Event('change', {
                    bubbles: true
                })
            );

        });

        platformContainer.appendChild(button);

    });

})();/* ==========================
   EBAY ICON FIX
========================== */

(function () {
    const ebayButton = document.querySelector(
        '.platform[data-platform="ebay"]'
    );

    if (!ebayButton) return;

    const icon = ebayButton.querySelector('span');

    if (!icon) return;

    icon.style.cssText = `
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 44px !important;
        height: 36px !important;
        min-width: 44px !important;
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        font-family: Arial, sans-serif !important;
        font-size: 18px !important;
        font-weight: 500 !important;
        letter-spacing: -1.5px !important;
        overflow: visible !important;
        opacity: 1 !important;
        visibility: visible !important;
    `;

    icon.innerHTML = `
        <b style="color:#E53238 !important;">e</b>
        <b style="color:#0064D2 !important;">b</b>
        <b style="color:#F5AF02 !important;">a</b>
        <b style="color:#86B817 !important;">y</b>
    `;
})();