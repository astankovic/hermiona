# Hermiona — Premium Photo Editor

Lep, brz i potpuno frontend photo editor inspirisan Lightroom-om.  
Radi kao **single-page** aplikacija i savršeno se hostuje na **GitHub Pages**.

## Karakteristike

- **Svetlo**: Ekspozicija, Kontrast, Svetla, Senke, Bela, Crna
- **Boja**: Temperatura, Nijansa, Zasićenost, Vibracija
- **Efekti**: Jasnoća, Oštrina, Vinjeta, Zrno + gotovi preseti
- **Isecanje**: Rotacija 90°, Flip, fine rotacije
- Before / After poređenje (drži dugme ili Space)
- Drag & Drop + klik za upload
- Potpuno responsive i **super mobile-friendly**
- Tamna premium estetika
- Nema backend-a, nema build-a, nema zavisnosti

## Kako da hostuješ na GitHub Pages

1. Napravi novi GitHub repository (npr. `hermiona-editor` ili `photo-editor`)
2. Upload-uj sadržaj ovog foldera (`index.html`, `styles.css`, `app.js`, `README.md`)
3. Idi u **Settings → Pages**
4. Under **Source** izaberi branch `main` (ili `master`) i folder `/ (root)`
5. Sačuvaj. Posle 30–60 sekundi biće dostupno na:
   `https://tvoj-username.github.io/ime-repozitorijuma/`

### Brzi način preko CLI-a

```bash
git init
git add .
git commit -m "Initial commit — Hermiona photo editor"
git branch -M main
git remote add origin https://github.com/TVOJ_USERNAME/IME_REPO.git
git push -u origin main
```

Zatim u GitHub-u uključi Pages.

## Lokalni pregled

Jednostavno otvori `index.html` u browseru ili koristi bilo koji statički server:

```bash
npx serve .
# ili
python -m http.server 8000
```

## Napomene

- Za bolje performanse na mobilnim uređajima, editor automatski smanjuje velike fotografije na max ~1600px za real-time editing.
- Download izvozi trenutno obrađenu (working) verziju u visokom kvalitetu JPEG.
- Sve radi offline nakon prvog učitavanja.

---

Napravljeno sa pažnjom. Uživaj u uređivanju. ✦
