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
    ],

    pinterest: [
        ['Standard Pin', 1000, 1500],
        ['Square Pin', 1000, 1000],
        ['Full Screen Vertical', 1080, 1920]
    ],

    etsy: [
        ['Listing Square', 2000, 2000],
        ['Listing Landscape', 2800, 2100],
        ['Shop Icon', 500, 500],
        ['Profile Photo', 400, 400],
        ['Mini Shop Banner', 1600, 213],
        ['Mini Banner Minimum', 1200, 160],
        ['Order Receipt Banner', 760, 100],
        ['Team Logo', 170, 100]
    ],

    amazon: [
        ['Recommended Product Image', 2000, 2000],
        ['Standard', 1600, 1600],
        ['Zoom Enabled', 1000, 1000],
        ['Minimum Square', 500, 500]
    ],

    ebay: [
        ['Recommended Listing', 1600, 1600],
        ['Landscape', 1600, 900],
        ['High Resolution', 2000, 2000],
        ['Minimum Square', 500, 500]
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

function status(message, error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error', error);
}

function el(tag, cls, text) {
    const element = document.createElement(tag);

    if (cls) element.className = cls;

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function clearResults() {

    outputURLs.forEach(URL.revokeObjectURL);
    outputURLs = [];

    $('results').replaceChildren();

    $('zip').hidden = true;
    $('zip').removeAttribute('href');

    $('empty-result').hidden = false;
}

/* =========================================
   IMAGE QUEUE
========================================= */

function renderQueue() {

    sourceURLs.forEach(URL.revokeObjectURL);
    sourceURLs = [];

    $('queue').replaceChildren();

    files.forEach((file, i) => {

        const row = el('div', 'queue-row');
        const img = el('img', 'thumb');

        img.src = URL.createObjectURL(file);
        img.alt = '';

        sourceURLs.push(img.src);

        const description = el('div', 'file-desc');

        description.append(
            el('strong', '', file.name),
            el('small', '', size(file.size))
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

        row.append(img, description, remove);

        $('queue').append(row);
    });

    $('count').textContent = `${files.length} / 10 images`;

    $('total').textContent = size(
        files.reduce((total, file) => total + file.size, 0)
    );

    $('process').disabled = busy || !files.length;
    $('clear').disabled = busy || !files.length;
    $('browse').disabled = busy;
}

function addFiles(list) {

    if (busy) return;

    const errors = [];

    for (const file of list) {

        if (files.length >= 10) {
            errors.push('Maximum 10 images.');
            break;
        }

        if (
            !/\.(jpe?g|png|webp)$/i.test(file.name) ||
            !file.size ||
            file.size > 20000000
        ) {
            errors.push(
                `${file.name}: unsupported or larger than 20 MB.`
            );
            continue;
        }

        if (
            files.reduce((total, f) => total + f.size, 0)
            + file.size > 100000000
        ) {
            errors.push('Maximum batch size is 100 MB.');
            continue;
        }

        files.push(file);
    }

    clearResults();
    renderQueue();

    status(errors.join(' '), !!errors.length);
}

/* UPLOAD EVENTS */

$('browse').onclick = event => {
    event.stopPropagation();
    $('file').click();
};

$('drop').onclick = () => {
    if (!busy) $('file').click();
};

$('drop').onkeydown = event => {

    if (
        !busy &&
        event.target === $('drop') &&
        ['Enter', ' '].includes(event.key)
    ) {
        event.preventDefault();
        $('file').click();
    }
};

$('file').onchange = event => {
    addFiles(event.target.files);
    event.target.value = '';
};

$('clear').onclick = () => {

    files = [];

    clearResults();
    renderQueue();
    status('');
};

/* DRAG AND DROP */

for (const name of ['dragover', 'dragenter']) {

    $('drop').addEventListener(name, event => {

        event.preventDefault();

        $('drop').classList.add('dragging');
    });
}

$('drop').addEventListener('dragleave', () => {
    $('drop').classList.remove('dragging');
});

$('drop').addEventListener('drop', event => {

    event.preventDefault();

    $('drop').classList.remove('dragging');

    addFiles(event.dataTransfer.files);
});

/* =========================================
   PLATFORM PRESETS
========================================= */

for (const button of document.querySelectorAll('.platform')) {

    button.onclick = () => {

        document.querySelectorAll('.platform').forEach(item => {

            item.setAttribute(
                'aria-pressed',
                String(item === button)
            );
        });

        $('preset').replaceChildren(
            new Option(
                'Custom / original dimensions',
                'custom'
            )
        );

        for (
            const [label, width, height]
            of presets[button.dataset.platform]
        ) {
            $('preset').add(
                new Option(
                    `${label} · ${width} × ${height}`,
                    `${width},${height}`
                )
            );
        }

        $('preset').selectedIndex = 1;

        applyPreset();
    };
}

function applyPreset() {

    const value = $('preset').value;

    if (value === 'custom') {

        $('width').value = '';
        $('height').value = '';

    } else {

        const [width, height] = value.split(',');

        $('width').value = width;
        $('height').value = height;
    }

    $('fit').value = 'contain';
}

$('preset').onchange = applyPreset;

for (const id of ['width', 'height']) {

    $(id).oninput = () => {

        $('preset').value = 'custom';

        document.querySelectorAll('.platform').forEach(button => {

            button.setAttribute('aria-pressed', 'false');
        });
    };
}

$('quality').oninput = () => {

    $('quality-value').textContent =
        $('quality').value + '%';
};

$('format').onchange = () => {

    $('quality-wrap').hidden =
        $('format').value === 'PNG';
};

/* =========================================
   IMAGE UPSCALE
========================================= */

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

    ['Off — original or custom dimensions', '1'],

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
    'High-quality resampling. Maximum 8192 px per side / 32 MP.'
);

upscaleField.append(
    upscaleLabel,
    upscaleSelect,
    upscaleHint
);

const upscaleAnchor =
    $('width').closest('.dimensions') || $('width');

upscaleAnchor.before(upscaleField);

upscaleSelect.addEventListener('change', () => {

    if (upscaleSelect.value !== '1') {

        $('preset').value = 'custom';

        $('width').value = '';
        $('height').value = '';

        document.querySelectorAll('.platform').forEach(button => {

            button.setAttribute('aria-pressed', 'false');
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

for (const button of document.querySelectorAll('.platform')) {

    button.addEventListener('click', () => {

        upscaleSelect.value = '1';
    });
}

/* =========================================
   LOCAL IMAGE PROCESSING
========================================= */

async function localExport(file, options) {

    const img = await createImageBitmap(file);

    let canvas;

    try {

        const sw = img.width;
        const sh = img.height;

        const scale = Number(options.get('upscale')) || 1;

        function validate(width, height) {

            if (
                width < 1 ||
                height < 1 ||
                width > 8192 ||
                height > 8192 ||
                width * height > 32000000
            ) {
                throw Error(
                    'Maximum dimensions: 8192 px per side and 32 megapixels.'
                );
            }
        }

        validate(sw, sh);

        let width = Number(options.get('width'));
        let height = Number(options.get('height'));

        if (scale > 1) {

            width = sw * scale;
            height = sh * scale;

        } else if (width && !height) {

            height = Math.max(
                1,
                Math.round(sh * width / sw)
            );

        } else if (height && !width) {

            width = Math.max(
                1,
                Math.round(sw * height / sh)
            );

        } else if (!width && !height) {

            width = sw;
            height = sh;
        }

        validate(width, height);

        canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        let format = options.get('format');

        if (format === 'original') {

            format = /\.png$/i.test(file.name)
                ? 'PNG'
                : /\.webp$/i.test(file.name)
                    ? 'WEBP'
                    : 'JPEG';
        }

        const mime = {

            JPEG: 'image/jpeg',
            PNG: 'image/png',
            WEBP: 'image/webp'

        }[format];

        if (!mime) {
            throw Error('Unsupported output format.');
        }

        const context = canvas.getContext('2d');

        if (!context) {
            throw Error('Canvas is unavailable.');
        }

        if (format === 'JPEG') {

            context.fillStyle = '#ffffff';

            context.fillRect(0, 0, width, height);
        }

        context.imageSmoothingEnabled = true;

        context.imageSmoothingQuality = 'high';

        const fit = options.get('fit');

        if (fit === 'stretch') {

            context.drawImage(
                img,
                0,
                0,
                width,
                height
            );

        } else {

            const factor = fit === 'cover'

                ? Math.max(width / sw, height / sh)

                : Math.min(width / sw, height / sh);

            const drawWidth = sw * factor;
            const drawHeight = sh * factor;

            context.drawImage(

                img,

                (width - drawWidth) / 2,

                (height - drawHeight) / 2,

                drawWidth,

                drawHeight
            );
        }

        const blob = await new Promise((resolve, reject) => {

            canvas.toBlob(

                result => result

                    ? resolve(result)

                    : reject(Error('Image export failed.')),

                mime,

                Number(options.get('quality')) / 100
            );
        });

        if (blob.type !== mime) {

            throw Error(
                'This browser cannot encode the selected format.'
            );
        }

        return {

            blob,

            ext: {

                JPEG: 'jpg',
                PNG: 'png',
                WEBP: 'webp'

            }[format],

            width,

            height
        };

    } finally {

        img.close();

        if (canvas) {

            canvas.width = 0;
            canvas.height = 0;
        }
    }
}

/* =========================================
   EXPORT RESULTS
========================================= */

function showResults(entries, manifest) {

    $('empty-result').hidden = true;

    let success = 0;

    for (const item of manifest) {

        const card = el('article', 'export-card');

        if (item.error) {

            card.append(

                el('strong', '', item.source),

                el('p', 'error-text', item.error)
            );

        } else {

            success++;

            const ext = item.name.split('.').pop();

            const mime = ext === 'jpg'

                ? 'image/jpeg'

                : `image/${ext}`;

            const url = URL.createObjectURL(

                new Blob(

                    [entries.get(item.name)],

                    { type: mime }
                )
            );

            outputURLs.push(url);

            const img = el('img', 'export-img checker');

            img.src = url;
            img.alt = item.name;

            const detail = el('div', 'export-detail');

            detail.append(

                el('strong', '', item.name),

                el(
                    'small',
                    '',
                    `${item.width} × ${item.height} · ${size(item.original_size)} → ${size(item.size)}`
                ),

                el(
                    'small',
                    'verified',
                    'Fresh browser export — source metadata not copied'
                )
            );

            const download = el(
                'a',
                'primary small',
                'Download'
            );

            download.href = url;
            download.download = item.name;

            detail.append(download);

            card.append(img, detail);
        }

        $('results').append(card);
    }

    if (success) {

        const zipURL = URL.createObjectURL(

            makeZip(entries)
        );

        outputURLs.push(zipURL);

        $('zip').href = zipURL;
        $('zip').hidden = false;
    }

    status(

        `${success} of ${manifest.length} images exported.` +

        (
            success < manifest.length

                ? ' Review failed files below.'

                : ''
        ),

        success < manifest.length
    );
}

/* =========================================
   PROCESS BATCH
========================================= */

$('process').onclick = async () => {

    if (busy || !files.length) return;

    for (const id of ['width', 'height']) {

        const input = $(id);

        if (input.value && !input.checkValidity()) {

            status('Enter valid dimensions (1–8192).', true);

            return;
        }
    }

    clearResults();

    busy = true;

    renderQueue();

    $('process').querySelector('span').textContent =
        'Processing…';

    const options = new URLSearchParams({

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

    let totalOutput = 0;

    try {

        for (const [i, file] of files.entries()) {

            status(
                `Processing image ${i + 1} of ${files.length}…`
            );

            try {

                const result = await localExport(
                    file,
                    options
                );

                const bytes = await result.blob.arrayBuffer();

                if (
                    totalOutput + bytes.byteLength > 200000000
                ) {
                    throw Error(
                        'Batch export limit is 200 MB. Process fewer images.'
                    );
                }

                const stem = file.name

                    .replace(/\.[^.]+$/, '')

                    .replace(/[^a-zA-Z0-9_-]+/g, '_')

                    .replace(/^_+|_+$/g, '')

                    .slice(0, 80) || 'image';

                let name = `${stem}-export.${result.ext}`;

                let n = 2;

                while (used.has(name.toLowerCase())) {

                    name = `${stem}-export-${n++}.${result.ext}`;
                }

                used.add(name.toLowerCase());

                entries.set(name, bytes);

                totalOutput += bytes.byteLength;

                manifest.push({

                    source: file.name,

                    name,

                    width: result.width,

                    height: result.height,

                    size: bytes.byteLength,

                    original_size: file.size
                });

            } catch (error) {

                manifest.push({

                    source: file.name,

                    error: error.message
                });
            }
        }

        showResults(entries, manifest);

        $('output').scrollIntoView({

            behavior: 'smooth',

            block: 'nearest'
        });

    } catch (error) {

        status(error.message, true);

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