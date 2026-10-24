# -*- coding: utf-8 -*-
"""Собирает бизнес-тезис «В России» в PDF по ГОСТ 7.32-2017 (чёрно-белый): python scripts/thesis/build.py
Поля: левое 30, правое 15, верхнее и нижнее 20 мм; Times New Roman 14 пт, полуторный интервал, абзацный отступ 1,25 см, выравнивание по ширине;
номер страницы внизу по центру, на титульном листе не ставится; структурные элементы — по центру прописными; разделы — с абзацного отступа, полужирным;
«Рисунок N — …» под рисунком по центру, «Таблица N — …» над таблицей слева; приложения А, Б, В. Скриншоты переводятся в оттенки серого."""
import os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.join(os.path.dirname(__file__), '..', '..'))
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether, NextPageTemplate, CondPageBreak
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PImage
import importlib
LANG = 'en' if '--en' in sys.argv else 'ru'
C = importlib.import_module('content_en' if LANG == 'en' else 'content')
EXTRA = importlib.import_module('extra_en' if LANG == 'en' else 'extra').EXTRA
LB = C.LABELS

def assemble():
    body = []
    for blk in C.BODY:
        if blk[0] == 'h2' and blk[1] in EXTRA: body.extend(EXTRA[blk[1]])
        body.append(blk)
    # tables are numbered in order of appearance; text references follow the new numbers
    ids = [re.match(LB['tabRe'], blk[1]).group(1) for blk in body if blk[0] == 'table']
    new = {old: str(i + 1) for i, old in enumerate(ids)}
    fix = lambda txt: re.sub(LB['refRe'], lambda m: f'{m.group(1)} {new.get(m.group(2), m.group(2))}', txt)
    out = []
    for blk in body:
        if blk[0] == 'p': out.append(('p', fix(blk[1])))
        elif blk[0] == 'table': out.append(('table', fix(blk[1]), [[fix(c) for c in row] for row in blk[2]], blk[3]))
        else: out.append(blk)
    return out

F = 'C:/Windows/Fonts/'
pdfmetrics.registerFont(TTFont('TNR', F + 'times.ttf')); pdfmetrics.registerFont(TTFont('TNR-B', F + 'timesbd.ttf')); pdfmetrics.registerFont(TTFont('TNR-I', F + 'timesi.ttf'))
from reportlab.lib.fonts import addMapping
addMapping('TNR', 0, 0, 'TNR'); addMapping('TNR', 1, 0, 'TNR-B'); addMapping('TNR', 0, 1, 'TNR-I'); addMapping('TNR', 1, 1, 'TNR-B')

FS, LEAD, IND = 14, 21, 1.25 * cm
body = ParagraphStyle('body', fontName='TNR', fontSize=FS, leading=LEAD, alignment=TA_JUSTIFY, firstLineIndent=IND, spaceAfter=0)
center = ParagraphStyle('c', parent=body, alignment=TA_CENTER, firstLineIndent=0)
struct = ParagraphStyle('h0', fontName='TNR-B', fontSize=FS, leading=LEAD, alignment=TA_CENTER, spaceAfter=LEAD)
h1 = ParagraphStyle('h1', fontName='TNR-B', fontSize=FS, leading=LEAD, alignment=TA_LEFT, firstLineIndent=IND, spaceAfter=LEAD, spaceBefore=0)
h2 = ParagraphStyle('h2', fontName='TNR-B', fontSize=FS, leading=LEAD, alignment=TA_LEFT, firstLineIndent=IND, spaceBefore=LEAD, spaceAfter=LEAD / 2)
cap_fig = ParagraphStyle('cf', parent=center, spaceBefore=4, spaceAfter=LEAD)
cap_tab = ParagraphStyle('ct', fontName='TNR', fontSize=FS, leading=LEAD, alignment=TA_LEFT, spaceBefore=LEAD / 2, spaceAfter=4)
cell = ParagraphStyle('cell', fontName='TNR', fontSize=12, leading=14, alignment=TA_LEFT)
cellh = ParagraphStyle('cellh', parent=cell, fontName='TNR-B', alignment=TA_CENTER)
item = ParagraphStyle('li', parent=body, firstLineIndent=0, leftIndent=IND + 0.5 * cm, bulletIndent=IND)
src = ParagraphStyle('src', parent=body, firstLineIndent=IND)
toc1 = ParagraphStyle('toc1', fontName='TNR', fontSize=FS, leading=LEAD, leftIndent=0, firstLineIndent=0)
toc2 = ParagraphStyle('toc2', parent=toc1, leftIndent=0.6 * cm)
small = ParagraphStyle('sm', parent=center, fontSize=12, leading=16)

