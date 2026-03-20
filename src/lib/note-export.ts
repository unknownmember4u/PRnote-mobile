import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  Paragraph,
  TextRun,
} from 'docx';
import { jsPDF } from 'jspdf';
import type { Note } from '@/lib/store';
import { getShareText } from '@/lib/note-content';

export type ExportFormat = 'text' | 'pdf' | 'docx';

type ExportableNote = Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType'>;

function getNoteLines(note: ExportableNote): string[] {
  if (note.noteType === 'checklist') {
    return note.checklistItems
      .map((item) => item.text.trim() ? `${item.checked ? '[x]' : '[ ]'} ${item.text.trim()}` : null)
      .filter((line): line is string => Boolean(line));
  }

  const content = note.content.trim();
  return content ? content.split('\n') : [];
}

function sanitizeFilename(title: string): string {
  const trimmed = title.trim() || 'Untitled';
  return trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/\s+/g, '-').slice(0, 80) || 'Untitled';
}

async function buildPdfFile(note: ExportableNote): Promise<File> {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const title = note.title.trim() || 'Untitled';
  const lines = getNoteLines(note);
  const marginX = 56;
  const marginY = 56;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  let cursorY = marginY + 22;

  const drawPageBorder = () => {
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(1);
    doc.roundedRect(
      28,
      28,
      pageWidth - 56,
      pageHeight - 56,
      12,
      12,
      'S',
    );
  };

  drawPageBorder();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const wrappedTitle = doc.splitTextToSize(title, contentWidth);
  wrappedTitle.forEach((line, index) => {
    doc.text(line, pageWidth / 2, cursorY + index * 26, { align: 'center' });
  });
  cursorY += wrappedTitle.length * 26 + 18;

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.8);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);

  const bodyLines = lines.length > 0 ? lines : [''];
  for (const line of bodyLines) {
    const wrappedLine = doc.splitTextToSize(line || ' ', contentWidth);

    if (cursorY + wrappedLine.length * 20 > pageHeight - marginY) {
      doc.addPage();
      drawPageBorder();
      cursorY = marginY + 22;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      wrappedTitle.forEach((titleLine, index) => {
        doc.text(titleLine, pageWidth / 2, cursorY + index * 26, { align: 'center' });
      });
      cursorY += wrappedTitle.length * 26 + 18;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.8);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12.5);
    }

    doc.text(wrappedLine, marginX, cursorY);
    cursorY += wrappedLine.length * 20 + 8;
  }

  const blob = doc.output('blob');
  return new File([blob], `${sanitizeFilename(title)}.pdf`, { type: 'application/pdf' });
}

async function buildDocxFile(note: ExportableNote): Promise<File> {
  const title = note.title.trim() || 'Untitled';
  const lines = getNoteLines(note);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 900,
            right: 900,
            bottom: 900,
            left: 900,
          },
          borders: {
            pageBorderTop: { style: BorderStyle.SINGLE, size: 12, color: '8C8C8C', space: 24 },
            pageBorderRight: { style: BorderStyle.SINGLE, size: 12, color: '8C8C8C', space: 24 },
            pageBorderBottom: { style: BorderStyle.SINGLE, size: 12, color: '8C8C8C', space: 24 },
            pageBorderLeft: { style: BorderStyle.SINGLE, size: 12, color: '8C8C8C', space: 24 },
            display: PageBorderDisplay.ALL_PAGES,
            offsetFrom: PageBorderOffsetFrom.PAGE,
            zOrder: PageBorderZOrder.FRONT,
          },
        },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 220,
          },
          children: [new TextRun({ text: title, bold: true, size: 34 })],
        }),
        new Paragraph({
          border: {
            bottom: {
              color: 'B0B0B0',
              style: BorderStyle.SINGLE,
              size: 8,
            },
          },
          spacing: {
            after: 220,
          },
          children: [new TextRun({ text: '' })],
        }),
        ...(
          lines.length > 0
            ? lines.map((line) => new Paragraph({
                spacing: {
                  line: 360,
                  after: 120,
                },
                children: [new TextRun({ text: line, size: 24 })],
              }))
            : [new Paragraph({
                spacing: {
                  line: 360,
                },
                children: [new TextRun({ text: '', size: 24 })],
              })]
        ),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return new File(
    [blob],
    `${sanitizeFilename(title)}.docx`,
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  );
}

async function buildTextFile(note: ExportableNote): Promise<File> {
  const title = note.title.trim() || 'Untitled';
  const text = getShareText(note);
  return new File([text], `${sanitizeFilename(title)}.txt`, { type: 'text/plain;charset=utf-8' });
}

export async function createExportFile(note: ExportableNote, format: ExportFormat): Promise<File> {
  switch (format) {
    case 'pdf':
      return buildPdfFile(note);
    case 'docx':
      return buildDocxFile(note);
    case 'text':
    default:
      return buildTextFile(note);
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function shareOrDownloadNote(note: ExportableNote, format: ExportFormat): Promise<void> {
  const file = await createExportFile(note, format);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const payload = { title: note.title.trim() || 'Untitled', files: [file] };
      if (!('canShare' in navigator) || (navigator.canShare && navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
    } catch {
      // Fall back to download.
    }
  }

  downloadFile(file);
}
