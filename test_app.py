import io,json,unittest,zipfile
from PIL import Image,PngImagePlugin
from app import export_image,settings,batch

def sample(fmt):
    image=Image.new('RGB',(80,40),'red'); b=io.BytesIO(); exif=Image.Exif(); exif[271]='Camera'; exif[305]='Software'
    kw={'exif':exif.tobytes()}
    if fmt=='PNG':
        text=PngImagePlugin.PngInfo();text.add_text('Description','private note');text.add_itxt('XML:com.adobe.xmp','<xmp>sample</xmp>');kw['pnginfo']=text
    elif fmt=='WEBP':kw['xmp']=b'<xmp>sample</xmp>'
    image.save(b,fmt,**kw);return b.getvalue()
class Tests(unittest.TestCase):
    def test_formats(self):
        for fmt in ('JPEG','PNG','WEBP'):
            data,ext,dims=export_image(sample(fmt),settings({}))
            self.assertEqual(dims,(80,40))
            with Image.open(io.BytesIO(data)) as image:
                self.assertFalse(image.getexif());self.assertFalse(getattr(image,'text',{}));self.assertNotIn('xmp',image.info)
    def test_resize(self):
        for fit in ('contain','cover','stretch'):
            _,_,dims=export_image(sample('PNG'),settings({'width':100,'height':100,'fit':fit}));self.assertEqual(dims,(100,100))
        _,_,dims=export_image(sample('PNG'),settings({'width':160}));self.assertEqual(dims,(160,80))
    def test_batch(self):
        z=zipfile.ZipFile(io.BytesIO(batch([('same.png',sample('PNG'))]*9+[('bad.png',b'bad')],settings({}))))
        manifest=json.loads(z.read('manifest.json'));self.assertEqual(len(manifest),10);self.assertEqual(len(z.namelist()),10);self.assertIn('error',manifest[-1]);self.assertEqual(len(set(z.namelist())),10)
    def test_limits(self):
        with self.assertRaises(ValueError):batch([('x',b'x')]*11,settings({}))
        with self.assertRaises(ValueError):settings({'width':9000})
    def test_transparency(self):
        b=io.BytesIO();Image.new('RGBA',(10,10),(255,0,0,0)).save(b,'PNG');r,_,_=export_image(b.getvalue(),settings({'format':'JPEG'}));self.assertEqual(Image.open(io.BytesIO(r)).getpixel((0,0)),(255,255,255))
if __name__=='__main__':unittest.main()
