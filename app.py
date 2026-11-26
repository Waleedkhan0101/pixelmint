"""PixelMint FastAPI application for Vercel and local development."""
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from PIL import Image
from image_core import export_image, settings, batch

LIMIT = 4_000_000
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
HEADERS = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}

@app.post('/api/process')
async def process(request: Request):
    try:
        opts = settings(dict(request.query_params))
        declared = int(request.headers.get('content-length', '0'))
        if declared > LIMIT:
            raise HTTPException(413, 'Maximum input size is 4 MB per image.')
        data = bytearray()
        async for chunk in request.stream():
            if len(data) + len(chunk) > LIMIT:
                raise HTTPException(413, 'Maximum input size is 4 MB per image.')
            data.extend(chunk)
        if not data:
            raise ValueError('Empty image.')
        result, ext, dims = await run_in_threadpool(export_image, bytes(data), opts)
        if len(result) > LIMIT:
            raise HTTPException(413, 'Export exceeds 4 MB. Reduce dimensions or quality, or choose JPG/WEBP.')
        mime = {'jpg':'image/jpeg','png':'image/png','webp':'image/webp'}[ext]
        return Response(result, media_type=mime, headers={**HEADERS, 'X-Image-Width':str(dims[0]), 'X-Image-Height':str(dims[1]), 'X-Image-Extension':ext})
    except (ValueError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, str(exc)[:180]) from exc

app.mount('/', StaticFiles(directory=Path(__file__).resolve().parent / 'public', html=True), name='site')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8765)
