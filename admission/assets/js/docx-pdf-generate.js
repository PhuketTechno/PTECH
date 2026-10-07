
let DOCX_TEMPLATE_URL = 'assets/templates/application-template.docx';
const scripts = document.getElementsByTagName('script');
for (let i = 0; i < scripts.length; i++) {
  if (scripts[i].src.includes('docx-pdf-generate.js')) {
    DOCX_TEMPLATE_URL = scripts[i].src.replace('js/docx-pdf-generate.js', 'templates/application-template.docx');
    break;
  }
}

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function formatThaiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function calcAge(dobStr) {
  if (!dobStr) return '';
  const today = new Date();
  const dob = new Date(dobStr);
  if (isNaN(dob)) return '';
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return String(age);
}

function dash(v) {
  return (v === undefined || v === null || v === '') ? '-' : String(v);
}

function buildResidence(a) {
  const parts = [];
  if (a.house_no) parts.push(a.house_no);
  if (a.village_no) parts.push('หมู่ ' + a.village_no);
  if (a.village) parts.push(a.village);
  if (a.road) parts.push('ถ.' + a.road);
  if (a.alley) parts.push('ซ.' + a.alley);
  if (a.district) parts.push('ต.' + a.district);
  if (a.amphoe) parts.push('อ.' + a.amphoe);
  if (a.province) parts.push('จ.' + a.province);
  if (a.zipcode) parts.push(a.zipcode);
  return parts.length ? parts.join(' ') : '-';
}

function buildFields(app, yearBE) {
  const parentName = app.parent ? String(app.parent).trim() : '';
  const parentRel = app.parent_relationship ? String(app.parent_relationship).trim() : '';
  let finalParent = dash(parentName);
  if (finalParent !== '-' && parentRel) {
    finalParent += ` (${parentRel})`;
  }

  return {
    YEAR: yearBE || '',
    doc_no: app.doc_no || '',
    level: app.level || '',
    branch: app.branch || '',
    prefix: dash(app.prefix),
    name: dash(app.name),
    lastname: dash(app.lastname),
    idcard: app.idcard || '',
    nickname: dash(app.nickname),
    dob: formatThaiDate(app.birthday),
    age: calcAge(app.birthday),
    race: dash(app.race),
    nationality: dash(app.nationality),
    religion: dash(app.religion),
    weight: app.weight != null ? String(app.weight) : '-',
    height: app.height != null ? String(app.height) : '-',
    student_phone: dash(app.student_phone),
    student_email: dash(app.student_email),
    old_grad: dash(app.old_grad),
    old_grad_year: dash(app.old_grad_year),
    school: dash(app.school),
    schoolProvince: dash(app.school_province),
    residence: buildResidence(app),
    father: dash(app.father),
    father_occupation: dash(app.father_occupation),
    father_phone: dash(app.father_phone),
    mother: dash(app.mother),
    mother_occupation: dash(app.mother_occupation),
    mother_phone: dash(app.mother_phone),
    parent: finalParent,
    parent_occupation: dash(app.parent_occupation),
    parent_phone: dash(app.parent_phone),
    info_source: dash(app.info_source),
    sig_name: `${dash(app.prefix)}${dash(app.name)} ${dash(app.lastname)}`,
    sig_date: formatThaiDate(new Date().toISOString().slice(0, 10)),
  };
}


