// Sinh tài liệu Word: node build_doc.js [đường dẫn .docx]
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Footer, Header, PageNumber, LevelFormat, AlignmentType, BorderStyle } = require('docx');
const { COL } = require('./lib');
const intro = require('./content_intro');

const OUT = process.argv[2] || path.join(__dirname, '..', 'SauMoiDongCodeUnity.docx');
const FONT = 'Calibri';

const children = [
  ...intro(),
  ...require('./content_part1')(),
  ...require('./content_part2')(),
  ...require('./content_part3')(),
  ...require('./content_part4')(),
  ...require('./content_part5')(),
  ...require('./content_part6')(),
  ...require('./content_end')(intro.DOC_LINK),
];

const doc = new Document({
  creator: 'Dev Team', title: intro.TITLE, description: 'Tài liệu buổi chia sẻ kiến thức Unity',
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: COL.ink } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 40, bold: true, color: COL.ink, font: FONT }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COL.accent, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: COL.cs, font: FONT }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: COL.ink, font: FONT }, paragraph: { spacing: { before: 400, after: 120 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: intro.TITLE, size: 16, color: COL.muted })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Trang ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 16, color: COL.muted })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('written', OUT, b.length); });
