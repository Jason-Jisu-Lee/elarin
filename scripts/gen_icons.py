from PIL import Image, ImageDraw
import os
ROOT    = r'c:\Users\idfor\elarin'
ASSETS  = os.path.join(ROOT, 'assets')
ANDROID = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
BLACK=(0,0,0,255); WHITE=(255,255,255,255)
def draw_E(img):
    s=img.width; draw=ImageDraw.Draw(img)
    h=int(s*.60); sw=int(s*.083); tw=int(s*.34); mw=int(s*.245)
    cx=s//2; cy=s//2; l=cx-tw//2; t=cy-h//2
    draw.rectangle([l,t,l+sw,t+h],fill=BLACK)
    draw.rectangle([l,t,l+tw,t+sw],fill=BLACK)
    mt=t+(h-sw)//2; draw.rectangle([l,mt,l+sw+mw,mt+sw],fill=BLACK)
    draw.rectangle([l,t+h-sw,l+tw,t+h],fill=BLACK)
def leg(n):
    i=Image.new('RGBA',(n,n),WHITE); draw_E(i); return i
def fg(n):
    i=Image.new('RGBA',(n,n),(0,0,0,0)); inn=int(n*.7)
    s=Image.new('RGBA',(inn,inn),(0,0,0,0)); draw_E(s)
    off=(n-inn)//2; i.paste(s,(off,off)); return i
def bg(n): return Image.new('RGBA',(n,n),WHITE)
b=leg(1024); b.save(os.path.join(ASSETS,'icon.png'))
fg(1024).save(os.path.join(ASSETS,'android-icon-foreground.png'))
bg(1024).save(os.path.join(ASSETS,'android-icon-background.png'))
fg(1024).save(os.path.join(ASSETS,'android-icon-monochrome.png'))
b.resize((48,48),Image.LANCZOS).save(os.path.join(ASSETS,'favicon.png'))
b.resize((512,512),Image.LANCZOS).save(os.path.join(ASSETS,'splash-icon.png'))
L={'mipmap-mdpi':48,'mipmap-hdpi':72,'mipmap-xhdpi':96,'mipmap-xxhdpi':144,'mipmap-xxxhdpi':192}
A={'mipmap-mdpi':108,'mipmap-hdpi':162,'mipmap-xhdpi':216,'mipmap-xxhdpi':324,'mipmap-xxxhdpi':432}
for f,n in L.items():
    d=os.path.join(ANDROID,f); i=leg(n)
    i.save(os.path.join(d,'ic_launcher.png')); i.save(os.path.join(d,'ic_launcher_round.png'))
for f,n in A.items():
    d=os.path.join(ANDROID,f)
    fg(n).save(os.path.join(d,'ic_launcher_foreground.png'))
    fg(n).save(os.path.join(d,'ic_launcher_monochrome.png'))
    bg(n).save(os.path.join(d,'ic_launcher_background.png'))
print('done')
