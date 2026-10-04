(function () {
  const sections = {
    closed: document.getElementById('closed-section'),
    login: document.getElementById('login-section'),
    existing: document.getElementById('existing-section'),
    form: document.getElementById('form-section'),
    confirm: document.getElementById('confirm-section'),
    success: document.getElementById('success-section'),
  };
  function showSection(name) {
    Object.values(sections).forEach(s => s.classList.add('d-none'));
    sections[name].classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  let cfg = {};
  let branchesByLevel = { 'ปวช.': [], 'ปวส.': [] };
  let promosByLevel = {};
  let selectedBranch = null;
  let files = { photo: null, doc1: null, doc2: null };
  let pendingPayload = null;
  let socialLinks = [];

  init();
  setupBirthdayFields();

  function checkCtzID(id) {
    if (!/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseFloat(id.charAt(i)) * (13 - i);
    return (11 - (sum % 11)) % 10 === parseFloat(id.charAt(12));
  }

  function setupBirthdayFields() {
    const daySel = document.getElementById('dob_day');
    const monthSel = document.getElementById('dob_month');
    const yearSel = document.getElementById('dob_year');
    const hidden = document.getElementById('birthday_hidden');
    if (!daySel || !monthSel || !yearSel || !hidden) return;

    const nowBE = new Date().getFullYear() + 543;

    let yearOptions = '<option value="">ปี (พ.ศ.)</option>';
    for (let y = nowBE - 10; y >= nowBE - 90; y--) yearOptions += `<option value="${y}">${y}</option>`;
    yearSel.innerHTML = yearOptions;

    function isLeapYear(gregorianYear) {
      return (gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || (gregorianYear % 400 === 0);
    }
    function daysInMonth(gregorianYear, month) {
      const days = [31, isLeapYear(gregorianYear) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return days[month - 1];
    }

    function refreshDayOptions() {
      const month = Number(monthSel.value);
      const yearBE = Number(yearSel.value);
      const gregorianYear = yearBE ? yearBE - 543 : new Date().getFullYear();
      const maxDay = month ? daysInMonth(gregorianYear, month) : 31;
      const prevValue = daySel.value;
      let opts = '<option value="">วัน</option>';
      for (let d = 1; d <= maxDay; d++) opts += `<option value="${d}">${d}</option>`;
      daySel.innerHTML = opts;
      if (prevValue && Number(prevValue) <= maxDay) daySel.value = prevValue;
    }

    function updateHidden() {
      const d = daySel.value, m = monthSel.value, yBE = yearSel.value;
      const dobGroup = document.getElementById('dob_group');
      if (d && m && yBE) {
        const gregorianYear = Number(yBE) - 543;
        hidden.value = `${gregorianYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dobGroup) dobGroup.classList.remove('is-invalid-group');
      } else {
        hidden.value = '';
      }
    }

    refreshDayOptions();
    monthSel.addEventListener('change', () => { refreshDayOptions(); updateHidden(); });
    yearSel.addEventListener('change', () => { refreshDayOptions(); updateHidden(); });
    daySel.addEventListener('change', updateHidden);
  }

  async function init() {
    showLoader('กำลังตรวจสอบสถานะระบบ...');
    const promoContainer = document.getElementById('promo_container');
    if (promoContainer) promoContainer.classList.add('d-none');

    const [fetchedCfg, fetchedSocialLinks] = await Promise.all([
      fetchConfig(),
      fetchSocialLinks()
    ]);
    cfg = fetchedCfg;
    socialLinks = fetchedSocialLinks || [];

    if (document.getElementById('nav-school-name')) document.getElementById('nav-school-name').textContent = cfg.school_name || '';

    const navSchoolEn = document.getElementById('nav-school-name-en');
    if (navSchoolEn) {
      if (cfg.school_name_en) {
        navSchoolEn.textContent = cfg.school_name_en;
        navSchoolEn.classList.remove('d-none');
      } else {
        navSchoolEn.classList.add('d-none');
      }
    }

    const logoEl = document.getElementById('nav-logo');
    const footerLogo = document.getElementById('footer-logo');

    if (logoEl || footerLogo) {
      if (cfg.logo_url) {
        if (logoEl) {
          logoEl.src = toDriveImgSrc(cfg.logo_url);
          logoEl.classList.remove('d-none');
        }
        if (footerLogo) {
          footerLogo.src = toDriveImgSrc(cfg.logo_url);
          footerLogo.classList.remove('d-none');
        }
      } else {

        const defaultLogo = toDriveImgSrc('1hQmJz3B281BiRsrDluYP7HVpabqNPhqF');
        if (logoEl) {
          logoEl.src = defaultLogo;
          logoEl.classList.remove('d-none');
        }
        if (footerLogo) {
          footerLogo.src = defaultLogo;
          footerLogo.classList.remove('d-none');
        }
      }
    }

    const fs = document.getElementById('footer-school-name');
    if (fs) fs.textContent = cfg.school_name || '';

    const footSchoolEn = document.getElementById('footer-school-name-en');
    if (footSchoolEn) {
      if (cfg.school_name_en) {
        footSchoolEn.textContent = cfg.school_name_en;
        footSchoolEn.classList.remove('d-none');
      } else {
        footSchoolEn.classList.add('d-none');
      }
    }

    const footSlogan = document.getElementById('footer-slogan');
    if (footSlogan) {
      if (cfg.slogan) {
        footSlogan.textContent = cfg.slogan;
        footSlogan.classList.remove('d-none');
      } else {
        footSlogan.classList.add('d-none');
      }
    }

    if (document.getElementById('footer-address')) document.getElementById('footer-address').textContent = cfg.school_address || '';
    if (document.getElementById('footer-phone')) document.getElementById('footer-phone').textContent = cfg.school_phone ? `โทร. ${cfg.school_phone}` : '';
    if (document.getElementById('footer-yr')) document.getElementById('footer-yr').textContent = new Date().getFullYear() + 543;

    if (cfg.favicon_url) {
      const fav = document.getElementById('favicon');
      if (fav) fav.href = toDriveImgSrc(cfg.favicon_url);
    }


    const videoCol = document.getElementById('apply-video-col');
    if (videoCol) {
      const parsedYoutubeId = extractYouTubeId(cfg.youtube_id);
      if (parsedYoutubeId) {
        document.getElementById('apply-video-container').innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(parsedYoutubeId)}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-100 h-100" style="border-radius: var(--radius-sm);"></iframe>`;
      } else {

        videoCol.classList.replace('d-lg-block', 'd-none');
        const descCol = videoCol.previousElementSibling;
        if (descCol) {
          descCol.classList.replace('col-lg-6', 'col-lg-12');
        }
      }
    }


    if (cfg.line_link) {
      document.querySelectorAll('.contact-line-link').forEach(el => {
        el.href = cfg.line_link;
        if (cfg.line_desc) el.textContent = cfg.line_desc;
      });
    }

    const [pvc, pvs] = await Promise.all([fetchBranches('ปวช.'), fetchBranches('ปวส.')]);
    branchesByLevel['ปวช.'] = pvc;
    branchesByLevel['ปวส.'] = pvs;

    const promos = await fetchPromotions();
    promos.forEach(p => {
      if (!promosByLevel[p.level]) promosByLevel[p.level] = [];
      promosByLevel[p.level].push(p);
    });

    const links = await fetchSocialLinks();
    const linkHost = document.getElementById('footer-links');
    if (linkHost) {
      linkHost.innerHTML = links.map(l => `
        <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="btn btn-outline-light rounded-pill btn-sm me-2 mb-2">
          <i class="bi ${escapeHtml(l.icon) || 'bi-link-45deg'} me-1"></i>${escapeHtml(l.label)}
        </a>`).join('');
    }
    hideLoader();

    const qsId = new URLSearchParams(window.location.search).get('id');
    const qsUid = new URLSearchParams(window.location.search).get('uid');
    if (qsId || qsUid) {
      showLoader('กำลังโหลดข้อมูล...');
      const { data: qsApp, error: qsError } = await sb.rpc('get_application_info', {
        p_id: qsId || null,
        p_uid: qsUid ? qsUid.toLowerCase() : null
      }).single();
      hideLoader();
      if (!qsError && qsApp) {
        document.getElementById('success-docno').textContent = qsApp.doc_no || '-';
        const pdfLink = document.getElementById('success-pdf-link');
        if (qsApp.pdf_url) {
          pdfLink.href = toViewDriveUrl(qsApp.pdf_url);
          pdfLink.classList.remove('d-none');
        } else {
          pdfLink.classList.add('d-none');
        }
        document.getElementById('success-summary').innerHTML = [
          summaryRow('สมัครเรียน', `${qsApp.level} ${qsApp.branch}`),
          summaryRow('ชื่อ-นามสกุล', `${qsApp.prefix}${qsApp.name} ${qsApp.lastname}`),
          summaryRow('สถานะ', statusLabel(qsApp.status)),
        ].join('');
        const pdfStatusError = document.getElementById('pdf-status-error');
        if (pdfStatusError) pdfStatusError.classList.add('d-none');

        renderPaymentBox(qsApp, 'success-payment-box');

        showSection('success');
        return;
      } else {
        showToast('ไม่พบข้อมูลใบสมัครจากลิงก์ดังกล่าว', 'danger');
      }
    }

    if (String(cfg.form_closed).toUpperCase() === 'TRUE') {
      showSection('closed');
      return;
    }
    showSection('login');
  }

  document.getElementById('cid_login').addEventListener('input', function () {
    this.classList.remove('is-invalid');
  });

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cidInput = document.getElementById('cid_login');
    const cid = cidInput.value.trim();
    if (!checkCtzID(cid)) {
      cidInput.classList.add('is-invalid');
      if (typeof showToast === 'function') showToast('เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'danger');
      return;
    }

    showLoader('กำลังตรวจสอบข้อมูล...');

    // ดึง token ของ reCAPTCHA เพื่อป้องกัน Bot สุ่มยิงเลขประชาชน (Brute-force)
    let recaptchaToken = '';
    if (typeof grecaptcha !== 'undefined') {
      try {
        recaptchaToken = await grecaptcha.execute('6LcKuNotAAAAAN3yxsHVEWouqwHbfyHRF5dS_Kz7', { action: 'check_application' });
      } catch (e) {
        console.warn('reCAPTCHA check failed:', e);
      }
    }

    const { data: resData, error: funcError } = await sb.functions.invoke('check-application', {
      body: { token: recaptchaToken, cid: cid }
    });

    hideLoader();

    if (funcError) {
      if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาด: ' + funcError.message, 'danger');
      return;
    }

    if (resData && resData.error) {
      if (typeof showToast === 'function') showToast(resData.error, 'danger');
      return;
    }

    const data = resData.data;

    if (data && data.length > 0) {
      renderExisting(data[0]);
      showSection('existing');
    } else {
      document.getElementById('idcard').value = cid;
      document.getElementById('idcard_display').value = cid;
      showSection('form');
    }
  });

  document.getElementById('btn-back-login').addEventListener('click', () => showSection('login'));
  document.getElementById('btn-back-login2').addEventListener('click', () => showSection('login'));

  function renderExisting(app) {
    const dl = document.getElementById('existing-summary');
    dl.innerHTML = summaryRow('เลขที่ใบสมัคร', app.doc_no) +
      summaryRow('ระดับ/สาขา', `${app.level} ${app.branch}`) +
      summaryRow('ชื่อ-นามสกุล', `${app.prefix}${app.name} ${app.lastname}`) +
      summaryRow('เบอร์โทร', app.student_phone ? app.student_phone.replace(/(\d{3})\d{4}(\d{3})/, '$1XXXX$2') : '-') +
      summaryRow('สถานะ', statusLabel(app.status));

    const link = document.getElementById('existing-pdf-link');
    const retryBtn = document.getElementById('btn-retry-pdf-existing');
    const errorBox = document.getElementById('existing-pdf-error');
    errorBox.classList.add('d-none');

    if (app.pdf_url) {
      link.href = toViewDriveUrl(app.pdf_url);
      link.classList.remove('d-none');
      retryBtn.classList.add('d-none');
    } else {
      link.classList.add('d-none');
      retryBtn.classList.remove('d-none');
      retryBtn.onclick = () => regeneratePdf(app, retryBtn, link, errorBox);
    }

    renderPaymentBox(app, 'existing-payment-box');
  }

  function statusLabel(s) {
    const text = { pending: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' }[s] || s;
    let badgeClass = 'bg-secondary';
    if (s === 'pending') badgeClass = 'bg-warning text-dark';
    else if (s === 'approved') badgeClass = 'bg-success';
    else if (s === 'rejected') badgeClass = 'bg-danger';
    return `<span class="badge ${badgeClass} fs-6 px-3 py-2 shadow-sm">${text}</span>`;
  }
  function summaryRow(label, value) {
    return `<dt class="col-5 text-muted">${label}</dt><dd class="col-7">${value ?? '-'}</dd>`;
  }

  function renderPaymentBox(app, targetId) {
    const box = document.getElementById(targetId);
    if (!box) return;


    const section = box.closest('section');
    if (section) {
      const warningText = section.querySelector('.text-danger.fw-bold.large');
      if (warningText) {
        if (app.status === 'approved') warningText.classList.add('d-none');
        else warningText.classList.remove('d-none');
      }
    }

    let branchStr = app.branch || '';
    const group = branchesByLevel[app.level] || [];

    const branchInfo = group.find(b => branchStr.includes(b.name) || branchDisplayName(b) === branchStr);

    const priceText = branchInfo && branchInfo.price ? formatBaht(branchInfo.price) : 'รอตรวจสอบอัตราค่าธรรมเนียม';


    const promos = (promosByLevel[app.level] || []).filter(p => p.enabled && p.description);
    const promoListHtml = promos.length > 0
      ? `<div class="mt-4 mb-3">
           <h6 class="text-brand fw-bold mb-3"><i class="bi bi-tags-fill me-2"></i>ส่วนลดและโปรโมชั่นพิเศษ!</h6>
           ${promos.map(p => {
        let desc = escapeHtml(p.description || '').replace(/\\n|\n/g, '<br>');
        desc = desc.replace(/\s+-\s+(?=[a-zA-Zก-๙])/g, '<br><span class="text-danger ms-2 me-1">-</span>');
        return `
             <div class="card border-0 shadow-sm mb-3" style="background:#fff4f4; border: 1px solid #ffcccc !important;">
               <div class="row g-0 align-items-center">
                 ${p.image_url ? `<div class="col-4 col-sm-3 p-2"><img src="${escapeHtml(toDriveImgSrc(p.image_url))}" class="img-fluid rounded shadow-sm object-fit-cover promo-payment-zoomable" alt="Promo" role="button" title="คลิกเพื่อดูรูปขนาดเต็ม" style="cursor:zoom-in; transition:transform .2s;"></div>` : ''}
                 <div class="${p.image_url ? 'col-8 col-sm-9' : 'col-12'}">
                   <div class="card-body py-3 px-3">
                     <h6 class="card-title fw-bold text-danger mb-2">${escapeHtml(p.title) || 'โปรโมชั่น'}</h6>
                     <p class="card-text mb-0 small text-dark fw-medium" style="line-height:1.6">${desc}</p>
                   </div>
                 </div>
               </div>
             </div>
             `;
      }).join('')}
         </div>`
      : '';

    const bankImgSrc = cfg.bank_account_image ? toDriveImgSrc(cfg.bank_account_image) : null;
    const bankHtml = bankImgSrc
      ? `<img src="${bankImgSrc}" alt="Bank Card" class="img-fluid rounded-3 shadow-sm border bank-card-zoomable" onerror="this.style.display='none'" style="max-height:80px; object-fit:contain; background:#fff; cursor:zoom-in;">`
      : '<i class="bi bi-credit-card-2-front display-4 text-muted"></i>';

    const hasGlobalDiscount = (app.level === 'ปวช.' && String(cfg.pvc_discount_active).toUpperCase() === 'TRUE') ||
      (app.level === 'ปวส.' && String(cfg.pvs_discount_active).toUpperCase() === 'TRUE');

    let priceDisplayHtml = `<strong class="fs-5 text-dark">${priceText}</strong>`;
    if (hasGlobalDiscount && branchInfo && branchInfo.price) {
      priceDisplayHtml = `
        <div class="text-end d-flex flex-column align-items-end">
          <span class="fs-5 text-danger text-decoration-line-through mb-1">${priceText}</span>
          <span class="badge bg-success rounded-pill px-3 py-2 fs-6 shadow-sm" style="background-color: #ff3366 !important;"><i class="bi bi-tags-fill me-1"></i>ได้รับส่วนลด</span>
        </div>
      `;
    }

    let paymentHtml = '';
    if (app.status !== 'approved') {
      paymentHtml = `
      <div class="card bg-light border-0 rounded-4 p-3 p-md-4">
        <h5 class="fw-bold mb-3 text-center"><i class="bi bi-wallet2 me-2"></i>สรุปค่าใช้จ่ายและการชำระเงิน</h5>
        
        <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-3">
          <span class="text-muted">ค่าใช้จ่ายรวม (บาท):</span>
          ${priceDisplayHtml}
        </div>
        
        ${promoListHtml}

        <div class="alert alert-warning mt-4 mb-4 border-warning border-opacity-50" style="background:#FFFDF8">
          <h6 class="fw-bold text-dark"><i class="bi bi-bank me-2"></i>ช่องทางการโอนเงินชำระค่าธรรมเนียม</h6>
          <div class="d-flex flex-column flex-sm-row align-items-center gap-3 mt-3">
            ${bankHtml}
            <div>
              <p class="mb-1"><strong>ธนาคาร:</strong> ${escapeHtml(cfg.bank_name) || '-'}</p>
              <p class="mb-1"><strong>เลขที่บัญชี:</strong> <span class="fs-5 text-primary fw-bold">${escapeHtml(cfg.bank_account_no) || '-'}</span></p>
              <p class="mb-0"><strong>ชื่อบัญชี:</strong> ${escapeHtml(cfg.bank_account_name) || '-'}</p>
            </div>
          </div>
        </div>
        
        ${(() => {
          const lineLinkObj = socialLinks.find(l => (l.icon || '').toLowerCase().includes('line') || (l.label || '').toLowerCase().includes('line') || (l.url || '').toLowerCase().includes('line.me'));
          const lineUrl = lineLinkObj ? lineLinkObj.url : '#';
          const lineLabel = lineLinkObj ? lineLinkObj.label : '';
          return `
            <div class="text-center rounded-3 p-3 bg-white border">
            <p class="mb-2"><strong><i class="bi bi-clipboard-check-fill text-success"></i> สอบถามจำนวนเงิน ก่อนการโอนชำระ </strong></p>
              <p class="mb-2"><strong><i class="bi bi-clipboard-check-fill text-success"></i> ส่งสลิปแจ้งการโอนเงินได้ที่</strong></p>
              <a href="${lineUrl}" target="_blank" class="d-inline-block transition-hover">
                <img src="https://scdn.line-apps.com/n/line_add_friends/btn/th.png" alt="เพิ่มเพื่อน LINE" height="36" class="shadow-sm rounded">
                &nbsp; ${lineLabel}
              </a>
              <p class="text-center text-muted small mt-3 mb-0 text-start" style="line-height:1.6">
                * โดยให้แจ้ง <strong>ชื่อ-นามสกุล หมายเลขโทรศัพท์</strong> รวมทั้ง <strong>ระดับ และสาขา</strong> ที่ได้สมัครเรียน
              </p>
            </div>
          `;
        })()}
      </div>`;
    } else {
      const slips = (app.payment_slip_url || '').split(',').map(s => s.trim()).filter(Boolean);
      if (slips.length > 0) {
        const slipsHtml = slips.map(slipId =>
          `<div class="col-6 col-md-4 mb-3">
                    <img src="${toDriveImgSrc(slipId)}" class="img-fluid rounded shadow-sm border slip-zoomable" style="cursor:zoom-in; object-fit: cover; height: 150px; width: 100%;" alt="Payment Slip">
                 </div>`
        ).join('');
        paymentHtml = `
            <div class="card bg-success bg-opacity-10 border-success border-opacity-25 rounded-4 p-3 p-md-4 mb-4">
              <h5 class="fw-bold mb-3 text-center text-success"><i class="bi bi-check-circle-fill me-2"></i>ชำระเงินเรียบร้อยแล้ว</h5>
              <div class="row justify-content-center mt-3">
                  ${slipsHtml}
              </div>
            </div>`;
      }
    }

    box.innerHTML = `
      ${paymentHtml}

      ${(() => {
        const fbLinkObj = socialLinks.find(l => (l.icon || '').toLowerCase().includes('facebook') || (l.label || '').toLowerCase().includes('facebook') || (l.url || '').toLowerCase().includes('facebook.com'));
        const fbUrl = fbLinkObj ? fbLinkObj.url : '#';
        const fbLabel = fbLinkObj ? (fbLinkObj.label || 'เพจวิทยาลัย') : 'แฟนเพจวิทยาลัย';
        return `
          <div class="card mt-4 border-0 rounded-4 overflow-hidden shadow-sm position-relative" style="background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);">
            <div class="position-absolute top-0 start-0 w-100 h-100" style="background: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'><g fill=\\'none\\' fill-rule=\\'evenodd\\'><g fill=\\'%230866ff\\' fill-opacity=\\'0.04\\'><path d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/></g></g></svg>'); opacity: 0.8;"></div>
            <div class="card-body p-4 position-relative z-1" style="background-color: #0d6efd1f;">
              <div class="d-flex flex-column align-items-center justify-content-center text-center gap-2">
                <div class="d-flex justify-content-center align-items-center rounded-circle flex-shrink-0" style="width: 56px; height: 56px; background: rgba(8, 102, 255, 0.1); color: #0866FF;">
                  <i class="bi bi-calendar2-check-fill fs-3"></i>
                </div>
                <div>
                  <h6 class="fw-bold mb-1" style="color: #0b3d91;">ประกาศกำหนดการรายงานตัว</h6>
                  <p class="text-center mb-0 text-dark small" style="line-height: 1.6;">
                    กำหนดการ <strong>วันรายงานตัว</strong> และ <strong>วันเปิดเรียน</strong> จะแจ้งให้ทราบทางเพจวิทยาลัย<br>
                    ติดตามข่าวสารได้ที่ <a href="${fbUrl}" target="_blank" class="btn btn-sm btn-primary rounded-pill  px-2 fw-medium shadow-sm transition-hover">
                      <i class="bi bi-facebook me-1"></i>  ${fbLabel}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        `;
      })()}
    `;


    const bankImgEl = box.querySelector('.bank-card-zoomable');
    if (bankImgEl) {
      bankImgEl.addEventListener('click', () => {
        const modalImg = document.getElementById('promoImageModalImg');
        if (modalImg) {
          modalImg.src = bankImgEl.src;
          new bootstrap.Modal(document.getElementById('promoImageModal')).show();
        }
      });
    }


    box.querySelectorAll('.slip-zoomable').forEach(img => {
      img.addEventListener('click', () => {
        const modalImg = document.getElementById('promoImageModalImg');
        if (modalImg) {
          modalImg.src = img.src;
          new bootstrap.Modal(document.getElementById('promoImageModal')).show();
        }
      });
    });


    box.querySelectorAll('.promo-payment-zoomable').forEach(img => {
      img.addEventListener('click', () => {
        const modalImg = document.getElementById('promoImageModalImg');
        if (modalImg) {
          modalImg.src = img.src;
          new bootstrap.Modal(document.getElementById('promoImageModal')).show();
        }
      });
    });
  }






  async function regeneratePdf(app, btn, link, errorBox) {
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>กำลังสร้าง PDF...`;
    errorBox.classList.add('d-none');
    try {
      const [photoBlob, doc1Blob, doc2Blob] = await Promise.all([
        fetchAsBlobSafe(app.file1),
        fetchAsBlobSafe(app.file2),
        fetchAsBlobSafe(app.file3),
      ]);
      const pdfUrl = await buildAndUploadPdf(app, photoBlob, doc1Blob, doc2Blob);
      link.href = toViewDriveUrl(pdfUrl);
      link.classList.remove('d-none');
      btn.classList.add('d-none');
      showToast('สร้างไฟล์ PDF สำเร็จ', 'success');
    } catch (err) {
      console.error(err);
      errorBox.textContent = 'สร้าง PDF ไม่สำเร็จ: ' + (err.message || err);
      errorBox.classList.remove('d-none');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }

  async function buildAndUploadPdf(app, photo, doc1, doc2) {
    const pdfBytes = await generateApplicationPdfFromDocx(app, cfg.year, photo || null, doc1 || null, doc2 || null);
    const levelPrefix = app.level === 'ปวช.' ? 'pvc' : (app.level === 'ปวส.' ? 'pvs' : '');
    const safeDocNo = String(app.doc_no || '').replace(/[^0-9_-]/g, '');
    const pdfUrl = await uploadBytes(pdfBytes, `${app.idcard}/application-${levelPrefix}${safeDocNo}.pdf`, 'application/pdf');
    if (app.uid) {
      const { error } = await sb.rpc('attach_pdf_by_uid', { p_uid: app.uid, p_pdf_url: pdfUrl });
      if (error) throw error;
    } else {
      const { error } = await sb.rpc('attach_pdf_url', { p_idcard: app.idcard, p_pdf_url: pdfUrl });
      if (error) console.warn('attach_pdf_url fallback used');
    }
    return pdfUrl;
  }

  document.querySelectorAll('input[name="reg_type"]').forEach(r => {
    r.addEventListener('change', () => {
      const level = r.value;
      const sel = document.getElementById('branch_select');
      sel.disabled = false;
      sel.innerHTML = `<option value="">— เลือกสาขาวิชา —</option>` +
        branchesByLevel[level].map(b => `<option value="${b.id}">${branchDisplayName(b)}</option>`).join('');
      selectedBranch = null;
      document.getElementById('branch_price_box').innerHTML = '';
      updateSelectionSummary(level, null);
      renderLevelPromo(level);
    });
  });

  function renderLevelPromo(level) {
    const box = document.getElementById('level_promo_box');
    const list = (promosByLevel[level] || []).filter(p => p.enabled && p.description);
    box.innerHTML = list.map(p => {
      let desc = escapeHtml(p.description || '').replace(/\\n|\n/g, '<br>');
      desc = desc.replace(/\s+-\s+(?=[a-zA-Zก-๙])/g, '<br><span class="text-danger ms-2 me-1">-</span>');
      return `
      <div class="promo-banner mb-2">
        <span class="promo-badge">โปรโมชั่น ${escapeHtml(level)}</span>
        ${p.title ? `<h6 class="mt-2 mb-1">${escapeHtml(p.title)}</h6>` : ''}
        <div class="row g-2 align-items-center">
          ${p.image_url ? `<div class="col-3"><img src="${escapeHtml(toDriveImgSrc(p.image_url))}" class="img-fluid rounded-3 promo-img-zoomable" alt="promo" role="button" title="คลิกเพื่อดูรูปขนาดเต็ม" style="cursor:zoom-in; transition:transform .2s;"></div>` : ''}
          <div class="${p.image_url ? 'col-9' : 'col-12'}"><p class="mb-0" style="white-space:pre-line">${desc}</p></div>
        </div>
      </div>`;
    }).join('');


    box.querySelectorAll('.promo-img-zoomable').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('promoImageModalImg').src = img.src;
        new bootstrap.Modal(document.getElementById('promoImageModal')).show();
      });
    });
  }

  document.getElementById('branch_select').addEventListener('change', (e) => {
    const level = document.querySelector('input[name="reg_type"]:checked')?.value;
    const list = branchesByLevel[level] || [];
    selectedBranch = list.find(b => b.id === e.target.value) || null;




    updateSelectionSummary(level, selectedBranch);
  });


  function updateSelectionSummary(level, branch) {
    const box = document.getElementById('selection_summary_box');
    if (!level) {
      box.innerHTML = '';
      return;
    }
    const levelText = level || '...';
    const branchText = branch ? branchDisplayName(branch) : '<span class="opacity-75">ยังไม่ได้เลือก</span>';
    box.innerHTML = `
      <div class="selection-summary-block">
        <div class="selection-summary-icon">
          <i class="bi bi-mortarboard-fill"></i>
        </div>
        <div class="selection-summary-content">
          <div class="selection-summary-label">คุณเลือกสมัครเรียน</div>
          <div class="selection-summary-value">ระดับ <strong>${levelText}</strong>  ·  สาขาวิชา <strong>${branchText}</strong></div>
        </div>
      </div>`;
  }


  let appCropper = null;
  let currentCropTarget = null;
  const appCropModalEl = document.getElementById('appCropModal');

  if (appCropModalEl) {
    const appCropModalInstance = new bootstrap.Modal(appCropModalEl);
    const modalTitleSpan = document.getElementById('appCropModalTitle');
    const ghostInput = document.getElementById('appCropGhostInput');
    const cropperContainer = document.getElementById('appCropContainer');
    const previewImg = document.getElementById('appCropPreviewImg');
    const btnCancelCrop = document.getElementById('btnCancelCropData');
    const btnConfirmCrop = document.getElementById('btnConfirmCrop');


    const cropButtons = document.querySelectorAll('.btn-open-crop-modal');
    cropButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentCropTarget = btn.getAttribute('data-target');
        const titleText = btn.getAttribute('data-title');
        if (modalTitleSpan) modalTitleSpan.textContent = titleText;


        if (appCropper) { appCropper.destroy(); appCropper = null; }
        previewImg.src = '';
        cropperContainer.style.display = 'none';

        appCropModalInstance.show();
      });
    });

    function initCropper(url) {
      cropperContainer.style.display = 'block';
      previewImg.src = url;
      if (appCropper) appCropper.destroy();


      const ratio = (currentCropTarget === 'photo') ? (3 / 4) : NaN;

      appCropper = new Cropper(previewImg, {
        aspectRatio: ratio,
        viewMode: 1,
        autoCropArea: 0.8,
      });
    }

    if (ghostInput) {
      ghostInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) initCropper(URL.createObjectURL(file));
        e.target.value = '';
      });
    }

    appCropModalEl.addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          initCropper(URL.createObjectURL(item.getAsFile()));
          break;
        }
      }
    });

    const updateDocumentThumbnail = (target, blob) => {
      const preview = document.getElementById(`preview_${target}`);
      if (!blob) {
        preview.innerHTML = '';
        return;
      }
      const url = URL.createObjectURL(blob);
      const name = target === 'photo' ? 'photo_cropped.jpg' : (target === 'doc1' ? 'idcard_cropped.jpg' : 'housereg_cropped.jpg');

      preview.innerHTML = `
        <div class="file-thumb-wrap">
          <img src="${url}" alt="${name}" class="file-thumb-img" style="cursor: zoom-in;" title="คลิกเพื่อดูรูปขนาดเต็ม">
          <button type="button" class="file-thumb-remove" title="ลบไฟล์" id="remove_${target}_btn">&times;</button>
          <div class="file-thumb-name">${name}</div>
        </div>`;

      preview.querySelector('img').addEventListener('click', () => {
        const modalImg = document.getElementById('promoImageModalImg');
        if (modalImg) {
          modalImg.src = url;
          new bootstrap.Modal(document.getElementById('promoImageModal')).show();
        }
      });

      preview.querySelector(`#remove_${target}_btn`).addEventListener('click', () => {
        files[target] = null;
        document.getElementById(`file_${target}_data`).value = '';
        preview.innerHTML = '';
      });
    };

    if (btnCancelCrop) {
      btnCancelCrop.addEventListener('click', () => {
        if (appCropper) { appCropper.destroy(); appCropper = null; }
        previewImg.src = '';
        cropperContainer.style.display = 'none';
      });
    }

    if (btnConfirmCrop) {
      btnConfirmCrop.addEventListener('click', () => {
        if (!appCropper) return showToast('กรุณาเลือกรูปภาพก่อน', 'warning');


        let canvasParams = {};
        if (currentCropTarget === 'photo') {
          canvasParams = { width: 300, height: 400 };
        } else {

          canvasParams = { maxWidth: 1200, maxHeight: 1600 };
        }

        appCropper.getCroppedCanvas(canvasParams).toBlob((blob) => {
          files[currentCropTarget] = blob;
          document.getElementById(`file_${currentCropTarget}_data`).value = 'cropped';
          updateDocumentThumbnail(currentCropTarget, blob);
          appCropModalInstance.hide();

          if (appCropper) { appCropper.destroy(); appCropper = null; }
          previewImg.src = '';
          cropperContainer.style.display = 'none';
        }, 'image/jpeg', 0.85);
      });
    }
  }

  function syncParentInfo() {
    const type = document.querySelector('input[name="parent_type"]:checked')?.value;
    const pName = document.querySelector('input[name="parent"]');
    const pOcc = document.querySelector('input[name="parent_occupation"]');
    const pPhone = document.querySelector('input[name="parent_phone"]');
    const pRel = document.querySelector('input[name="parent_relationship"]');
    const parentStars = document.querySelectorAll('.parent-required-star');
    const fatherStars = document.querySelectorAll('.father-required-star');
    const motherStars = document.querySelectorAll('.mother-required-star');


    parentStars.forEach(s => s.classList.add('d-none'));
    fatherStars.forEach(s => s.classList.add('d-none'));
    motherStars.forEach(s => s.classList.add('d-none'));

    if (type === 'บิดา' || type === 'มารดา') {
      const prefix = type === 'บิดา' ? 'father' : 'mother';
      pName.value = document.querySelector(`input[name="${prefix}"]`).value;
      pOcc.value = document.querySelector(`input[name="${prefix}_occupation"]`).value;
      pPhone.value = document.querySelector(`input[name="${prefix}_phone"]`).value;
      pRel.value = type;

      pName.required = false;
      pPhone.required = false;
      pRel.required = false;
      [pName, pPhone, pRel].forEach(el => el.classList.remove('is-invalid'));

      (type === 'บิดา' ? fatherStars : motherStars).forEach(s => s.classList.remove('d-none'));
    } else if (type === 'อื่นๆ') {
      if (pRel.value === 'บิดา' || pRel.value === 'มารดา') {

        pName.value = '';
        pOcc.value = '';
        pPhone.value = '';
        pRel.value = '';
      }

      pName.required = true;
      pPhone.required = true;
      pRel.required = true;
      parentStars.forEach(s => s.classList.remove('d-none'));
    } else {

      pName.required = false;
      pPhone.required = false;
      pRel.required = false;
    }
  }

  document.querySelectorAll('input[name="parent_type"]').forEach(r => r.addEventListener('change', syncParentInfo));
  ['father', 'mother'].forEach(p => {
    ['', '_occupation', '_phone'].forEach(s => {
      const el = document.querySelector(`input[name="${p}${s}"]`);
      el.addEventListener('input', () => { el.classList.remove('is-invalid'); syncParentInfo(); });
    });
  });

  function validateFormFields(form) {
    let ok = true;
    let firstInvalid = null;


    form.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea').forEach(el => {
      if (el.disabled) return;
      el.classList.remove('is-invalid');
      if (!el.checkValidity()) {
        el.classList.add('is-invalid');
        ok = false;
        if (!firstInvalid) firstInvalid = el;
      }
    });


    const groups = {};
    form.querySelectorAll('input[type=radio]').forEach(r => {
      (groups[r.name] = groups[r.name] || []).push(r);
    });
    Object.values(groups).forEach(radios => {
      const container = radios[0].closest('.info-source-grid, #parent_type_group') || radios[0].parentElement;
      const anyRequired = radios.some(r => r.required);
      const anyChecked = radios.some(r => r.checked);
      if (anyRequired && !anyChecked) {
        ok = false;
        container.classList.add('is-invalid-group');
        if (!firstInvalid) firstInvalid = container;
      } else {
        container.classList.remove('is-invalid-group');
      }
    });


    const dobGroup = document.getElementById('dob_group');
    const birthdayHidden = document.getElementById('birthday_hidden');
    if (dobGroup && birthdayHidden) {
      if (!birthdayHidden.value) {
        ok = false;
        dobGroup.classList.add('is-invalid-group');
        if (!firstInvalid) firstInvalid = dobGroup;
      } else {
        dobGroup.classList.remove('is-invalid-group');
      }
    }




    const parentType = form.querySelector('input[name="parent_type"]:checked')?.value;
    if (parentType === 'บิดา' || parentType === 'มารดา') {
      const prefix = parentType === 'บิดา' ? 'father' : 'mother';
      ['', '_occupation', '_phone'].forEach(suffix => {
        const el = form.querySelector(`input[name="${prefix}${suffix}"]`);
        if (!el) return;
        el.classList.remove('is-invalid');
        if (!el.value.trim()) {
          el.classList.add('is-invalid');
          ok = false;
          if (!firstInvalid) firstInvalid = el;
        }
      });
    }

    return { ok, firstInvalid };
  }


  document.getElementById('form-apply').querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('is-invalid'));
    el.addEventListener('change', () => {
      el.classList.remove('is-invalid');
      const group = el.closest('.info-source-grid, #parent_type_group, #dob_group');
      if (group) group.classList.remove('is-invalid-group');
    });
  });

  document.getElementById('form-apply').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const { ok, firstInvalid } = validateFormFields(form);
    if (!ok) {
      showToast('กรุณากรอกข้อมูลที่จำเป็น (มีเครื่องหมาย *) ให้ครบถ้วน', 'danger');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof firstInvalid.focus === 'function') firstInvalid.focus();
      }
      return;
    }
    if (!selectedBranch) { showToast('กรุณาเลือกสาขาวิชา', 'danger'); return; }

    const fd = new FormData(form);
    const level = document.querySelector('input[name="reg_type"]:checked').value;

    pendingPayload = {
      idcard: document.getElementById('idcard').value,
      level,
      branch: branchDisplayName(selectedBranch),
      branch_id: selectedBranch.id,
    };
    ['prefix', 'name', 'lastname', 'nickname', 'birthday', 'race', 'nationality', 'religion', 'weight', 'height',
      'student_phone', 'student_email', 'old_grad', 'old_grad_year', 'school', 'school_province',
      'house_no', 'village_no', 'village', 'road', 'alley', 'district', 'amphoe', 'province', 'zipcode',
      'father', 'father_occupation', 'father_phone', 'mother', 'mother_occupation', 'mother_phone',
      'parent', 'parent_occupation', 'parent_phone', 'parent_relationship', 'info_source'
    ].forEach(k => pendingPayload[k] = fd.get(k) || '');

    renderConfirm(pendingPayload);
    showSection('confirm');
  });

  function renderConfirm(p) {
    const dl = document.getElementById('confirm-summary');
    dl.innerHTML = [
      summaryRow('สมัครเรียน', `${p.level} ${p.branch}`),
      summaryRow('ชื่อ-นามสกุล', `${p.prefix}${p.name} ${p.lastname} (${p.nickname || '-'})`),
      summaryRow('เลขประจำตัวประชาชน', p.idcard),
      summaryRow('วันเกิด', p.birthday),
      summaryRow('เบอร์โทร', p.student_phone),
      summaryRow('E-mail', p.student_email),
      summaryRow('สถานศึกษาเดิม', `${p.school} (${p.school_province})`),
      summaryRow('ที่อยู่', [p.house_no, p.village_no && ('หมู่ ' + p.village_no), p.village, p.district, p.amphoe, p.province, p.zipcode].filter(Boolean).join(' ')),
      summaryRow('ผู้ปกครอง', p.parent || p.father || p.mother || '-'),
      summaryRow('ทราบข้อมูลจาก', p.info_source),
      summaryRow('เอกสารแนบ', `<div class="d-flex flex-wrap gap-3">${buildAttachmentThumbsHtml()}</div>`),
    ].join('');


    dl.querySelectorAll('.confirm-thumb-zoomable').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('promoImageModalImg').src = img.src;
        new bootstrap.Modal(document.getElementById('promoImageModal')).show();
      });
    });
  }

  function buildAttachmentThumbsHtml() {
    const items = [
      { key: 'photo', previewId: 'preview_photo', label: 'รูปถ่าย' },
      { key: 'doc1', previewId: 'preview_doc1', label: 'สำเนาบัตรประชาชน' },
      { key: 'doc2', previewId: 'preview_doc2', label: 'สำเนาทะเบียนบ้าน' },
    ];
    let html = '';
    items.forEach(({ key, previewId, label }) => {
      const file = files[key];
      if (!file) return;
      const imgEl = document.querySelector(`#${previewId} .file-thumb-img`);
      if (imgEl) {
        html += `
          <div class="confirm-attach-thumb">
            <img src="${imgEl.src}" alt="${label}" class="confirm-thumb-img confirm-thumb-zoomable" title="คลิกเพื่อดูรูปขนาดเต็ม">
            <div class="confirm-thumb-label">${label}</div>
          </div>`;
      } else {
        html += `
          <div class="confirm-attach-thumb">
            <div class="confirm-thumb-icon"><i class="bi bi-file-earmark-pdf-fill"></i></div>
            <div class="confirm-thumb-label">${label}</div>
          </div>`;
      }
    });
    return html || '<span class="text-muted">ไม่มีไฟล์แนบ</span>';
  }

  document.getElementById('btn-edit').addEventListener('click', () => showSection('form'));

  document.getElementById('btn-confirm-submit').addEventListener('click', async () => {
    try {
      showLoader('กำลังอัปโหลดเอกสาร...');
      const idcard = pendingPayload.idcard;

      if (files.photo) pendingPayload.file1 = await uploadFile(files.photo, `${idcard}/photo`);
      if (files.doc1) pendingPayload.file2 = await uploadFile(files.doc1, `${idcard}/doc1`);
      if (files.doc2) pendingPayload.file3 = await uploadFile(files.doc2, `${idcard}/doc2`);

      showLoader('ตรวจสอบความปลอดภัยหน้าเว็บ (reCAPTCHA)...');
      let recaptchaToken = '';
      if (typeof grecaptcha !== 'undefined') {
        try {
          recaptchaToken = await grecaptcha.execute('6LcKuNotAAAAAN3yxsHVEWouqwHbfyHRF5dS_Kz7', { action: 'submit_application' });
        } catch (e) {
          console.warn('reCAPTCHA execute failed:', e);
        }
      }

      showLoader('กำลังบันทึกใบสมัคร...');
      let data, error;

      if (recaptchaToken) {
        // ส่งยิงผ่าน Edge Function ที่มีระบบป้องกัน Bot 
        const res = await sb.functions.invoke('submit-application', {
          body: { token: recaptchaToken, p: pendingPayload }
        });

        if (res.error) {
          error = res.error;
        } else if (res.data && res.data.error) {
          error = new Error(res.data.error);
        } else {
          data = res.data?.data;
        }
      } else {
        // Fallback กรณีที่ยังไม่ได้เปลี่ยน Site Key หรือ Google โหลดไม่ขึ้น เพื่อให้ระบบยังรับสมัครได้
        const rpcRes = await sb.rpc('submit_application', { p: pendingPayload });
        data = rpcRes.data;
        error = rpcRes.error;
      }

      if (error) throw error;

      if (data.result === 'exists') {
        hideLoader();
        showToast('พบเลขประจำตัวประชาชนนี้ในระบบแล้ว', 'danger');
        showSection('login');
        return;
      }

      const app = data.data;

      // showLoader('กำลังสร้างลิงก์รายละเอียดส่วนตัว...');
      try {
        const { data: uidData, error: uidError } = await sb.functions.invoke('generate-uid', {
          body: { appId: app.id }
        });

        if (uidError) throw uidError;
        if (uidData && uidData.error) throw new Error(uidData.error);
        if (uidData && uidData.uid) {
          app.uid = uidData.uid;
        } else {
          throw new Error('ไม่พบข้อมูล UID ใน response');
        }
      } catch (err) {
        console.error('UID Generation Error:', err);
        showToast('แจ้งเตือน (แอดมิน): การสร้าง UID ล้มเหลว กรุณาตรวจสอบ Edge Function - ' + (err.message || String(err)), 'danger');
        // เรายังคงปล่อยให้ทำงานต่อ แต่จะไม่ระบุ uid (fallback ไปใช้ id แทน)
      }

      showLoader('กำลังสร้างไฟล์ใบสมัคร PDF...');
      const pdfUrl = await buildAndUploadPdf(app, files.photo, files.doc1, files.doc2);

      showLoader('กำลังส่งอีเมลยืนยัน...');
      const isEmailEnabled = (cfg.enable_send_email === undefined) ? true : String(cfg.enable_send_email).toUpperCase() === 'TRUE';
      if (app.student_email && isEmailEnabled) {
        try {
          const currentUrl = window.location.origin + window.location.pathname.replace(/\/apply\.html$/, '');
          const { error: emailError } = await sb.functions.invoke('send-confirmation-email', {
            body: {
              app: { ...app, pdf_url: pdfUrl },
              site_url: currentUrl,
              origin_url: currentUrl
            },
          });
          if (emailError) throw emailError;
        } catch (emailErr) {
          console.warn('ส่งอีเมลยืนยันไม่สำเร็จ (ไม่กระทบผลการสมัคร):', emailErr);
        }
      }

      const isLineEnabled = String(cfg.enable_line_notify).toUpperCase() === 'TRUE';
      if (isLineEnabled) {
        sb.functions.invoke('send-line-notification', {
          body: {
            app: app,
            pdf_url: toViewDriveUrl(pdfUrl)
          }
        }).catch(e => console.warn('Edge Function Line Notification Error:', e));
      }

      hideLoader();
      document.getElementById('success-docno').textContent = app.doc_no;
      document.getElementById('success-pdf-link').href = toViewDriveUrl(pdfUrl);
      document.getElementById('success-summary').innerHTML = [
        summaryRow('สมัครเรียน', `${app.level} ${app.branch}`),
        summaryRow('ชื่อ-นามสกุล', `${app.prefix}${app.name} ${app.lastname}`),
        summaryRow('สถานะ', statusLabel(app.status)),
      ].join('');
      document.getElementById('pdf-status-error').classList.add('d-none');

      renderPaymentBox(app, 'success-payment-box');

      showSection('success');
    } catch (err) {
      console.error(err);
      hideLoader();
      showToast('เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่อีกครั้ง: ' + (err.message || err), 'danger');
    }
  });

  async function uploadFile(file, pathPrefix) {
    const filename = file.name || 'image.jpg';
    const ext = (filename.split('.').pop() || 'dat').toLowerCase();
    return uploadBytes(await file.arrayBuffer(), `${pathPrefix}.${ext}`, file.type);
  }

  async function uploadBytes(bytes, path, contentType) {
    const idcard = path.split('/')[0];
    const filename = path.split('/').slice(1).join('/') || path;

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: contentType }), filename);
    form.append('idcard', idcard);
    form.append('filename', filename);

    let fileId = null;
    let retries = 3;
    let lastErr = null;
    while (retries > 0 && !fileId) {
      try {
        const { data, error } = await sb.functions.invoke('upload-media', { body: form });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        fileId = data.fileId || data.directUrl || data.url;
      } catch (invokeErr) {
        lastErr = invokeErr;
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 1500));
      }
    }
    if (!fileId) throw lastErr || new Error("Upload failed after 3 retries");
    return fileId;
  }
})();