OUT_DIR = 'docs/thesis'; FIG = C.FIG; os.makedirs(FIG, exist_ok=True); os.makedirs(FIG + 'gray', exist_ok=True)
W, H = A4; LM, RM, TM, BM = 30 * mm, 15 * mm, 20 * mm, 20 * mm; TW = W - LM - RM

def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

# ---------- black-and-white diagrams ----------
def diagrams():
    DG = LB.get('dg', {}); tr = lambda x: DG.get(x, x); SUF = '_en' if LANG == 'en' else ''
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    plt.rcParams['font.family'] = 'Times New Roman'; plt.rcParams['font.size'] = 12
    # architecture
    fig, ax = plt.subplots(figsize=(8, 4.6)); ax.set_xlim(0, 10); ax.set_ylim(0, 6); ax.axis('off')
    def box(x, y, w, h, t, hatch=None):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.05', fc='white', ec='black', lw=1.2, hatch=hatch)); ax.text(x + w / 2, y + h / 2, t, ha='center', va='center', fontsize=11, wrap=True)
    def arrow(x1, y1, x2, y2, t=''):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle='<->', lw=1.1, color='black'))
        if t: ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 0.18, t, ha='center', fontsize=10)
    box(0.2, 3.6, 3.2, 2.0, tr('Браузер игрока\nTypeScript, three.js (WebGL)\nпервая загрузка ≤ 250 КБ\nмодули по требованию'))
    box(6.6, 3.6, 3.2, 2.0, tr('Сервер игры\nNode.js, Fastify\nсессии, лимиты, CSRF,\nпроверка входных данных'))
    box(6.6, 0.4, 3.2, 2.0, tr('PostgreSQL\nфункции СУБД, миграции,\nроль с минимальными правами'))
    box(0.2, 0.4, 3.2, 2.0, tr('Внешние сервисы\n(только с согласия игрока):\nкарта OpenStreetMap'))
    arrow(3.4, 4.6, 6.6, 4.6, 'HTTPS, JSON, cookie HttpOnly'); arrow(8.2, 3.6, 8.2, 2.4, ''); ax.text(8.35, 3.0, tr('SQL\n(параметры)'), fontsize=10)
    ax.annotate('', xy=(1.8, 2.4), xytext=(1.8, 3.6), arrowprops=dict(arrowstyle='->', lw=1.0, ls='--', color='black'))
    ax.add_patch(plt.Rectangle((6.3, 0.15), 3.8, 5.7, fill=False, ls='--', lw=1)); ax.text(8.2, 5.95, tr('ЦОД на территории РФ (152-ФЗ)'), ha='center', fontsize=10)
    plt.tight_layout(); plt.savefig(FIG + 'architecture' + SUF + '.png', dpi=200); plt.close()
    # roadmap (Gantt)
    tasks = [(tr('Сервер в РФ, юридическое оформление, ООО'), 0, 2), (tr('Перевод на языки мигрантов'), 1, 5), (tr('Пилот в Университете ИТМО'), 3, 9), (tr('Исследование эффективности (до/после)'), 5, 11),
             (tr('Защита бизнес-тезиса'), 8, 9), (tr('Заявка ИРИ, «Старт-1»'), 10, 13), (tr('Партнёрства с вузами и центрами адаптации'), 12, 22), (tr('Мобильная версия'), 14, 20), (tr('Лицензии для организаций'), 16, 24)]
    fig, ax = plt.subplots(figsize=(8, 4.2))
    for i, (t, a, b) in enumerate(tasks): ax.barh(len(tasks) - 1 - i, b - a, left=a, color='0.75' if i % 2 else '0.45', edgecolor='black', hatch='//' if i % 3 == 0 else None)
    ax.set_yticks(range(len(tasks))); ax.set_yticklabels([t for t, _, _ in tasks][::-1], fontsize=10); ax.set_xlim(0, 24); ax.set_xticks(range(0, 25, 3)); ax.set_xlabel('Месяцы от начала проекта')
    ax.axvline(12, color='black', lw=1, ls='--'); ax.text(12.2, len(tasks) - 0.6, tr('грант ФСИ'), fontsize=10); ax.grid(axis='x', color='0.85'); plt.tight_layout(); plt.savefig(FIG + 'roadmap' + SUF + '.png', dpi=200); plt.close()
    # budget
    items = [(tr('Оплата труда'), 600), (tr('Переводы'), 120), (tr('Юридическое сопровождение'), 100), (tr('Пилот и исследование'), 60), (tr('Продвижение'), 60), (tr('Серверы в РФ'), 60)]
    fig, ax = plt.subplots(figsize=(7.5, 3.4)); hatches = ['', '//', '..', 'xx', '\\\\', '--']
    for i, (t, v) in enumerate(items): ax.barh(len(items) - 1 - i, v, color=str(0.3 + i * 0.1), edgecolor='black', hatch=hatches[i]); ax.text(v + 8, len(items) - 1 - i, f'{v} ' + tr('тыс. руб.'), va='center', fontsize=10)
    ax.set_yticks(range(len(items))); ax.set_yticklabels([t for t, _ in items][::-1]); ax.set_xlim(0, 720); ax.set_xlabel('тыс. руб.'); plt.tight_layout(); plt.savefig(FIG + 'budget' + SUF + '.png', dpi=200); plt.close()

