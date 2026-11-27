'use strict';

(() => {

    const by = id => document.getElementById(id);

    const words = text =>
        text.trim()
            ? text.trim().split(/\s+/u).length
            : 0;

    function note(id, message, error = false) {

        by(id).textContent = message;

        by(id).classList.toggle('error', error);
    }

    /* =========================================
       TEXT HUMANIZER
    ========================================= */

    const basicRules = [

        [/\bin order to\b/gi, 'to'],

        [/\butilize\b/gi, 'use'],

        [/\butilization\b/gi, 'use'],

        [/\bprior to\b/gi, 'before'],

        [/\bsubsequent to\b/gi, 'after'],

        [/\bat this point in time\b/gi, 'now'],

        [/\bin the event that\b/gi, 'if'],

        [/\bdue to the fact that\b/gi, 'because'],

        [/\ba large number of\b/gi, 'many'],

        [/\bin close proximity to\b/gi, 'near'],

        [/\bwith regard to\b/gi, 'about'],

        [/\bin addition to\b/gi, 'along with'],

        [/\bhas the ability to\b/gi, 'can'],

        [/\bfor the purpose of\b/gi, 'to'],

        [/\bmake use of\b/gi, 'use'],

        [/\bcommence\b/gi, 'start'],

        [/\bsubsequently\b/gi, 'then'],

        [/\bapproximately\b/gi, 'about'],

        [/\bascertain\b/gi, 'find out'],

        [/\bwith the exception of\b/gi, 'except'],

        [/\bin a timely manner\b/gi, 'on time']
    ];

    function replaceCase(text, rules) {

        for (const [pattern, replacement] of rules) {

            text = text.replace(pattern, match => {

                if (match === match.toUpperCase()) {

                    return replacement.toUpperCase();
                }

                if (/^[A-Z]/.test(match)) {

                    return replacement[0].toUpperCase()
                        + replacement.slice(1);
                }

                return replacement;
            });
        }

        return text;
    }

    function polish(text, tone) {

        const common = replaceCase(
            text.trim(),
            basicRules
        );

        if (tone === 'casual') {

            return replaceCase(common, [

                [/\bI am\b/gi, "I'm"],

                [/\bwe are\b/gi, "we're"],

                [/\byou are\b/gi, "you're"],

                [/\bdo not\b/gi, "don't"],

                [/\bdoes not\b/gi, "doesn't"],

                [/\bcannot\b/gi, "can't"],

                [/\bwill not\b/gi, "won't"]
            ]);
        }

        if (tone === 'professional') {

            return replaceCase(common, [

                [/\bwanna\b/gi, 'want to'],

                [/\bgonna\b/gi, 'going to'],

                [/\basap\b/gi, 'as soon as possible']
            ]);
        }

        return common;
    }

    /* WORD COUNTER */

    by('text-input').oninput = () => {

        by('text-count').textContent =

            `${words(by('text-input').value)} words`;
    };

    /* REWRITE TEXT */

    by('text-run').onclick = async () => {

        const input = by('text-input').value;

        if (!input.trim()) {

            note(
                'text-status',
                'Enter some text first.',
                true
            );

            return;
        }

        const tone = by('text-tone').value;

        const engine = by('text-engine').value;

        const button = by('text-run');

        button.disabled = true;

        button.textContent = 'Processing…';

        by('text-clear').disabled = true;

        by('text-copy').disabled = true;

        let rewriter;

        try {

            let result;

            if (engine === 'ai') {

                if (!globalThis.Rewriter) {

                    throw Error(
                        'AI rewriting is not available in this browser. Choose Quick polish.'
                    );
                }

                const options = {

                    tone: tone === 'professional'

                        ? 'more-formal'

                        : tone === 'casual'

                            ? 'more-casual'

                            : 'as-is',

                    format: 'plain-text',

                    length: 'as-is',

                    sharedContext:

                        'Rewrite for clarity and natural English. Preserve meaning, facts, names, numbers and instructions.'
                };

                const availability = await Rewriter.availability(
                    options
                );

                if (availability === 'unavailable') {

                    throw Error(
                        'The local AI model is unavailable. Choose Quick polish.'
                    );
                }

                note(
                    'text-status',
                    'Preparing the browser AI model…'
                );

                rewriter = await Rewriter.create(options);

                result = await rewriter.rewrite(input);

            } else {

                result = polish(input, tone);
            }

            by('text-output').value = result;

            by('out-count').textContent =
                `${words(result)} words`;

            note(

                'text-status',

                engine === 'ai'

                    ? 'AI rewrite complete. Review the result.'

                    : result === input.trim()

                        ? 'No common phrases needed changing. Try AI rewrite if available.'

                        : 'Quick polish complete. Review the result.'
            );

        } catch (error) {

            note(
                'text-status',
                error.message,
                true
            );

        } finally {

            rewriter?.destroy?.();

            button.disabled = false;

            button.textContent = 'Humanize text';

            by('text-clear').disabled = false;

            by('text-copy').disabled =
                !by('text-output').value;
        }
    };

    /* COPY TEXT */

    by('text-copy').onclick = async () => {

        try {

            await navigator.clipboard.writeText(
                by('text-output').value
            );

            note(
                'text-status',
                'Copied to clipboard.'
            );

        } catch {

            by('text-output').focus();

            by('text-output').select();

            note(
                'text-status',
                'Press Ctrl+C to copy the selected text.'
            );
        }
    };

    /* CLEAR TEXT */

    by('text-clear').onclick = () => {

        by('text-input').value = '';

        by('text-output').value = '';

        by('text-count').textContent = '0 words';

        by('out-count').textContent = '0 words';

        by('text-copy').disabled = true;

        note('text-status', '');
    };

    /* =========================================
       BACKGROUND REMOVER
    ========================================= */

    let bgFile = null;

    let beforeURL = null;

    let afterURL = null;

    let modelPromise;

    function preview(which, url) {

        by('bg-' + which).hidden = !url;

        by('bg-' + which + '-empty').hidden = !!url;

        if (url) {

            by('bg-' + which).src = url;

        } else {

            by('bg-' + which).removeAttribute('src');
        }
    }

    function clearAfter() {

        if (afterURL) {

            URL.revokeObjectURL(afterURL);
        }

        afterURL = null;

        preview('after', null);

        by('bg-save').hidden = true;

        by('bg-save').removeAttribute('href');
    }

    /* UPLOAD BACKGROUND IMAGE */

    by('bg-file').onchange = () => {

        if (beforeURL) {

            URL.revokeObjectURL(beforeURL);
        }

        beforeURL = null;

        clearAfter();

        bgFile = by('bg-file').files[0] || null;

        if (

            bgFile &&

            (
                !/\.(jpe?g|png|webp)$/i.test(bgFile.name) ||

                !bgFile.size ||

                bgFile.size > 20000000
            )

        ) {

            bgFile = null;

            note(
                'bg-status',
                'Choose JPG, PNG or WEBP up to 20 MB.',
                true
            );

        } else {

            note('bg-status', '');
        }

        if (bgFile) {

            beforeURL = URL.createObjectURL(bgFile);
        }

        preview('before', beforeURL);

        by('bg-run').disabled = !bgFile;
    };

    /* METHOD AND TOLERANCE */

    by('bg-mode').onchange = () => {

        by('bg-tolerance-wrap').hidden =

            by('bg-mode').value !== 'solid';
    };

    by('bg-tolerance').oninput = () => {

        by('bg-tolerance-value').textContent =

            by('bg-tolerance').value;
    };

    /* PNG EXPORT */

    function toPNG(canvas) {

        return new Promise((resolve, reject) => {

            canvas.toBlob(

                blob => blob

                    ? resolve(blob)

                    : reject(Error('PNG export failed.')),

                'image/png'
            );
        });
    }

    /* =========================================
       SOLID BACKGROUND REMOVAL
    ========================================= */

    function removeSolidBackground(
        context,
        width,
        height,
        tolerance
    ) {

        const data = context.getImageData(
            0, 0, width, height
        );

        const pixels = data.data;

        const count = width * height;

        const corners = [

            0,

            width - 1,

            (height - 1) * width,

            count - 1
        ];

        const colors = corners.map(index => [

            pixels[index * 4],

            pixels[index * 4 + 1],

            pixels[index * 4 + 2]
        ]);

        function distance(a, b) {

            return Math.hypot(

                a[0] - b[0],

                a[1] - b[1],

                a[2] - b[2]
            );
        }

        const reference = colors.reduce((best, color) => {

            const near = candidate =>

                colors.filter(item =>

                    distance(item, candidate) <= tolerance

                ).length;

            return near(color) > near(best)

                ? color

                : best;

        }, colors[0]);

        const seen = new Uint8Array(count);

        const queue = new Uint32Array(count);

        let head = 0;

        let tail = 0;

        function visit(index) {

            if (seen[index]) return;

            seen[index] = 1;

            const offset = index * 4;

            if (

                pixels[offset + 3] === 0 ||

                Math.hypot(

                    pixels[offset] - reference[0],

                    pixels[offset + 1] - reference[1],

                    pixels[offset + 2] - reference[2]

                ) <= tolerance

            ) {

                queue[tail++] = index;
            }
        }

        for (let x = 0; x < width; x++) {

            visit(x);

            visit((height - 1) * width + x);
        }

        for (let y = 0; y < height; y++) {

            visit(y * width);

            visit(y * width + width - 1);
        }

        while (head < tail) {

            const index = queue[head++];

            const x = index % width;

            pixels[index * 4 + 3] = 0;

            if (x > 0) {

                visit(index - 1);
            }

            if (x < width - 1) {

                visit(index + 1);
            }

            if (index >= width) {

                visit(index - width);
            }

            if (index < count - width) {

                visit(index + width);
            }
        }

        context.putImageData(data, 0, 0);
    }

    /* =========================================
   AI MODEL LOADING - FIXED
========================================= */

async function loadAIModel() {

    if (!modelPromise) {

        modelPromise = (async () => {

            const { pipeline, env } = await import(
                'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2'
            );

            env.allowLocalModels = false;
            env.useBrowserCache = true;

            const segmenter = await pipeline(

                'background-removal',

                'onnx-community/ormbg-ONNX',

                {
                    device: 'wasm',

                    dtype: 'q8',

                    progress_callback: event => {

                        if (
                            event.status === 'progress' &&
                            Number.isFinite(event.progress)
                        ) {

                            note(
                                'bg-status',
                                `Downloading AI model… ${Math.round(event.progress)}%`
                            );

                        } else if (
                            event.status === 'ready'
                        ) {

                            note(
                                'bg-status',
                                'AI model ready.'
                            );
                        }
                    }
                }
            );

            return segmenter;

        })();
    }

    try {

        return await modelPromise;

    } catch (error) {

        modelPromise = null;

        console.error(
            'Background removal model error:',
            error
        );

        throw new Error(
            'Could not initialize AI model. ' +
            error.message
        );
    }
}


/* =========================================
   PROCESS BACKGROUND REMOVAL - FIXED
========================================= */

async function cutout(file, mode, tolerance) {

    const bitmap = await createImageBitmap(file);

    let canvas;
    let resultCanvas;

    try {

        const width = bitmap.width;
        const height = bitmap.height;

        if (
            width > 8192 ||
            height > 8192 ||
            width * height > 16000000
        ) {

            throw new Error(
                'Maximum image resolution is 16 megapixels. Resize your image first.'
            );
        }

        canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext(
            '2d',
            { willReadFrequently: true }
        );

        if (!context) {

            throw new Error(
                'Canvas is not supported in this browser.'
            );
        }

        context.drawImage(bitmap, 0, 0);

        /* QUICK SOLID BACKGROUND REMOVAL */

        if (mode === 'solid') {

            note(
                'bg-status',
                'Removing background pixels…'
            );

            removeSolidBackground(
                context,
                width,
                height,
                tolerance
            );

            return await toPNG(canvas);
        }

        /* AUTOMATIC AI BACKGROUND REMOVAL */

        note(
            'bg-status',
            'Preparing AI model. First use requires internet…'
        );

        const segmenter = await loadAIModel();

        note(
            'bg-status',
            'Detecting subject and removing background…'
        );

        const results = await segmenter([canvas]);

        const result = results[0];

        if (!result || result.channels !== 4) {

            throw new Error(
                'AI model did not return a transparent image.'
            );
        }

        resultCanvas = await result.toCanvas();

        const resultContext = resultCanvas.getContext(
            '2d',
            { willReadFrequently: true }
        );

        if (!resultContext) {

            throw new Error(
                'Could not create transparent output.'
            );
        }

        /* PRESERVE ORIGINAL RESOLUTION */

        canvas.width = width;
        canvas.height = height;

        context.clearRect(
            0, 0, width, height
        );

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        context.drawImage(
            resultCanvas,
            0,
            0,
            width,
            height
        );

        note(
            'bg-status',
            'Preparing transparent PNG…'
        );

        return await toPNG(canvas);

    } finally {

        bitmap.close();

        if (canvas) {

            canvas.width = 0;
            canvas.height = 0;
        }

        if (resultCanvas) {

            resultCanvas.width = 0;
            resultCanvas.height = 0;
        }
    }
}

    /* BACKGROUND REMOVE BUTTON */

    by('bg-run').onclick = async () => {

        if (!bgFile) return;

        const file = bgFile;

        clearAfter();

        const button = by('bg-run');

        button.disabled = true;

        button.textContent = 'Removing background…';

        by('bg-file').disabled = true;

        by('bg-mode').disabled = true;

        by('bg-tolerance').disabled = true;

        try {

            const result = await cutout(

                file,

                by('bg-mode').value,

                Number(by('bg-tolerance').value)
            );

            afterURL = URL.createObjectURL(result);

            preview('after', afterURL);

            by('bg-save').href = afterURL;

            by('bg-save').download =

                file.name.replace(/\.[^.]+$/, '')

                + '-cutout.png';

            by('bg-save').hidden = false;

            note(

                'bg-status',

                'Background removal complete. Review the transparent result.'
            );

        } catch (error) {

            note(

                'bg-status',

                error.message,

                true
            );

        } finally {

            button.disabled = false;

            button.textContent = 'Remove background';

            by('bg-file').disabled = false;

            by('bg-mode').disabled = false;

            by('bg-tolerance').disabled = false;
        }
    };

})();