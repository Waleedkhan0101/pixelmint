import io, json, re, zipfile
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_FILE = 30 * 1024**2
MAX_BATCH = 100 * 1024**2
MAX_PIXELS = 32_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}

def settings(raw):
    fmt = raw.get('format', 'original')
    fit = raw.get('fit', 'contain')
    w, h = int(raw.get('width') or 0), int(raw.get('height') or 0)
    q = int(raw.get('quality', 95))
    upscale = int(raw.get('upscale') or 1)
    if upscale not in (1, 2, 3, 4):
        raise ValueError('Upscale must be 1x, 2x, 3x or 4x.')
    if upscale != 1 and (w or h):
        raise ValueError('Choose either upscale or custom dimensions, not both.')
    if fmt not in ('original', *FORMATS) or fit not in ('contain','cover','stretch') or not 10 <= q <= 100:
        raise ValueError('Invalid export settings.')
    if not (0 <= w <= 8192 and 0 <= h <= 8192):
        raise ValueError('Dimensions must be between 1 and 8192, or blank.')
    return fmt, fit, w, h, q, upscale

def export_image(data, opts):
    fmt, fit, w, h, q, upscale = opts
    if not data or len(data) > MAX_FILE:
        raise ValueError('File exceeds 30 MB or is empty.')
    with Image.open(io.BytesIO(data)) as src:
        original = src.format
        if original not in FORMATS:
            raise ValueError('Only JPG, PNG and WEBP are supported.')
        if src.width * src.height > MAX_PIXELS or max(src.size) > 8192:
            raise ValueError('Source exceeds 32 megapixels or 8192 pixels per side.')
        if getattr(src, 'is_animated', False):
            raise ValueError('Animated files are not supported.')
        src = ImageOps.exif_transpose(src)
        fmt = original if fmt == 'original' else fmt
        alpha = 'A' in src.getbands() or 'transparency' in src.info
        src = src.convert('RGBA' if alpha else 'RGB')
        sw, sh = src.size
        if upscale != 1:
            w, h = sw * upscale, sh * upscale
            if max(w, h) > 8192 or w * h > MAX_PIXELS:
                raise ValueError('Upscaled image exceeds 32 megapixels or 8192 pixels per side. Choose a smaller multiplier.')
            src = src.resize((w, h), Image.Resampling.LANCZOS)
        elif w or h:
            w = w or max(1, round(sw * h / sh))
            h = h or max(1, round(sh * w / sw))
            if max(w,h) > 8192 or w*h > MAX_PIXELS:
                raise ValueError('Output exceeds 32 megapixels or 8192 pixels per side.')
            if fit == 'cover':
                src = ImageOps.fit(src, (w,h), Image.Resampling.LANCZOS)
            elif fit == 'stretch':
                src = src.resize((w,h), Image.Resampling.LANCZOS)
            else:
                scaled = ImageOps.contain(src, (w,h), Image.Resampling.LANCZOS)
                bg = (0,0,0,0) if alpha and fmt != 'JPEG' else (255,255,255,255) if alpha else (255,255,255)
                src = Image.new(src.mode, (w,h), bg)
                src.paste(scaled, ((w-scaled.width)//2,(h-scaled.height)//2))
        # Fresh pixel buffer: no inherited EXIF, GPS, comments or text chunks.
        if fmt == 'JPEG' and src.mode == 'RGBA':
            fresh = Image.new('RGB', src.size, 'white')
            fresh.paste(src, mask=src.getchannel('A'))
        else:
            fresh = Image.new(src.mode, src.size)
            fresh.paste(src)
        out = io.BytesIO()
        kwargs = {'quality': q, 'subsampling': 0} if fmt == 'JPEG' else {'quality': q, 'method': 4} if fmt == 'WEBP' else {'compress_level': 6}
        fresh.save(out, format=fmt, **kwargs)
        result = out.getvalue()
        with Image.open(io.BytesIO(result)) as check:
            info = check.info
            if check.getexif() or any(k in info for k in ('exif','xmp','XML:com.adobe.xmp','icc_profile','comment','photoshop')) or getattr(check,'text',{}):
                raise ValueError('Metadata verification failed.')
        return result, FORMATS[fmt], fresh.size

def batch(parts, opts):
    if not 1 <= len(parts) <= 10:
        raise ValueError('Select between 1 and 10 images.')
    if sum(len(data) for _,data in parts) > MAX_BATCH:
        raise ValueError('Batch exceeds 100 MB.')
    manifest, used = [], set()
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name,data in parts:
            try:
                result, ext, dims = export_image(data, opts)
                stem = re.sub(r'[^A-Za-z0-9_-]+','_',Path(name.replace('\\','/')).stem).strip('_')[:80] or 'image'
                candidate = f'{stem}-export.{ext}'
                i = 2
                while candidate.lower() in used:
                    candidate = f'{stem}-export-{i}.{ext}'; i += 1
                used.add(candidate.lower())
                archive.writestr(candidate, result)
                manifest.append(dict(source=name, name=candidate, width=dims[0], height=dims[1], size=len(result), original_size=len(data)))
            except (ValueError, OSError, Image.DecompressionBombError, UnidentifiedImageError) as exc:
                manifest.append(dict(source=name,error=str(exc)[:180]))
        archive.writestr('manifest.json',json.dumps(manifest,ensure_ascii=True))
    return stream.getvalue()