async function insertPhotoAtPlaceholder(container, photoDataUrl) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes('{picture}')) {
      let cell = node.parentElement;
      while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH') cell = cell.parentElement;
      const target = cell || node.parentElement;
      target.innerHTML = '';
      const img = document.createElement('img');
      img.src = photoDataUrl;
      img.style.width = '100%';
      img.style.maxHeight = '110pt';
      img.style.objectFit = 'cover';
      target.appendChild(img);
      break;
    }
  }
  await new Promise((resolve) => {
    const imgs = container.querySelectorAll('img');
    if (!imgs.length) return resolve();
    let remaining = imgs.length;
    imgs.forEach((im) => {
      if (im.complete) { if (--remaining === 0) resolve(); }
      else im.onload = im.onerror = () => { if (--remaining === 0) resolve(); };
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function renderTextAsPng(text, { widthPx = 900, fontSize = 26, bold = true, color = '#0B2540', align = 'left' } = {}) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.left = '-9999px';
  div.style.top = '0';
  div.style.width = widthPx + 'px';
  div.style.padding = '6px 2px';
  div.style.background = '#ffffff';
  div.style.fontFamily = "'Sarabun', 'TH Sarabun New', sans-serif";
  div.style.fontSize = fontSize + 'px';
  div.style.fontWeight = bold ? '700' : '400';
  div.style.color = color;
  div.style.textAlign = align;
  div.style.whiteSpace = 'nowrap';
  div.style.display = 'inline-block';
  div.textContent = text;
  document.body.appendChild(div);
  await new Promise((r) => setTimeout(r, 30));
  const canvas = await window.html2canvas(div, { scale: 2, backgroundColor: '#ffffff' });
  document.body.removeChild(div);
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

async function imageBlobToJpgBytes(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for PDF generation'));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_SIZE = 1500;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
        else { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(async (outBlob) => {
        resolve(new Uint8Array(await outBlob.arrayBuffer()));
      }, 'image/jpeg', 0.9);
    };
    img.src = url;
  });
}

async function appendAttachments(mainPdfBytes, attachments) {
  const present = attachments.filter((a) => a && a.file);
  if (!present.length) return mainPdfBytes;

  const { PDFDocument, rgb } = window.PDFLib;
  const finalDoc = await PDFDocument.load(mainPdfBytes);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;


  const heading = await renderTextAsPng('📑 เอกสารการสมัครเรียน', { widthPx: 700, fontSize: 30, bold: true });
  const headingImg = await finalDoc.embedPng(heading.dataUrl);
  const headingDispW = Math.min(pageWidth - margin * 2, heading.width / 2);
  const headingDispH = headingDispW * (heading.height / heading.width);

  for (let i = 0; i < present.length; i++) {
    const { label, file } = present[i];
    const isFirstAttachment = (i === 0);

    const labelPng = await renderTextAsPng(label, { widthPx: 600, fontSize: 22, bold: true });
    const isPdf = (file.type === 'application/pdf') || /\.pdf$/i.test(file.name || '');

    if (isPdf) {

      const labelPage = finalDoc.addPage([pageWidth, pageHeight]);
      let cursorY = pageHeight - margin;


      if (isFirstAttachment) {
        labelPage.drawImage(headingImg, { x: margin, y: cursorY - headingDispH, width: headingDispW, height: headingDispH });
        cursorY -= headingDispH + 12;
      }

      const labelImg = await finalDoc.embedPng(labelPng.dataUrl);
      const labelDispW = Math.min(pageWidth - margin * 2, labelPng.width / 2);
      const labelDispH = labelDispW * (labelPng.height / labelPng.width);
      labelPage.drawImage(labelImg, { x: margin, y: cursorY - labelDispH, width: labelDispW, height: labelDispH });

      const srcBytes = await blobToBytes(file);
      const srcDoc = await PDFDocument.load(srcBytes);
      const copiedPages = await finalDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((p) => finalDoc.addPage(p));
    } else {

      const page = finalDoc.addPage([pageWidth, pageHeight]);
      let cursorY = pageHeight - margin;


      if (isFirstAttachment) {
        page.drawImage(headingImg, { x: margin, y: cursorY - headingDispH, width: headingDispW, height: headingDispH });
        cursorY -= headingDispH + 12;
      }


      const labelImg = await finalDoc.embedPng(labelPng.dataUrl);
      const labelDispW = Math.min(pageWidth - margin * 2, labelPng.width / 2);
      const labelDispH = labelDispW * (labelPng.height / labelPng.width);
      page.drawImage(labelImg, { x: margin, y: cursorY - labelDispH, width: labelDispW, height: labelDispH });
      cursorY -= labelDispH + 16;


      const imgBytes = await imageBlobToJpgBytes(file);
      const embedded = await finalDoc.embedJpg(imgBytes);

      const availW = pageWidth - margin * 2;
      const availH = cursorY - margin;
      const scale = Math.min(availW / embedded.width, availH / embedded.height, 1);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      page.drawImage(embedded, {
        x: (pageWidth - w) / 2,
        y: cursorY - h,
        width: w,
        height: h,
      });
    }
  }

  return finalDoc.save();
}










async function generateApplicationPdfFromDocx(app, yearBE, photo, doc1, doc2) {
  const templateRes = await fetch(DOCX_TEMPLATE_URL);
  if (!templateRes.ok) throw new Error('โหลดไฟล์เทมเพลตไม่สำเร็จ: ' + templateRes.status);
  const templateBuf = await templateRes.arrayBuffer();

  const zip = new PizZip(templateBuf);
  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,

    nullGetter: (part) => '{' + part.value + '}',
  });
  doc.render(buildFields(app, yearBE));
  const filledArrayBuffer = doc.getZip().generate({ type: 'arraybuffer' });


  const container = document.createElement('div');
  container.id = 'docx-pdf-render-' + Date.now();
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '816px';
  container.style.background = '#fff';
  document.body.appendChild(container);


  const forceFontStyle = document.createElement('style');
  forceFontStyle.textContent = `#${container.id}, #${container.id} * { font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important; }`;
  document.head.appendChild(forceFontStyle);

  let mainPdfBytes;
  try {
    await window.docx.renderAsync(filledArrayBuffer, container, container, {
      inWrapper: false, ignoreWidth: false, ignoreHeight: false, breakPages: true,
    });

    let photoDataUrl = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' fill='none'%3E%3Ccircle cx='100' cy='100' r='98' fill='%23DDDFE4' stroke='white' stroke-width='4'/%3E%3Cpath d='M145.538 124.371C126.428 118.129 118.484 110.367 118.484 110.367L117.845 110.977C112.169 116.318 105.893 119.458 100.175 119.458H99.6352C93.9176 119.458 87.641 116.318 81.9659 110.977L81.3259 110.367C81.3259 110.367 73.3828 118.129 54.2724 124.371C26.0621 134.909 32.5244 154.536 32.5162 154.868C33.4047 159.645 34.4026 159.514 34.8347 159.943C49.1386 174.151 69.3816 190.007 100.023 190.585C122.795 191.015 150.492 177.968 165.279 161.746C165.73 161.561 167.628 159.645 168.516 154.868C169.584 149.129 173.862 135.08 145.538 124.371Z' fill='%238997B3'/%3E%3C/svg%3E";
    if (photo instanceof Blob) photoDataUrl = await fileToDataUrl(photo);
    else if (typeof photo === 'string' && photo) photoDataUrl = photo;
    await insertPhotoAtPlaceholder(container, photoDataUrl);

    await new Promise((r) => setTimeout(r, 150));

    const pageEls = container.querySelectorAll(':scope > .docx');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const targets = pageEls.length ? pageEls : [container];
    for (let i = 0; i < targets.length; i++) {
      const canvas = await window.html2canvas(targets[i], { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    mainPdfBytes = new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    document.head.removeChild(forceFontStyle);
    document.body.removeChild(container);
  }


  const attachments = [
    { label: 'สำเนาบัตรประชาชน', file: doc1 || null },
    { label: 'สำเนาทะเบียนบ้าน', file: doc2 || null },
  ];
  if (attachments.some((a) => a.file)) {
    mainPdfBytes = await appendAttachments(mainPdfBytes, attachments);
  }

  return mainPdfBytes;
}

window.generateApplicationPdfFromDocx = generateApplicationPdfFromDocx;
