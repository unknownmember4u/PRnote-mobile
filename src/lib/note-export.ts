import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  Paragraph,
  TextRun,
} from 'docx';
import { jsPDF } from 'jspdf';
import type { Note, NoteImage } from '@/lib/store';
import { getShareText, parseNoteContentBlocks, stripNoteTextMarkers } from '@/lib/note-content';

export type ExportFormat = 'text' | 'pdf' | 'docx';

export type ExportableNote = Pick<Note, 'title' | 'content' | 'checklistItems' | 'noteType' | 'images'>;

type PdfBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; image: NoteImage };

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        reject(new Error('Could not prepare export file.'));
        return;
      }

      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not prepare export file.'));
    reader.readAsDataURL(file);
  });
}

function getNoteLines(note: ExportableNote): string[] {
  if (note.noteType === 'checklist') {
    return note.checklistItems
      .map((item) => item.text.trim() ? `${item.checked ? '[x]' : '[ ]'} ${item.text.trim()}` : null)
      .filter((line): line is string => Boolean(line));
  }

  const content = stripNoteTextMarkers(note.content).trim();
  return content ? content.split('\n') : [];
}

function getExportImages(note: ExportableNote): NoteImage[] {
  return (note.images ?? []).filter((image) => image.visibleIn === note.noteType);
}

function getExportBlocks(note: ExportableNote): PdfBlock[] {
  const images = getExportImages(note);

  if (note.noteType === 'checklist') {
    return [
      ...getNoteLines(note).map((text) => ({ type: 'text' as const, text })),
      ...images.map((image) => ({ type: 'image' as const, image })),
    ];
  }

  const imageById = new Map(images.map((image) => [image.id, image] as const));
  const blocks = parseNoteContentBlocks(note.content);
  const result: PdfBlock[] = [];
  const usedImages = new Set<string>();

  for (const block of blocks) {
    if (block.type === 'text') {
      if (block.text.trim()) {
        result.push({ type: 'text', text: block.text });
      }
      continue;
    }

    if (block.type === 'legacy-break') {
      images.forEach((image) => {
        if (!usedImages.has(image.id)) {
          result.push({ type: 'image', image });
          usedImages.add(image.id);
        }
      });
      continue;
    }

    const image = imageById.get(block.imageId);
    if (!image || usedImages.has(image.id)) {
      continue;
    }

    result.push({ type: 'image', image });
    usedImages.add(image.id);
  }

  images.forEach((image) => {
    if (!usedImages.has(image.id)) {
      result.push({ type: 'image', image });
    }
  });

  return result;
}

function getTextExportContent(note: ExportableNote): string {
  const title = note.title.trim() || 'Untitled';
  const images = getExportImages(note);

  if (note.noteType === 'checklist') {
    const lines = note.checklistItems
      .map((item) => item.text.trim() ? `- [${item.checked ? 'x' : ' '}] ${item.text.trim()}` : null)
      .filter((line): line is string => Boolean(line));

    const imageLines = images.map((image) => `[Image: ${image.name}]`);
    return [title, ...lines, ...imageLines].join('\n').trim();
  }

  const blocks = getExportBlocks(note);
  const sections: string[] = [title];

  blocks.forEach((block) => {
    if (block.type === 'text') {
      const text = stripNoteTextMarkers(block.text).trim();
      if (text) {
        sections.push(text);
      }
      return;
    }

    sections.push(`[Image: ${block.image.name}]`);
  });

  return sections.join('\n\n').trim();
}

async function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 1,
        height: image.naturalHeight || image.height || 1,
      });
    };
    image.onerror = () => reject(new Error('Could not load note image.'));
    image.src = dataUrl;
  });
}

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function getImageFormat(mimeType: string): 'PNG' | 'JPEG' {
  return mimeType.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
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
  const blocks = getExportBlocks(note);
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

  const renderHeader = () => {
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
  };

  const addPageWithHeader = () => {
    doc.addPage();
    drawPageBorder();
    cursorY = marginY + 22;
    renderHeader();
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight > pageHeight - marginY) {
      addPageWithHeader();
    }
  };

  const renderText = (line: string) => {
    const wrappedLine = doc.splitTextToSize(line || ' ', contentWidth);
    const requiredHeight = wrappedLine.length * 20 + 8;
    ensureSpace(requiredHeight);
    doc.text(wrappedLine, marginX, cursorY);
    cursorY += requiredHeight;
  };

  const renderImage = async (image: NoteImage) => {
    const dimensions = await loadImageDimensions(image.dataUrl);
    const maxWidth = contentWidth;
    const maxHeight = 320;
    const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height, 1);
    const width = dimensions.width * scale;
    const height = dimensions.height * scale;
    const requiredHeight = height + 12;
    ensureSpace(requiredHeight);

    const x = marginX + (contentWidth - width) / 2;
    doc.addImage(image.dataUrl, getImageFormat(image.mimeType), x, cursorY, width, height);
    cursorY += requiredHeight;
  };

  for (const block of blocks) {
    if (block.type === 'text') {
      renderText(block.text);
      continue;
    }

    await renderImage(block.image);
  }

  const blob = doc.output('blob');
  return new File([blob], `${sanitizeFilename(title)}.pdf`, { type: 'application/pdf' });
}

async function buildDocxFile(note: ExportableNote): Promise<File> {
  const title = note.title.trim() || 'Untitled';
  const blocks = getExportBlocks(note);

  const children: Paragraph[] = [
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
  ];

  for (const block of blocks) {
    if (block.type === 'text') {
      children.push(
        new Paragraph({
          spacing: {
            line: 360,
            after: 120,
          },
          children: [new TextRun({ text: block.text, size: 24 })],
        }),
      );
      continue;
    }

    const dimensions = await loadImageDimensions(block.image.dataUrl);
    const maxWidth = 500;
    const scale = Math.min(maxWidth / dimensions.width, 1);
    const width = Math.round(dimensions.width * scale);
    const height = Math.round(dimensions.height * scale);
    const imageBytes = await dataUrlToUint8Array(block.image.dataUrl);

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 120,
          after: 180,
        },
        children: [
          new ImageRun({
            data: imageBytes,
            transformation: {
              width,
              height,
            },
          }),
        ],
      }),
    );
  }

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
      children,
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
  const text = getTextExportContent(note) || getShareText(note);
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

  if (Capacitor.isNativePlatform()) {
    const base64Data = await fileToBase64(file);
    const saved = await Filesystem.writeFile({
      path: `exports/${file.name}`,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: note.title.trim() || 'Untitled',
      text: format === 'text' ? getShareText(note) : undefined,
      url: saved.uri,
      dialogTitle: `Export ${format.toUpperCase()}`,
    });
    return;
  }

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
