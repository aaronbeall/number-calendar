from PIL import Image
import os
here=os.path.dirname(os.path.abspath(__file__)); out=os.path.join(here,'../../src/assets/landing'); os.makedirs(out, exist_ok=True)
crops = {
 'calendar': ('d-pnl', (0,0,2000,1920), 1600),
 'valence-pnl': ('d-pnl', (0,1030,2000,1925), 1200),
 'valence-weight': ('d-weight', (0,1030,2000,1925), 1200),
 'chart': ('d-pnl', (0,3110,2000,3720), 1400),
 'month-summary': ('d-pnl', (0,2840,2000,3090), 1400),
 'year': ('d-year', (0,680,2000,2880), 1400),
 'entry': ('d-panel', (1236,0,2000,1450), 760),
 'achievements': ('d-ach', (0,0,2000,1920), 1400),
 'dashboard': ('d-dash', (0,0,2560,1240), 1600),
 'm-valence-pnl': ('m-pnl-full', (0,960,1170,2075), 780),
 'm-valence-weight': ('m-weight-full', (0,960,1170,2075), 780),
 'm-report': ('m-pnl-full', (0,3200,1170,4850), 780),
 'm-year': ('m-year', (0,360,1170,4020), 780),
 'phone-calendar': ('m-pnl', None, 585),
 'phone-weight': ('m-weight', None, 585),
 'phone-entry': ('m-panel', None, 585),
 'phone-dashboard': ('m-dash', None, 585),
}
tot=0
for theme in ['light','dark']:
  for name,(src,box,w) in crops.items():
    im=Image.open(f'{here}/raw/{theme}-{src}.png').convert('RGB')
    if box: im=im.crop(box)
    if im.width>w: im=im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    p=f'{out}/{name}-{theme}.webp'; im.save(p,'WEBP',quality=80,method=6); tot+=os.path.getsize(p)
print(tot//1024,'KB')