def gray(path):
    name = os.path.basename(path).rsplit('.', 1)[0] + '.png'; out = FIG + 'gray/' + name
    im = PImage.open(path).convert('L'); im.save(out); return out, im.size

def figure(path, caption, maxh=10.5 * cm):
    p, (iw, ih) = gray(path) if not path.startswith(FIG) or 'gray' not in path else (path, PImage.open(path).size)
    if path.startswith(FIG) and 'gray' not in path: p, (iw, ih) = path, PImage.open(path).size
    w = min(TW, 16 * cm); h = w * ih / iw
    if h > maxh: h = maxh; w = h * iw / ih
    img = Image(p, width=w, height=h); img.hAlign = 'CENTER'
    return KeepTogether([Spacer(1, 4), img, Paragraph(esc(caption), cap_fig)])

def table(caption, rows, widths):
    data = [[Paragraph(esc(c), cellh if r == 0 else cell) for c in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=[x * cm for x in widths], repeatRows=1)
    t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.6, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    t.hAlign = 'LEFT'
    return [KeepTogether([Paragraph(esc(caption), cap_tab), t]), Spacer(1, LEAD / 2)] if len(rows) <= 14 else [CondPageBreak(3 * cm), Paragraph(esc(caption), cap_tab), t, Spacer(1, LEAD / 2)]

class Doc(BaseDocTemplate):
    def __init__(self, fn):
        super().__init__(fn, pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM, title=LB['docTitle'], author=f'{C.AUTHOR_RU} ({C.AUTHOR_EN})', subject=C.TITLE)
        fr = Frame(LM, BM, TW, H - TM - BM, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate('title', [fr], onPage=lambda c, d: None), PageTemplate('body', [fr], onPage=self.num)])
    def num(self, c, d):
        c.setFont('TNR', 12); c.drawCentredString(LM + TW / 2, 10 * mm, str(d.page))
    def afterFlowable(self, f):
        if isinstance(f, Paragraph) and getattr(f, '_toc', None) is not None:
            lvl, txt = f._toc; key = 'h%d' % id(f); self.canv.bookmarkPage(key); self.notify('TOCEntry', (lvl, txt, self.page, key))

