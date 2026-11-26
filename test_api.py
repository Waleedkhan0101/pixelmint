import io, unittest
from fastapi.testclient import TestClient
from PIL import Image
from app import app, LIMIT
from test_app import sample

class APITests(unittest.TestCase):
    def setUp(self): self.client=TestClient(app)
    def test_static(self):
        for path in ('/','/style.css','/app.js','/zip.js'):
            self.assertEqual(self.client.get(path).status_code,200)
    def test_ten_images(self):
        for i in range(10):
            response=self.client.post('/api/process?width=120&height=100&format=PNG',content=sample(('PNG','JPEG','WEBP')[i%3]))
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.headers['x-image-width'],'120')
            with Image.open(io.BytesIO(response.content)) as img:
                self.assertEqual(img.size,(120,100));self.assertFalse(img.getexif());self.assertFalse(img.text)
    def test_bad_requests(self):
        for url, data, status in [('/api/process',b'bad',400),('/api/process',b'',400),('/api/process',b'x'*(LIMIT+1),413),('/api/process?width=9000',sample('PNG'),400)]:
            self.assertEqual(self.client.post(url,content=data).status_code,status)
    def test_large_export(self):
        img=Image.effect_noise((1800,1800),100).convert('RGB');b=io.BytesIO();img.save(b,'JPEG',quality=80)
        self.assertLess(len(b.getvalue()),LIMIT)
        r=self.client.post('/api/process?format=PNG&width=3500&height=3500&fit=stretch',content=b.getvalue())
        self.assertEqual(r.status_code,413)