def Hd(text, style, lvl):
    p = Paragraph(esc(text), style); p._toc = (lvl, text); return p

def build():
    diagrams()
    s = []
    # ----- title page -----
    t = lambda x, st=center: s.append(Paragraph(x, st))
    for x in LB['head']: t(x)
    s.append(Spacer(1, 10)); t(LB['faculty']); s.append(Spacer(1, 30))
    t('<b>' + LB['kind1'] + '</b>'); t('<b>' + LB['kind2'] + '</b>'); s.append(Spacer(1, 12))
    t('<b>' + esc(C.TITLE) + '</b>'); s.append(Spacer(1, 26))
    left = ParagraphStyle('l', parent=body, firstLineIndent=0, alignment=TA_LEFT)
    for x in LB['fields']:
        s.append(Paragraph(esc(x), left))
    s.append(Spacer(1, 120)); t(LB['city']); t(C.YEAR)
    s.append(NextPageTemplate('body')); s.append(PageBreak())
    # ----- реферат -----
    s.append(Paragraph(LB['abstract'], struct))
    s.append(Paragraph('{PAGES}', body))
    s.append(Paragraph(esc(C.KEYWORDS), ParagraphStyle('kw', parent=body, alignment=TA_LEFT)))
    for p in C.ABSTRACT: s.append(Paragraph(esc(p), body))
    s.append(PageBreak())
    # ----- содержание -----
    s.append(Paragraph(LB['contents'], struct))
    toc = TableOfContents(); toc.levelStyles = [toc1, toc2]; toc.dotsMinLevel = 0; s.append(toc); s.append(PageBreak())
    # ----- сокращения -----
    s.append(Hd(LB['terms'], struct, 0))
    for a, b in C.TERMS: s.append(Paragraph(f'<b>{esc(a)}</b> — {esc(b)}', ParagraphStyle('t', parent=body, firstLineIndent=0)))
    s.append(PageBreak())
    figs = tabs = 0
    first = True
    for b in assemble():
        k = b[0]
        if k == 'h1':
            if not first: s.append(PageBreak())
            first = False
            s.append(Hd(b[1], struct if b[1].isupper() else h1, 0))
        elif k == 'h2': s.append(Hd(b[1], h2, 1))
        elif k == 'p': s.append(Paragraph(esc(b[1]), body))
        elif k == 'list':
            for i, x in enumerate(b[1]): s.append(Paragraph(esc(x), item, bulletText='–'))
        elif k == 'fig': s.append(figure(b[1], b[2])); figs += 1
        elif k == 'table': s.extend(table(b[1], b[2], b[3])); tabs += 1
    s.append(PageBreak()); s.append(Hd(LB['sources'], struct, 0))
    for i, x in enumerate(C.SOURCES, 1): s.append(Paragraph(f'{i}. {esc(x)}', src))
    for letter, title, blocks in C.APPENDIX:
        s.append(PageBreak()); s.append(Hd(f"{LB['appendix']} {letter}", struct, 0)); s.append(Paragraph(f'<b>{esc(title)}</b>', ParagraphStyle('at', parent=center, spaceAfter=LEAD)))
        for b in blocks:
            if b[0] == 'fig': s.append(figure(b[1], b[2], 9.5 * cm))
            else: s.extend(table(b[1], b[2], b[3]))
    return s, figs, tabs

def main():
    os.makedirs(OUT_DIR, exist_ok=True); out = OUT_DIR + '/' + LB['file']
    # two passes: the abstract needs the final number of pages
    pages = 0
    for _ in range(2):
        story, figs, tabs = build()
        for f in story:
            if isinstance(f, Paragraph) and '{PAGES}' in f.text:
                story[story.index(f)] = Paragraph(LB['count'].format(p=pages or '__', f=figs + 5, t=tabs + 2, s=len(C.SOURCES)), body)
        doc = Doc(out); doc.multiBuild(story); pages = doc.page
    print('saved', out, 'pages', pages, 'figures', figs, 'tables', tabs)

if __name__ == '__main__':
    main()
