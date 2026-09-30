(function () {
  let dt = null;
  let branchesCache = { 'ปวช.': [], 'ปวส.': [] };

  init();

  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) enterApp();
    else document.getElementById('admin-login').classList.remove('d-none');
  }

  document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin_email').value;
    const password = document.getElementById('admin_password').value;
    showLoader('กำลังเข้าสู่ระบบ...');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    hideLoader();
    if (error) { showToast('เข้าสู่ระบบไม่สำเร็จ: ' + error.message, 'danger'); return; }
    enterApp();
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  });

  async function enterApp() {
    document.getElementById('admin-login').classList.add('d-none');
    document.getElementById('admin-app').classList.remove('d-none');
    const cfg = await fetchConfig();
    document.getElementById('sidebar-school-name').textContent = cfg.school_name || '';
    if (cfg.favicon_url) document.getElementById('favicon').href = cfg.favicon_url;

    setupNav();
    loadDashboard();
  }

  function setupNav() {
    document.querySelectorAll('#admin-nav a, #admin-nav-mobile a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        document.querySelectorAll('#admin-nav a, #admin-nav-mobile a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
        document.querySelectorAll('.admin-view').forEach(v => v.classList.add('d-none'));
        document.getElementById('view-' + view).classList.remove('d-none');
        if (view === 'applications') loadApplications();
        if (view === 'branches') loadBranches();
        if (view === 'promotions') loadPromotions();
        if (view === 'links') loadLinks();
        if (view === 'settings') loadSettings();
        const offcanvasEl = document.getElementById('mobileNav');
        const oc = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (oc) oc.hide();
      });
    });
  }

  async function loadDashboard() {
    const host = document.getElementById('dash-stats');
    host.innerHTML = skeletonStatCards(5);
    try {
      const { data, error } = await sb.from('applications').select('level,status');
      if (error) throw error;
      const total = data.length;
      const pvc = data.filter(a => a.level === 'ปวช.').length;
      const pvs = data.filter(a => a.level === 'ปวส.').length;
      const pending = data.filter(a => a.status === 'pending').length;
      const approved = data.filter(a => a.status === 'approved').length;

      const cards = [
        ['bi-people', total, 'ผู้สมัครทั้งหมด'],
        ['bi-mortarboard', pvc, 'ปวช.'],
        ['bi-mortarboard-fill', pvs, 'ปวส.'],
        ['bi-hourglass-split', pending, 'รอตรวจสอบ'],
        ['bi-patch-check', approved, 'อนุมัติแล้ว'],
      ];
      host.innerHTML = cards.map(([icon, num, label]) => `
        <div class="col-6 col-lg-3">
          <div class="card-soft bg-white p-3 text-center">
            <i class="bi ${icon} fs-2 text-brand"></i>
            <div class="fs-3 fw-semibold">${num}</div>
            <div class="text-muted small">${label}</div>
          </div>
        </div>`).join('');
    } catch (err) {
      console.error('loadDashboard failed:', err);
      host.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">โหลดข้อมูลภาพรวมไม่สำเร็จ: ${escapeHtml(err.message || String(err))}</div></div>`;
    }
  }


  document.getElementById('btn-refresh-apps').addEventListener('click', () => loadApplications(true));

  document.getElementById('btn-export-excel')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-export-excel');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>ส่งออก...';
    btn.disabled = true;

    try {
      const { data, error } = await sb.from('applications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        showToast('ไม่มีข้อมูลใบสมัคร', 'warning');
        return;
      }

      const exportData = data.map((a, idx) => ({
        'ลำดับ': idx + 1,
        'เลขบัตรประชาชน': a.idcard ? "'" + a.idcard : '',
        'ชื่อ-นามสกุล': (a.prefix || '') + (a.name || '') + ' ' + (a.lastname || ''),
        'ระดับ': a.level || '',
        'สาขา': a.branch || '',
        'สถานะ': a.status === 'approved' ? 'อนุมัติแล้ว' : (a.status === 'pending' ? 'รอตรวจสอบ' : (a.status === 'rejected' ? 'ไม่อนุมัติ' : a.status)),
        'สถานศึกษาเดิม': a.school || '',
        'จังหวัดสถานศึกษาเดิม': a.school_province || '',
        'pdf link': a.pdf_url ? toViewDriveUrl(a.pdf_url) : ''
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'applications_report_' + new Date().toISOString().split('T')[0] + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error(err);
      showToast('สร้างไฟล์ล้มเหลว: ' + (err.message || String(err)), 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  async function loadApplications(keepPage = false) {
    let currentPage = 0;
    if (keepPage && dt) {
      currentPage = dt.page.info().page;
    }

    const tbody = document.querySelector('#tbl-applications tbody');
    if (dt) { dt.destroy(); dt = null; }
    tbody.innerHTML = skeletonTableRows(6, 6);

    let data;
    try {
      const res = await sb.from('applications').select('*').order('created_at', { ascending: false });
      if (res.error) throw res.error;
      data = res.data || [];
    } catch (err) {
      console.error('loadApplications failed:', err);
      tbody.innerHTML = `<tr><td colspan="6"><div class="alert alert-danger mb-0">โหลดข้อมูลใบสมัครไม่สำเร็จ: ${escapeHtml(err.message || String(err))}</div></td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((a, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td data-sort="${a.created_at}">${new Date(a.created_at).toLocaleDateString('th-TH')}</td>
        <td>${a.level} ${escapeHtml(a.branch)}</td>
        <td>${escapeHtml(a.prefix + a.name + ' ' + a.lastname)}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-brand-outline btn-view" data-id="${a.id}"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-del" data-id="${a.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', () => openAppModal(data.find(x => x.id === b.dataset.id))));
    tbody.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteApplication(b.dataset.id)));

    if (dt) dt.destroy();
    dt = $('#tbl-applications').DataTable({
      order: [[0, 'asc']],
      language: { search: 'ค้นหา:', lengthMenu: 'แสดง _MENU_ รายการ', info: 'ทั้งหมด _TOTAL_ รายการ', paginate: { previous: 'ก่อนหน้า', next: 'ถัดไป' } },
    });

    if (keepPage) {
      dt.page(currentPage).draw('page');
    }
  }

  function statusBadge(s) {
    const map = { pending: ['secondary', 'รอตรวจสอบ'], approved: ['success', 'อนุมัติแล้ว'], rejected: ['danger', 'ไม่อนุมัติ'] };
    const [cls, label] = map[s] || ['secondary', s];
    return `<span class="badge text-bg-${cls}">${label}</span>`;
  }

  function pdfStatusBadge(app) {
    if (app.pdf_url) {
      return `<span class="badge text-bg-success">พร้อมแล้ว</span> <a href="${toViewDriveUrl(app.pdf_url)}" target="_blank">เปิดไฟล์ PDF</a>`;
    }
    return `<span class="badge text-bg-secondary">ยังไม่มีไฟล์</span>`;
  }

  window.openAdminLightbox = function (src) {
    let lightbox = document.getElementById('adminLightboxModal');
    if (!lightbox) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="adminLightboxModal" tabindex="-1" style="z-index: 1060;">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content bg-transparent border-0">
              <div class="modal-header border-0 pb-0">
                <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center pt-0">
                <img id="adminLightboxImg" src="" class="img-fluid rounded shadow-lg" style="max-height: 85vh; object-fit: contain; cursor: zoom-out;" data-bs-dismiss="modal">
              </div>
            </div>
          </div>
        </div>
      `);
      lightbox = document.getElementById('adminLightboxModal');
    }
    document.getElementById('adminLightboxImg').src = src;
    new bootstrap.Modal(lightbox).show();
  };

  window.parseThaiDateToCE = function (thDateStr) {
    if (!thDateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(thDateStr)) return thDateStr;
    const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const parts = thDateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const mStr = parts[1];
      let y = parseInt(parts[2], 10);
      let mIndex = thMonths.findIndex(m => m === mStr);
      if (mIndex !== -1) {
        if (mIndex >= 12) mIndex -= 12;
        mIndex += 1;
        if (y > 2400) y -= 543;
        return `${y}-${String(mIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return thDateStr;
  };

  function openAppModal(app) {
    window.slipDataTransfer = new DataTransfer();
    if (!app) return;

    function fg(id, label, val, type = "text", xtra = "") {
      return `<div class="col-sm-6 mb-2">
        <label class="form-label small text-muted mb-1">${label}</label>
        <input type="${type}" class="form-control form-control-sm" id="edit_${id}" value="${escapeHtml(val || '')}" ${xtra}>
      </div>`;
    }

    function fgs(id, label, val, options) {
      let html = `<div class="col-sm-6 mb-2">
        <label class="form-label small text-muted mb-1">${label}</label>
        <select class="form-select form-select-sm" id="edit_${id}">`;
      options.forEach(o => {
        html += `<option value="${escapeHtml(o.v)}" ${o.v === val ? 'selected' : ''}>${escapeHtml(o.l)}</option>`;
      });
      html += `</select></div>`;
      return html;
    }

    function fileInputHtml(num, label, fileId) {
      const imgSrc = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : '';
      const display = fileId ? 'inline-block' : 'none';
      const noDisplay = fileId ? 'none' : 'inline';
      return `
        <div class="col-sm-4 mb-3 text-center">
           <label class="form-label small text-muted mb-1 d-block text-start">${label} ใหม่</label>
           <button type="button" class="btn btn-outline-secondary btn-sm mb-2 w-100" onclick="window.openAppPhotoModal(${num})">
             <i class="bi bi-camera me-1"></i> อัปโหลดรูปใหม่
           </button>
           <input type="file" class="d-none" id="edit_file${num}" accept="image/*">
           <div id="thumb_container_${num}" class="position-relative border rounded bg-white p-1 shadow-sm mt-1" style="cursor: zoom-in; display: ${display};">
               <img id="thumb_img_${num}" src="${imgSrc}" style="max-height: 90px; object-fit: contain;" onclick="openAdminLightbox(this.src)">
               <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle shadow" onclick="window.clearAppPhoto(${num}, '${fileId || ''}')" style="width: 20px; height: 20px; padding: 0; line-height: 1;" title="ยกเลิกการเลือกภาพ"><i class="bi bi-x" style="font-size: 0.8rem;"></i></button>
           </div>
           <span id="no_thumb_text_${num}" class="small text-muted" style="display: ${noDisplay};">ไม่มีรูปเดิม</span>
        </div>
      `;
    }

    const body = document.getElementById('appModalBody');
    body.innerHTML = `
      <form id="editAppForm" class="m-0" style="background-color: #f4f7f6;">
        <ul class="nav nav-tabs px-3 pt-3 bg-white position-sticky top-0 shadow-sm" style="z-index: 1020; border-bottom: 2px solid #dee2e6;" id="appTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active fw-semibold" id="info-tab" data-bs-toggle="tab" data-bs-target="#info" type="button" role="tab">
              <i class="bi bi-person-lines-fill me-1"></i> ข้อมูลนักเรียน
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-semibold" id="slip-tab" data-bs-toggle="tab" data-bs-target="#slip" type="button" role="tab">
              <i class="bi bi-receipt me-1"></i> สลิปชำระเงิน
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-semibold" id="status-tab" data-bs-toggle="tab" data-bs-target="#status" type="button" role="tab">
              <i class="bi bi-bookmark-check me-1"></i> สถานะการสมัคร
            </button>
          </li>
        </ul>
        <div class="tab-content p-3" id="appTabsContent">

          <!-- Tab 1: ข้อมูลนักเรียน -->
          <div class="tab-pane fade show active" id="info" role="tabpanel">
            <div class="bg-white p-4 rounded shadow-sm mb-4 border">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-file-earmark-text me-2"></i>ข้อมูลการสมัคร</div>
              <div class="row">
                ${fg('doc_no', 'เลขที่ใบสมัคร', app.doc_no, 'text', 'disabled')}
                ${fg('idcard', 'เลขบัตรประชาชน', app.idcard, 'text', 'readonly')}
                ${fgs('level', 'ระดับชั้น', app.level, [{ v: 'ปวช.', l: 'ปวช.' }, { v: 'ปวส.', l: 'ปวส.' }])}
                ${fg('branch', 'สาขาวิชา (พิมพ์ชื่อเต็ม)', app.branch)}
                ${fgs('info_source', 'ทราบข้อมูลจาก', app.info_source, [
      { v: 'ครูจากวิทยาลัยที่มาแนะแนว', l: 'ครูจากวิทยาลัยที่มาแนะแนว' },
      { v: 'ครูแนะแนวที่โรงเรียนเดิม', l: 'ครูแนะแนวที่โรงเรียนเดิม' },
      { v: 'เพื่อน', l: 'เพื่อน' },
      { v: 'ผู้ปกครอง', l: 'ผู้ปกครอง' },
      { v: 'ญาติ', l: 'ญาติ' },
      { v: 'รุ่นพี่', l: 'รุ่นพี่' },
      { v: 'ค้นหาจาก Google', l: 'ค้นหาจาก Google' },
      { v: 'เว็บไซต์วิทยาลัย', l: 'เว็บไซต์วิทยาลัย' },
      { v: 'เพจวิทยาลัยใน Facebook', l: 'เพจวิทยาลัยใน Facebook' },
      { v: 'เพจสาขาใน Facebook', l: 'เพจสาขาใน Facebook' },
      { v: 'LINE', l: 'LINE' },
      { v: 'Instagram', l: 'Instagram' },
      { v: 'TikTok', l: 'TikTok' }
    ])}
              </div>
            </div>
            
            <div class="bg-white p-4 rounded shadow-sm mb-4 border">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-person-badge me-2"></i>ข้อมูลส่วนตัว</div>
              <div class="row">
                ${fg('prefix', 'คำนำหน้า', app.prefix)}
                ${fg('name', 'ชื่อ', app.name)}
                ${fg('lastname', 'นามสกุล', app.lastname)}
                ${fg('nickname', 'ชื่อเล่น', app.nickname)}
                ${fg('birthday', 'วันเกิด', window.parseThaiDateToCE(app.birthday), 'text', 'placeholder="เลือกวันเกิด" bg-white')}
                ${fg('race', 'เชื้อชาติ', app.race)}
                ${fg('nationality', 'สัญชาติ', app.nationality)}
                ${fg('religion', 'ศาสนา', app.religion)}
                ${fg('weight', 'น้ำหนัก (กก.)', app.weight)}
                ${fg('height', 'ส่วนสูง (ซม.)', app.height)}
              </div>
            </div>
            
            <div class="bg-white p-4 rounded shadow-sm mb-4 border">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-telephone me-2"></i>ข้อมูลการติดต่อ & ที่อยู่</div>
              <div class="row">
                ${fg('student_phone', 'เบอร์โทรศัพท์นักเรียน', app.student_phone)}
                ${fg('student_email', 'E-mail', app.student_email)}
                ${fg('house_no', 'บ้านเลขที่', app.house_no)}
                ${fg('village_no', 'หมู่ที่', app.village_no)}
                ${fg('village', 'หมู่บ้าน/ซอย', app.village)}
                ${fg('road', 'ถนน', app.road)}
                ${fg('alley', 'ตรอก', app.alley)}
                ${fg('district', 'ตำบล', app.district)}
                ${fg('amphoe', 'อำเภอ', app.amphoe)}
                ${fg('province', 'จังหวัด', app.province)}
                ${fg('zipcode', 'รหัสไปรษณีย์', app.zipcode)}
              </div>
            </div>

            <div class="bg-white p-4 rounded shadow-sm mb-4 border">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-book me-2"></i>ประวัติการศึกษา</div>
              <div class="row">
                ${fg('old_grad', 'วุฒิเดิมจบชั้น', app.old_grad)}
                ${fg('old_grad_year', 'พ.ศ. ที่จบ', app.old_grad_year)}
                ${fg('school', 'สถานศึกษาเดิม', app.school)}
                ${fg('school_province', 'จังหวัดสถานศึกษาเดิม', app.school_province)}
              </div>
            </div>

            <div class="bg-white p-4 rounded shadow-sm mb-4 border">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-people me-2"></i>ข้อมูลครอบครัว</div>
              <div class="row">
                <div class="col-12 text-muted small fw-bold mb-2">ข้อมูลบิดา</div>
                ${fg('father', 'ชื่อ-สกุล บิดา', app.father)}
                ${fg('father_occupation', 'อาชีพบิดา', app.father_occupation)}
                ${fg('father_phone', 'เบอร์โทรบิดา', app.father_phone)}
                
                <div class="col-12 text-muted small fw-bold mt-2 mb-2">ข้อมูลมารดา</div>
                ${fg('mother', 'ชื่อ-สกุล มารดา', app.mother)}
                ${fg('mother_occupation', 'อาชีพมารดา', app.mother_occupation)}
                ${fg('mother_phone', 'เบอร์โทรมารดา', app.mother_phone)}
                
                <div class="col-12 text-muted small fw-bold mt-2 mb-2">ผู้ปกครอง (ผู้ที่ติดต่อได้สะดวกที่สุด)</div>
                ${fg('parent', 'ชื่อ-สกุล ผู้ปกครอง', app.parent)}
                ${fg('parent_relationship', 'เกี่ยวข้องเป็น', app.parent_relationship)}
                ${fg('parent_occupation', 'อาชีพผู้ปกครอง', app.parent_occupation)}
                ${fg('parent_phone', 'เบอร์โทรผู้ปกครอง', app.parent_phone)}
              </div>
            </div>
            
            <div class="bg-white p-4 rounded shadow-sm border mb-4">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-images me-2"></i>ไฟล์รูปภาพและเอกสาร</div>
              <div class="text-muted small mb-3">อัปโหลดรูปใหม่ (ถ้าไม่มีการเปลี่ยนรูป จะใช้รูปเดิม)</div>
              <div class="row">
                ${fileInputHtml(1, 'รูปถ่าย 1 นิ้ว', app.file1)}
                ${fileInputHtml(2, 'เอกสาร 1 (สำเนาบัตรประชาชน)', app.file2)}
                ${fileInputHtml(3, 'เอกสาร 2 (สำเนาทะเบียนบ้าน)', app.file3)}
              </div>
              <div class="mt-3 pt-3 border-top d-flex flex-column gap-2">
                <div><strong>สถานะใบสมัคร PDF:</strong> <span id="modal_pdf_status" class="ms-2">${pdfStatusBadge(app)}</span></div>
              </div>
            </div>

            <div class="text-end">
              <button type="button" class="btn btn-brand" id="modal_save_pdf"><i class="bi bi-save me-1"></i>บันทึกข้อมูลใบสมัคร (PDF ใหม่)</button>
            </div>
          </div>
          
          <!-- Tab 2: สลิปชำระเงิน -->
          <div class="tab-pane fade" id="slip" role="tabpanel">
            <div class="bg-white p-4 rounded shadow-sm border mb-4">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-receipt me-2"></i>รูปสลิปการชำระเงิน</div>
              
              <div class="mb-3">
                <strong>สลิปชำระเงิน:</strong>
                ${app.payment_slip_url ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle me-1"></i>แนบสลิปแล้ว</span>' : '<span class="badge bg-secondary ms-2">ยังไม่มีสลิป</span>'}
                <button type="button" class="btn btn-sm btn-outline-success ms-2" onclick="openSlipUploadModal()"><i class="bi bi-upload me-1"></i>อัพโหลดเพิ่ม</button>
                <button type="button" class="btn btn-sm btn-outline-primary ms-2" id="btn_generate_slip_report" style="display: ${app.payment_slip_url ? 'inline-block' : 'none'};"><i class="bi bi-file-earmark-pdf me-1"></i>สร้างรายงานการชำระเงิน</button>
              </div>
              
              <div class="d-flex flex-wrap mb-3 p-3 bg-light rounded border min-vh-25" id="existing_slips_container">
                ${(app.payment_slip_url || '').split(',').map(s => s.trim()).filter(Boolean).map(slipId => `
                  <div class="d-inline-block position-relative me-3 mb-3">
                    <img src="https://lh3.googleusercontent.com/d/${slipId}" style="height: 150px; object-fit: contain; cursor: zoom-in;" class="border rounded shadow-sm bg-white" onclick="openAdminLightbox(this.src)">
                    <button type="button" class="btn btn-danger btn-sm position-absolute top-0 start-100 translate-middle rounded-circle shadow delete-slip-btn" data-slip-id="${slipId}" style="width: 28px; height: 28px; padding: 0; line-height: 1;"><i class="bi bi-x"></i></button>
                  </div>
                `).join('')}
                ${!app.payment_slip_url ? '<span class="text-muted">ยังไม่มีสลิปชำระเงินในระบบ...</span>' : ''}
              </div>

              <div id="new_slip_preview_container" style="display:none;" class="mt-3 align-items-start flex-column p-3 border rounded bg-white border-success">
                <div class="w-100 mb-2"><span class="small text-success fw-bold"><i class="bi bi-info-circle me-1"></i>สลิปใหม่ที่เพิ่งเพิ่ม (กดบันทึกเพื่ออัปโหลด):</span></div>
                <div id="new_slip_thumbnails" class="d-flex flex-wrap gap-2"></div>
                <input type="file" id="edit_file4" accept="image/*" class="d-none" multiple>
              </div>
              
              <div class="text-end mt-4">
                <button type="button" class="btn btn-success" id="modal_save_slips" style="display:none;"><i class="bi bi-cloud-arrow-up me-1"></i>บันทึกสลิปใหม่</button>
              </div>
            </div>
          </div>

          <!-- Tab 3: สถานะการสมัคร -->
          <div class="tab-pane fade" id="status" role="tabpanel">
            <div class="bg-white p-4 rounded shadow-sm border mb-4">
              <div class="border-bottom pb-2 mb-3 fw-bold text-brand fs-6"><i class="bi bi-bookmark-check me-2"></i>สถานะการสมัคร</div>
              
              <div class="mb-3">
                <label class="form-label fw-semibold">อัปเดตสถานะการสมัคร</label>
                <div class="d-flex align-items-center">
                  <select class="form-select w-auto me-3" id="modal_status">
                    <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>รอตรวจสอบ</option>
                    <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>อนุมัติแล้ว</option>
                    <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>ไม่อนุมัติ</option>
                  </select>
                  <button type="button" class="btn btn-primary px-4" id="modal_save_status"><i class="bi bi-check2-circle me-1"></i>บันทึกสถานะ</button>
                </div>
                <div class="form-text mt-2 text-muted">การเปลี่ยนสถานะจะแสดงให้ผู้สมัครเห็นผ่านระบบตรวจสอบสถานะ</div>
              </div>
              
            </div>
          </div>

        </div>
      </form>`;


    if (typeof flatpickr !== 'undefined') {
      flatpickr("#edit_birthday", {
        locale: "th",
        altInput: true,
        altFormat: "j F Y",
        dateFormat: "Y-m-d",
        allowInput: true,
        formatDate: (date, format, locale) => {
          if (format === "j F Y") {
            const d = date.getDate();
            const m = locale.months.longhand[date.getMonth()];
            const y = date.getFullYear() + 543;
            return `${d} ${m} ${y}`;
          }
          return flatpickr.formatDate(date, format);
        }
      });
    }

    const footer = document.getElementById('appModalFooter');
    footer.innerHTML = `
      <div class="d-flex gap-2 me-auto">
        <a href="../apply.html?${app.uid ? `uid=${app.uid}` : `id=${app.id}`}" target="_blank" class="btn btn-outline-primary">
          <i class="bi bi-box-arrow-up-right me-1"></i> หน้ารายละเอียดผู้สมัคร
        </a>
        <button type="button" class="btn btn-outline-secondary" id="btnCopyDirectLink" title="คัดลอกลิงก์">
          <i class="bi bi-copy"></i>
        </button>
      </div>
      <button class="btn btn-outline-secondary" data-bs-dismiss="modal">ปิดหน้าต่าง</button>
    `;

    document.getElementById('btnCopyDirectLink').addEventListener('click', () => {
      const fullUrl = new URL(`../apply.html?${app.uid ? `uid=${app.uid}` : `id=${app.id}`}`, window.location.href).href;
      navigator.clipboard.writeText(fullUrl).then(() => {
        if (typeof showToast === 'function') {
          showToast('คัดลอกลิงก์สำเร็จ', 'success');
        } else {
          alert('คัดลอกลิงก์สำเร็จ');
        }
      }).catch(err => {
        if (typeof showToast === 'function') {
          showToast('ไม่สามารถคัดลอกลิงก์ได้', 'danger');
        }
      });
    });

    body.querySelectorAll('.delete-slip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slipId = e.currentTarget.dataset.slipId;
        const confirmBtn = document.getElementById('btnConfirmDeleteSlip');


        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);


        newConfirmBtn.disabled = false;
        newConfirmBtn.innerHTML = 'ลบสลิป';

        newConfirmBtn.addEventListener('click', async () => {
          newConfirmBtn.disabled = true;
          newConfirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังลบ...';

          try {

            const { data, error: funcError } = await sb.functions.invoke('fetch-file', {
              body: { mode: 'delete_file', fileId: slipId }
            });
            if (funcError) throw funcError;
            if (data && data.error) throw new Error(data.error);


            const existing = (app.payment_slip_url || '').split(',').map(s => s.trim()).filter(Boolean);
            const newPaymentSlipUrl = existing.filter(s => s !== slipId).join(',');

            const { error } = await sb.from('applications').update({ payment_slip_url: newPaymentSlipUrl }).eq('id', app.id);
            if (error) throw error;

            app.payment_slip_url = newPaymentSlipUrl;
            showToast('ลบรูปสลิปเรียบร้อยแล้ว', 'success');

            const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteSlipModal'));
            if (confirmModal) confirmModal.hide();

            openAppModal(app);
            const slipTabTrigger = document.querySelector('#slip-tab');
            if (slipTabTrigger) bootstrap.Tab.getOrCreateInstance(slipTabTrigger).show();

            loadApplications(true);
          } catch (err) {
            showToast('เกิดข้อผิดพลาดในการลบสลิป: ' + (err.message || err), 'danger');
          } finally {
            newConfirmBtn.disabled = false;
            newConfirmBtn.innerHTML = 'ลบสลิป';
          }
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteSlipModal')).show();
      });
    });

    body.querySelector('#modal_save_status').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>กำลังบันทึก...';
      try {
        const newStatus = document.getElementById('modal_status').value;
        const { error } = await sb.from('applications').update({ status: newStatus }).eq('id', app.id);
        if (error) throw error;

        app.status = newStatus;
        showToast('บันทึกสถานะเรียบร้อย', 'success');
        loadApplications(true);
      } catch (err) {
        showToast('ล้มเหลว: ' + err.message, 'danger');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    ['1', '2', '3'].forEach(num => {
      const input = document.getElementById('edit_file' + num);
      if (input) {
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
              document.getElementById('thumb_img_' + num).src = re.target.result;
              document.getElementById('thumb_container_' + num).style.display = 'inline-block';
              document.getElementById('no_thumb_text_' + num).style.display = 'none';
            };
            reader.readAsDataURL(file);
          }
        });
      }
    });

    body.querySelector('#modal_save_pdf').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังบันทึกและสร้าง PDF...`;
      try {
        const payload = {
          level: document.getElementById('edit_level').value.trim(),
          branch: document.getElementById('edit_branch').value.trim(),
          prefix: document.getElementById('edit_prefix').value.trim(),
          name: document.getElementById('edit_name').value.trim(),
          lastname: document.getElementById('edit_lastname').value.trim(),
          nickname: document.getElementById('edit_nickname').value.trim(),
          birthday: document.getElementById('edit_birthday').value.trim(),
          race: document.getElementById('edit_race').value.trim(),
          nationality: document.getElementById('edit_nationality').value.trim(),
          religion: document.getElementById('edit_religion').value.trim(),
          weight: document.getElementById('edit_weight').value.trim(),
          height: document.getElementById('edit_height').value.trim(),
          student_phone: document.getElementById('edit_student_phone').value.trim(),
          student_email: document.getElementById('edit_student_email').value.trim(),
          old_grad: document.getElementById('edit_old_grad').value.trim(),
          old_grad_year: document.getElementById('edit_old_grad_year').value.trim(),
          school: document.getElementById('edit_school').value.trim(),
          school_province: document.getElementById('edit_school_province').value.trim(),
          house_no: document.getElementById('edit_house_no').value.trim(),
          village_no: document.getElementById('edit_village_no').value.trim(),
          village: document.getElementById('edit_village').value.trim(),
          road: document.getElementById('edit_road').value.trim(),
          alley: document.getElementById('edit_alley').value.trim(),
          district: document.getElementById('edit_district').value.trim(),
          amphoe: document.getElementById('edit_amphoe').value.trim(),
          province: document.getElementById('edit_province').value.trim(),
          zipcode: document.getElementById('edit_zipcode').value.trim(),
          father: document.getElementById('edit_father').value.trim(),
          father_occupation: document.getElementById('edit_father_occupation').value.trim(),
          father_phone: document.getElementById('edit_father_phone').value.trim(),
          mother: document.getElementById('edit_mother').value.trim(),
          mother_occupation: document.getElementById('edit_mother_occupation').value.trim(),
          mother_phone: document.getElementById('edit_mother_phone').value.trim(),
          parent: document.getElementById('edit_parent').value.trim(),
          parent_occupation: document.getElementById('edit_parent_occupation').value.trim(),
          parent_relationship: document.getElementById('edit_parent_relationship').value.trim(),
          parent_phone: document.getElementById('edit_parent_phone').value.trim(),
          info_source: document.getElementById('edit_info_source').value.trim()
        };


        async function uploadIfNew(inputId, filename) {
          const el = document.getElementById(inputId);
          if (!el.files[0]) return null;
          const file = el.files[0];
          const buffer = await file.arrayBuffer();
          const form = new FormData();
          form.append('idcard', app.idcard);
          form.append('filename', filename);
          form.append('file', new Blob([buffer], { type: file.type }), filename);

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

        const newFile1 = await uploadIfNew('edit_file1', 'photo.jpg');
        const newFile2 = await uploadIfNew('edit_file2', 'doc1.jpg');
        const newFile3 = await uploadIfNew('edit_file3', 'doc2.jpg');

        if (newFile1) payload.file1 = newFile1;
        if (newFile2) payload.file2 = newFile2;
        if (newFile3) payload.file3 = newFile3;


        Object.assign(app, payload);


        const f1File = document.getElementById('edit_file1').files[0];
        const f2File = document.getElementById('edit_file2').files[0];
        const f3File = document.getElementById('edit_file3').files[0];

        const [photoBlob, doc1Blob, doc2Blob] = await Promise.all([
          f1File ? new Blob([await f1File.arrayBuffer()], { type: f1File.type }) : fetchAsBlobSafe(app.file1),
          f2File ? new Blob([await f2File.arrayBuffer()], { type: f2File.type }) : fetchAsBlobSafe(app.file2),
          f3File ? new Blob([await f3File.arrayBuffer()], { type: f3File.type }) : fetchAsBlobSafe(app.file3),
        ]);

        const cfg = await fetchConfig();
        const pdfBytes = await generateApplicationPdfFromDocx(app, cfg.year, photoBlob, doc1Blob, doc2Blob);
        const levelPrefix = app.level === 'ปวช.' ? 'pvc' : (app.level === 'ปวส.' ? 'pvs' : '');
        const safeDocNo = String(app.doc_no || '').replace(/[^0-9_-]/g, '');
        const pdfUrl = await uploadPdfBytes(pdfBytes, `${app.idcard}/application-${levelPrefix}${safeDocNo}.pdf`);

        payload.pdf_url = pdfUrl;
        app.pdf_url = pdfUrl;


        const { error } = await sb.from('applications').update(payload).eq('id', app.id);
        if (error) throw error;

        showToast('บันทึกข้อมูลและสร้าง PDF ใหม่เรียบร้อย', 'success');
        document.getElementById('modal_pdf_status').innerHTML = pdfStatusBadge(app);


        ['file1', 'file2', 'file3'].forEach(f => {
          const input = document.getElementById('edit_' + f);
          if (input) input.value = "";
        });

        loadApplications(true);
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      } catch (err) {
        showToast('ล้มเหลว: ' + (err.message || err), 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    body.querySelector('#modal_save_slips').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalHtml = btn.innerHTML;

      const slpFls = document.getElementById('edit_file4').files;
      if (!slpFls || slpFls.length === 0) {
        showToast('ไม่พบสลิปใหม่ที่ต้องการอัปโหลด', 'warning');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>กำลังอัปโหลดสลิป...`;
      try {
        let newSlipIds = [];
        for (let i = 0; i < slpFls.length; i++) {
          const f = slpFls[i];
          const buffer = await f.arrayBuffer();
          const form = new FormData();
          form.append('idcard', app.idcard);
          form.append('filename', f.name);
          form.append('file', new Blob([buffer], { type: f.type }), f.name);
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
          newSlipIds.push(fileId);
        }

        const existing = (app.payment_slip_url || '').split(',').map(s => s.trim()).filter(Boolean);
        const newPaymentSlipUrl = existing.concat(newSlipIds).join(',');

        const { error } = await sb.from('applications').update({ payment_slip_url: newPaymentSlipUrl }).eq('id', app.id);
        if (error) throw error;


        app.payment_slip_url = newPaymentSlipUrl;

        showToast('อัปโหลดและบันทึกสลิปสำเร็จ', 'success');


        openAppModal(app);


        const slipTabTrigger = document.querySelector('#slip-tab');
        if (slipTabTrigger) bootstrap.Tab.getOrCreateInstance(slipTabTrigger).show();


        loadApplications(true);

      } catch (err) {
        showToast('ล้มเหลว: ' + (err.message || err), 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    body.querySelector('#btn_generate_slip_report')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>กำลังสร้างรายงาน...';
      btn.disabled = true;

      try {
        const slipIds = (app.payment_slip_url || '').split(',').map(s => s.trim()).filter(Boolean);
        if (slipIds.length === 0) throw new Error("ไม่พบสลิปชำระเงิน");

        const canvases = [];

        for (let i = 0; i < slipIds.length; i++) {
          const slipBlob = await fetchAsBlobSafe(slipIds[i]);
          const slipUrl = slipBlob ? URL.createObjectURL(slipBlob) : '';

          let img = null;
          if (slipUrl) {
            img = new Image();
            img.src = slipUrl;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          }

          const width = 1588;
          const height = 2244;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          if (img && img.width > 0) {
            const maxWidth = 1428;
            const maxHeight = 1600;
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            const drawW = img.width * ratio;
            const drawH = img.height * ratio;
            const drawX = (width - drawW) / 2;
            const drawY = 80;

            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            ctx.strokeStyle = '#dddddd';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX, drawY, drawW, drawH);
          } else {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(80, 80, width - 160, 1600);
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 48px Sarabun, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ไม่สามารถโหลดรูปภาพได้', width / 2, 880);
          }

          ctx.beginPath();
          ctx.setLineDash([10, 10]);
          ctx.moveTo(80, 1760);
          ctx.lineTo(width - 80, 1760);
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 6;
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 52px Sarabun, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`ชื่อ - นามสกุล: ${app.prefix}${app.name} ${app.lastname}`, width / 2, 1880);
          ctx.fillText(`ระดับ: ${app.level}     สาขา: ${app.branch}`, width / 2, 1960);

          canvases.push(canvas.toDataURL('image/jpeg', 0.95));
        }

        const reportModalEl = document.getElementById('slipReportModal');
        const iframe = document.getElementById('slipReportIframe');

        iframe.removeAttribute('src');
        iframe.srcdoc = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { margin: 0; background: #525659; display: flex; flex-direction: column; align-items: center; padding: 20px; }
                .page { margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); width: 794px; max-width: 100%; background: white; }
                @media print {
                  body { background: white; padding: 0; margin: 0; display: block; }
                  .page { box-shadow: none; margin-bottom: 0; width: 100%; page-break-after: always; display: block; }
                }
              </style>
            </head>
            <body>
              ${canvases.map(src => `<img class="page" src="${src}" />`).join('')}
            </body>
          </html>
        `;

        const reportModal = bootstrap.Modal.getOrCreateInstance(reportModalEl);
        reportModal.show();

        const printBtn = document.getElementById('btnPrintSlipReport');

        printBtn.onclick = () => {
          if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
        };

        btn.disabled = false;
        btn.innerHTML = originalHtml;
      } catch (err) {
        showToast('สร้างรายงานล้มเหลว: ' + err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('appModal')).show();
  }

  function toViewDriveUrl(fileId) {
    if (!fileId) return '';
    return `https://drive.google.com/file/d/${fileId}/view`;
  }



  async function fetchAsBlobSafe(fileIdOrUrl) {
    if (!fileIdOrUrl) return null;




    let fileId = fileIdOrUrl.trim();
    const driveMatch = fileId.match(/(?:(?:\/d\/)|(?:[?&]id=))([a-zA-Z0-9_-]{25,})/);
    if (driveMatch) fileId = driveMatch[1];

    try {
      const { data, error } = await sb.functions.invoke('fetch-file', {
        body: { mode: 'fetch_file', fileId: fileId },
      });
      if (!error && data && data.base64) {
        const binaryStr = atob(data.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        return new Blob([bytes], { type: data.mimeType || 'application/octet-stream' });
      }
      if (data && data.error) console.warn('fetchAsBlobSafe: Edge Function returned logic error →', data.error);
      if (error) console.warn('fetchAsBlobSafe: Edge Function fetch-file error →', error);
    } catch (e) {
      console.warn('fetchAsBlobSafe ล้มเหลว →', e.message);
    }
    return null;
  }



  async function uploadPdfBytes(bytes, path) {
    const idcard = path.split('/')[0];
    const filename = path.split('/').slice(1).join('/') || path;
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
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

  async function deleteApplication(id) {
    if (!confirm('ยืนยันการลบใบสมัครนี้? การลบไม่สามารถย้อนกลับได้')) return;
    const { error } = await sb.from('applications').delete().eq('id', id);
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('ลบใบสมัครแล้ว', 'success');
    loadApplications(true);
  }

  async function loadBranches() {
    document.getElementById('branch-list-pvc').innerHTML = skeletonTableRows(4, 5);
    document.getElementById('branch-list-pvs').innerHTML = skeletonTableRows(4, 5);
    try {
      const cfg = await fetchConfig();
      const pvcCheckbox = document.getElementById('cfg_pvc_discount');
      const pvsCheckbox = document.getElementById('cfg_pvs_discount');
      if (pvcCheckbox) pvcCheckbox.checked = String(cfg.pvc_discount_active).toUpperCase() === 'TRUE';
      if (pvsCheckbox) pvsCheckbox.checked = String(cfg.pvs_discount_active).toUpperCase() === 'TRUE';

      const toggleConfig = async (key, val) => {
        await sb.from('config').upsert([{ key, value: val ? 'TRUE' : 'FALSE' }], { onConflict: 'key' });
        showToast('บันทึกการตั้งค่าส่วนลดแล้ว', 'success');
      };

      if (pvcCheckbox) pvcCheckbox.onchange = (e) => toggleConfig('pvc_discount_active', e.target.checked);
      if (pvsCheckbox) pvsCheckbox.onchange = (e) => toggleConfig('pvs_discount_active', e.target.checked);

      const { data, error } = await sb.from('branches').select('*').order('level').order('sort_order');
      if (error) throw error;
      branchesCache['ปวช.'] = data.filter(b => b.level === 'ปวช.');
      branchesCache['ปวส.'] = data.filter(b => b.level === 'ปวส.');
      renderBranchTable('branch-list-pvc', branchesCache['ปวช.']);
      renderBranchTable('branch-list-pvs', branchesCache['ปวส.']);
    } catch (err) {
      console.error('loadBranches failed:', err);
      const msg = `<tr><td colspan="5"><div class="alert alert-danger mb-0">โหลดข้อมูลสาขาวิชาไม่สำเร็จ: ${escapeHtml(err.message || String(err))}</div></td></tr>`;
      document.getElementById('branch-list-pvc').innerHTML = msg;
      document.getElementById('branch-list-pvs').innerHTML = msg;
    }
  }

  function renderBranchTable(hostId, list) {
    const tbody = document.getElementById(hostId);
    tbody.innerHTML = list.map(b => `
      <tr data-id="${b.id}">
        <td class="drag-handle"><i class="bi bi-grip-vertical"></i></td>
        <td>${escapeHtml(b.name)}${b.track ? ` <span class="text-muted small">(${escapeHtml(b.track)})</span>` : ''}</td>
        <td>${formatBaht(b.price)}</td>
        <td>
          <div class="form-check form-switch mb-0">
            <input class="form-check-input branch-active-toggle" type="checkbox" ${b.active ? 'checked' : ''}>
          </div>
        </td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-brand-outline btn-edit-branch"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-del-branch"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      const id = tr.dataset.id;
      const record = list.find(x => x.id === id);
      tr.querySelector('.branch-active-toggle').addEventListener('change', async (e) => {
        await sb.from('branches').update({ active: e.target.checked }).eq('id', id);
      });
      tr.querySelector('.btn-edit-branch').addEventListener('click', () => openBranchModal(record));
      tr.querySelector('.btn-del-branch').addEventListener('click', () => deleteBranch(id));
    });

    Sortable.create(tbody, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async () => {
        const ids = Array.from(tbody.querySelectorAll('tr')).map(tr => tr.dataset.id);
        await Promise.all(ids.map((id, idx) => sb.from('branches').update({ sort_order: idx }).eq('id', id)));
        showToast('บันทึกลำดับการแสดงผลแล้ว', 'success');
      },
    });
  }

  document.getElementById('btn-add-branch').addEventListener('click', () => openBranchModal(null));

  function openBranchModal(record) {
    document.getElementById('form-branch').reset();
    document.getElementById('branch_id').value = record?.id || '';
    document.getElementById('branch_level').value = record?.level || 'ปวช.';
    document.getElementById('branch_name').value = record?.name || '';
    document.getElementById('branch_track').value = record?.track || '';
    document.getElementById('branch_price').value = record?.price ?? '';
    document.getElementById('branch_active').checked = record ? record.active : true;
    new bootstrap.Modal(document.getElementById('branchModal')).show();
  }

  document.getElementById('btn-save-branch').addEventListener('click', async () => {
    const id = document.getElementById('branch_id').value;
    const payload = {
      level: document.getElementById('branch_level').value,
      name: document.getElementById('branch_name').value.trim(),
      track: document.getElementById('branch_track').value.trim(),
      price: Number(document.getElementById('branch_price').value) || 0,
      active: document.getElementById('branch_active').checked,
    };
    if (!payload.name) { showToast('กรุณากรอกชื่อสาขาวิชา', 'danger'); return; }

    let error;
    if (id) {
      ({ error } = await sb.from('branches').update(payload).eq('id', id));
    } else {
      const maxOrder = Math.max(0, ...branchesCache[payload.level].map(b => b.sort_order));
      ({ error } = await sb.from('branches').insert({ ...payload, sort_order: maxOrder + 1 }));
    }
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('บันทึกสาขาวิชาเรียบร้อย', 'success');
    bootstrap.Modal.getInstance(document.getElementById('branchModal')).hide();
    loadBranches();
  });

  async function deleteBranch(id) {
    if (!confirm('ยืนยันการลบสาขาวิชานี้?')) return;
    const { error } = await sb.from('branches').delete().eq('id', id);
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('ลบสาขาวิชาแล้ว', 'success');
    loadBranches();
  }

  let promosCache = { 'ปวช.': [], 'ปวส.': [] };

  async function loadPromotions() {
    document.getElementById('promo-list-pvc').innerHTML = skeletonPromoAdminCards(2);
    document.getElementById('promo-list-pvs').innerHTML = skeletonPromoAdminCards(2);
    try {
      const { data, error } = await sb.from('promotions').select('*').order('level').order('sort_order');
      if (error) throw error;
      promosCache['ปวช.'] = data.filter(p => p.level === 'ปวช.');
      promosCache['ปวส.'] = data.filter(p => p.level === 'ปวส.');
      renderPromoList('promo-list-pvc', promosCache['ปวช.']);
      renderPromoList('promo-list-pvs', promosCache['ปวส.']);
    } catch (err) {
      console.error('loadPromotions failed:', err);
      const msg = `<div class="alert alert-danger mb-0">โหลดโปรโมชั่นไม่สำเร็จ: ${escapeHtml(err.message || String(err))}</div>`;
      document.getElementById('promo-list-pvc').innerHTML = msg;
      document.getElementById('promo-list-pvs').innerHTML = msg;
    }
  }

  function renderPromoList(hostId, list) {
    const host = document.getElementById(hostId);
    if (list.length === 0) {
      host.innerHTML = `<p class="text-muted mb-0">ยังไม่มีโปรโมชั่นสำหรับระดับนี้</p>`;
      return;
    }
    host.innerHTML = list.map(p => `
      <div class="card-soft bg-white p-3" data-id="${p.id}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            ${p.title ? `<div class="fw-semibold">${escapeHtml(p.title)}</div>` : ''}
            <div class="small text-muted" style="white-space:pre-line">${escapeHtml(p.description).slice(0, 140)}${p.description.length > 140 ? '…' : ''}</div>
          </div>
          <span class="badge text-bg-${p.enabled ? 'success' : 'secondary'}">${p.enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span>
        </div>
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-brand-outline btn-edit-promo"><i class="bi bi-pencil me-1"></i>แก้ไข</button>
          <button class="btn btn-sm btn-outline-danger btn-del-promo"><i class="bi bi-trash me-1"></i>ลบ</button>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-id]').forEach(card => {
      const id = card.dataset.id;
      const record = list.find(x => x.id === id);
      card.querySelector('.btn-edit-promo').addEventListener('click', () => openPromoModal(record));
      card.querySelector('.btn-del-promo').addEventListener('click', () => deletePromo(id));
    });
  }

  document.getElementById('btn-add-promo').addEventListener('click', () => openPromoModal(null));

  function openPromoModal(record) {
    document.getElementById('form-promo').reset();
    document.getElementById('promo_id').value = record?.id || '';
    document.getElementById('promo_level').value = record?.level || 'ปวช.';
    document.getElementById('promo_title').value = record?.title || '';
    document.getElementById('promo_description').value = record?.description || '';
    document.getElementById('promo_image').value = record?.image_url || '';
    document.getElementById('promo_enabled').checked = record ? record.enabled : true;
    new bootstrap.Modal(document.getElementById('promoModal')).show();
  }

  document.getElementById('btn-save-promo').addEventListener('click', async () => {
    const id = document.getElementById('promo_id').value;
    const level = document.getElementById('promo_level').value;
    const payload = {
      level,
      title: document.getElementById('promo_title').value.trim(),
      description: document.getElementById('promo_description').value.trim(),
      image_url: document.getElementById('promo_image').value.trim(),
      enabled: document.getElementById('promo_enabled').checked,
    };
    if (!payload.description) { showToast('กรุณากรอกรายละเอียดโปรโมชั่น', 'danger'); return; }

    let error;
    if (id) {
      ({ error } = await sb.from('promotions').update(payload).eq('id', id));
    } else {
      const maxOrder = Math.max(0, ...promosCache[level].map(p => p.sort_order));
      ({ error } = await sb.from('promotions').insert({ ...payload, sort_order: maxOrder + 1 }));
    }
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('บันทึกโปรโมชั่นเรียบร้อย', 'success');
    bootstrap.Modal.getInstance(document.getElementById('promoModal')).hide();
    loadPromotions();
  });

  async function deletePromo(id) {
    if (!confirm('ยืนยันการลบโปรโมชั่นนี้?')) return;
    const { error } = await sb.from('promotions').delete().eq('id', id);
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('ลบโปรโมชั่นแล้ว', 'success');
    loadPromotions();
  }

  async function loadLinks() {
    const tbody = document.getElementById('links-list');
    tbody.innerHTML = skeletonTableRows(3, 6);
    let data;
    try {
      const res = await sb.from('social_links').select('*').order('sort_order');
      if (res.error) throw res.error;
      data = res.data || [];
    } catch (err) {
      console.error('loadLinks failed:', err);
      tbody.innerHTML = `<tr><td colspan="6"><div class="alert alert-danger mb-0">โหลดลิงก์ไม่สำเร็จ: ${escapeHtml(err.message || String(err))}</div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(l => `
      <tr data-id="${l.id}">
        <td class="drag-handle"><i class="bi bi-grip-vertical"></i></td>
        <td>${escapeHtml(l.label)}</td>
        <td class="text-truncate" style="max-width:220px"><a href="${l.url}" target="_blank">${escapeHtml(l.url)}</a></td>
        <td><i class="bi ${l.icon || 'bi-link-45deg'}"></i> <span class="small text-muted">${l.icon || ''}</span></td>
        <td>
          <div class="form-check form-switch mb-0">
            <input class="form-check-input link-active-toggle" type="checkbox" ${l.active ? 'checked' : ''}>
          </div>
        </td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-brand-outline btn-edit-link"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-del-link"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      const id = tr.dataset.id;
      const record = data.find(x => x.id === id);
      tr.querySelector('.link-active-toggle').addEventListener('change', async (e) => {
        await sb.from('social_links').update({ active: e.target.checked }).eq('id', id);
      });
      tr.querySelector('.btn-edit-link').addEventListener('click', () => openLinkModal(record));
      tr.querySelector('.btn-del-link').addEventListener('click', () => deleteLink(id));
    });

    Sortable.create(tbody, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async () => {
        const ids = Array.from(tbody.querySelectorAll('tr')).map(tr => tr.dataset.id);
        await Promise.all(ids.map((id, idx) => sb.from('social_links').update({ sort_order: idx }).eq('id', id)));
        showToast('บันทึกลำดับการแสดงผลแล้ว', 'success');
      },
    });
  }

  document.getElementById('btn-add-link').addEventListener('click', () => openLinkModal(null));

  function openLinkModal(record) {
    document.getElementById('form-link').reset();
    document.getElementById('link_id').value = record?.id || '';
    document.getElementById('link_label').value = record?.label || '';
    document.getElementById('link_url').value = record?.url || '';
    document.getElementById('link_icon').value = record?.icon || '';
    document.getElementById('link_active').checked = record ? record.active : true;
    new bootstrap.Modal(document.getElementById('linkModal')).show();
  }

  document.getElementById('btn-save-link').addEventListener('click', async () => {
    const id = document.getElementById('link_id').value;
    const payload = {
      label: document.getElementById('link_label').value.trim(),
      url: document.getElementById('link_url').value.trim(),
      icon: document.getElementById('link_icon').value.trim() || 'bi-link-45deg',
      active: document.getElementById('link_active').checked,
    };
    if (!payload.label || !payload.url) { showToast('กรุณากรอกชื่อและ URL', 'danger'); return; }

    let error;
    if (id) {
      ({ error } = await sb.from('social_links').update(payload).eq('id', id));
    } else {
      const { data: existing } = await sb.from('social_links').select('sort_order').order('sort_order', { ascending: false }).limit(1);
      const maxOrder = existing && existing.length ? existing[0].sort_order : 0;
      ({ error } = await sb.from('social_links').insert({ ...payload, sort_order: maxOrder + 1 }));
    }
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('บันทึกลิงก์เรียบร้อย', 'success');
    bootstrap.Modal.getInstance(document.getElementById('linkModal')).hide();
    loadLinks();
  });

  async function deleteLink(id) {
    if (!confirm('ยืนยันการลบลิงก์นี้?')) return;
    const { error } = await sb.from('social_links').delete().eq('id', id);
    if (error) { showToast(error.message, 'danger'); return; }
    showToast('ลบลิงก์แล้ว', 'success');
    loadLinks();
  }

  const SETTINGS_FIELDS = [
    ['logo_url', 'URL รูปภาพโลโก้', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['school_name', 'ชื่อสถานศึกษา', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['school_name_en', 'ชื่อสถานศึกษา (ภาษาอังกฤษ)', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['slogan', 'คำขวัญโรงเรียน', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['school_address', 'ที่อยู่สถานศึกษา', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['school_phone', 'เบอร์โทรศัพท์', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['year', 'ปีการศึกษา (พ.ศ.)', 'text', '🏛️ ข้อมูลทั่วไป'],
    ['form_closed', 'ปิดรับสมัครชั่วคราว', 'bool', '🏛️ ข้อมูลทั่วไป'],
    ['enable_send_email', 'ส่งอีเมลยืนยันการสมัครอัตโนมัติ', 'bool', '🏛️ ข้อมูลทั่วไป'],

    ['enable_line_notify', 'เปิดใช้งานแจ้งเตือนผ่าน LINE (Messaging API)', 'bool', '🟢 การแจ้งเตือน (LINE)'],
    ['line_access_token', 'LINE Channel Access Token', 'text', '🟢 การแจ้งเตือน (LINE)'],
    ['line_group_id', 'LINE Group ID', 'text', '🟢 การแจ้งเตือน (LINE)'],

    ['youtube_id', 'YouTube Video ID (แนะนำขั้นตอนการสมัครเรียน)', 'text', '💬 วิดีโอ และการติดต่อ'],

    ['bank_name', 'ชื่อธนาคาร', 'text', '💳 การชำระเงิน'],
    ['bank_account_no', 'เลขที่บัญชี', 'text', '💳 การชำระเงิน'],
    ['bank_account_name', 'ชื่อบัญชี', 'text', '💳 การชำระเงิน'],
    ['bank_account_image', 'URL รูปแสกนบัญชีธนาคาร (หรือรูปการ์ดบัญชี)', 'text', '💳 การชำระเงิน'],

    ['favicon_url', 'URL Favicon', 'text', '🎨 การปรับแต่งดีไซน์'],
    ['hero_image', 'URL รูปหน้าปก (Hero)', 'text', '🎨 การปรับแต่งดีไซน์'],
    ['hero_image_mobile', 'URL รูปหน้าปก (Hero) สำหรับมือถือ', 'text', '🎨 การปรับแต่งดีไซน์'],
    ['pvc_card_image', 'URL รูปตัวละคร/ภาพมุมขวาบนการ์ด ปวช. (พื้นหลังโปร่งใสแนะนำ)', 'text', '🎨 การปรับแต่งดีไซน์'],
    ['pvs_card_image', 'URL รูปตัวละคร/ภาพมุมขวาบนการ์ด ปวส. (พื้นหลังโปร่งใสแนะนำ)', 'text', '🎨 การปรับแต่งดีไซน์'],
  ];

  async function loadSettings() {
    const form = document.getElementById('form-settings');


    const groups = [];
    let lastGroup = '';
    SETTINGS_FIELDS.forEach(([, , , group]) => {
      if (group !== lastGroup) { groups.push({ name: group, count: 1 }); lastGroup = group; }
      else { groups[groups.length - 1].count++; }
    });
    form.innerHTML = groups.map(g => `
      <div class="card-soft bg-white mb-4">
        <div class="border-bottom px-4 py-3 bg-light" style="border-radius: var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0 0;">
          ${skeletonBox('40%', '1.1em')}
        </div>
        <div class="p-4">${skeletonFormLines(g.count)}</div>
      </div>`).join('') +
      `<div class="mb-3">${skeletonBox('100%', '2.8em', 'border-radius:999px;')}</div>`;

    const cfg = await fetchConfig();

    let html = '';
    let currentGroup = '';

    SETTINGS_FIELDS.forEach(([key, label, type, group]) => {
      if (group !== currentGroup) {
        if (currentGroup !== '') {
          html += `</div></div>`;
        }
        html += `<div class="card-soft bg-white mb-4">
                   <div class="border-bottom px-4 py-3 bg-light fw-bold text-brand" style="border-radius: var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0 0;">
                     ${group}
                   </div>
                   <div class="p-4">`;
        currentGroup = group;
      }

      if (type === 'bool') {
        let checked;
        if (key === 'enable_send_email' && cfg[key] === undefined) {
          checked = true;
        } else {
          checked = String(cfg[key]).toUpperCase() === 'TRUE';
        }
        html += `<div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="cfg_${key}" ${checked ? 'checked' : ''}>
          <label class="form-check-label" for="cfg_${key}">${label}</label>
        </div>`;
      } else if (type === 'color') {
        const value = cfg[key] || '#E3EDFA';
        html += `<div class="mb-3">
          <label class="form-label d-block">${label}</label>
          <div class="d-flex align-items-center gap-2">
            <input type="color" class="form-control form-control-color" id="cfg_${key}" value="${value}">
            <input class="form-control" id="cfg_${key}_hex" value="${escapeHtml(value)}" style="max-width:140px">
          </div>
        </div>`;
      } else {
        html += `<div class="mb-3">
          <label class="form-label">${label}</label>
          <input class="form-control" id="cfg_${key}" value="${escapeHtml(cfg[key] || '')}">
        </div>`;
      }
    });

    if (currentGroup !== '') {
      html += `</div></div>`;
    }

    html += `<button type="submit" class="btn btn-brand w-100 py-2 fw-semibold shadow-sm"><i class="bi bi-save me-2"></i>บันทึกการตั้งค่า</button>`;
    form.innerHTML = html;


    SETTINGS_FIELDS.filter(([, , type]) => type === 'color').forEach(([key]) => {
      const colorInput = document.getElementById(`cfg_${key}`);
      const hexInput = document.getElementById(`cfg_${key}_hex`);
      colorInput.addEventListener('input', () => hexInput.value = colorInput.value);
      hexInput.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) colorInput.value = hexInput.value;
      });
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const rows = SETTINGS_FIELDS.map(([key, , type]) => ({
        key,
        value: type === 'bool' ? (document.getElementById(`cfg_${key}`).checked ? 'TRUE' : 'FALSE')
          : document.getElementById(`cfg_${key}`).value.trim(),
      }));
      const { error } = await sb.from('config').upsert(rows, { onConflict: 'key' });
      if (error) { showToast(error.message, 'danger'); return; }
      showToast('บันทึกการตั้งค่าเรียบร้อย', 'success');
    };
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();

let slipCropper = null;
window.slipDataTransfer = new DataTransfer();

window.openSlipUploadModal = function () {
  const fileInput = document.getElementById('slipFileInput');
  const container = document.getElementById('slipCropperContainer');
  const img = document.getElementById('slipCropperImg');

  if (fileInput) fileInput.value = '';
  if (container) container.style.display = 'none';
  if (img) img.src = '';
  if (slipCropper) {
    slipCropper.destroy();
    slipCropper = null;
  }

  const modalEl = document.getElementById('slipUploadModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
};

const slipFileInput = document.getElementById('slipFileInput');
if (slipFileInput) {
  slipFileInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      loadSlipToCropper(e.target.files[0]);
    }
  });
}

const slipUploadModal = document.getElementById('slipUploadModal');
if (slipUploadModal) {
  slipUploadModal.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.items) {
      for (const item of e.clipboardData.items) {
        if (item.type.indexOf('image/') !== -1) {
          const file = item.getAsFile();
          loadSlipToCropper(file);
          break;
        }
      }
    }
  });
}

function loadSlipToCropper(file) {
  const container = document.getElementById('slipCropperContainer');
  const img = document.getElementById('slipCropperImg');
  const reader = new FileReader();
  reader.onload = (e) => {
    container.style.display = 'block';
    img.src = e.target.result;
    if (slipCropper) slipCropper.destroy();
    slipCropper = new Cropper(img, {
      viewMode: 1,
      autoCropArea: 1,
    });
  };
  reader.readAsDataURL(file);
}

const btnConfirmSlip = document.getElementById('btnConfirmSlip');
if (btnConfirmSlip) {
  btnConfirmSlip.addEventListener('click', function () {
    if (!slipCropper) {
      alert('????????????????????????????????????');
      return;
    }

    slipCropper.getCroppedCanvas({
      maxWidth: 1600,
      maxHeight: 1600
    }).toBlob((blob) => {
      const file = new File([blob], 'slip_' + Date.now() + '.jpg', { type: 'image/jpeg' });
      window.slipDataTransfer.items.add(file);

      const fileInputObj = document.getElementById('edit_file4');
      if (fileInputObj) {
        fileInputObj.files = window.slipDataTransfer.files;
        const reader = new FileReader();
        reader.onload = (re) => {
          const container = document.getElementById('new_slip_thumbnails');
          if (container) {
            container.innerHTML += `
               <div class="d-inline-block position-relative me-2 mb-2">
                 <img src="${re.target.result}" style="height: 80px; width: 80px; object-fit: contain; cursor: zoom-in;" class="border rounded shadow-sm bg-white" onclick="openAdminLightbox(this.src)">
               </div>`;
          }
          document.getElementById('new_slip_preview_container').style.display = 'flex';

          const saveSlipsBtn = document.getElementById('modal_save_slips');
          if (saveSlipsBtn) saveSlipsBtn.style.display = 'inline-block';

          const uploadModal = bootstrap.Modal.getInstance(document.getElementById('slipUploadModal'));
          if (uploadModal) uploadModal.hide();
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.85);
  });
}


const csvInput = document.getElementById('csvFileInput');
if (csvInput) {
  csvInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`คุณต้องการนำเข้าข้อมูลจากไฟล์ ${file.name} ใช่หรือไม่?\n\n(หากบัตรประชาชนซ้ำ จะอัปเดตข้อมูลเดิม)`)) {
      csvInput.value = '';
      return;
    }

    showToast('กำลังวิเคราะห์ไฟล์ CSV...', 'info');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        try {
          const rows = results.data;
          if (rows.length === 0) {
            showToast('ไม่พบข้อมูลในไฟล์ CSV', 'danger');
            return;
          }

          const { data: branches } = await sb.from('branches').select('id, name, level');
          const branchMap = {};
          if (branches) {
            branches.forEach(b => {
              branchMap[`${b.level}_${b.name}`] = b.id;
            });
          }

          showToast(`พบข้อมูล ${rows.length} รายการ กำลังอัปโหลด...`, 'info');

          let success = 0;
          let errors = 0;

          for (let row of rows) {
            let level = 'ปวช.';
            let branchName = row.reg_branch_selected || '';

            if (branchName.startsWith('ปวส.')) {
              level = 'ปวส.';
              branchName = branchName.replace('ปวส.', '').trim();
            } else if (branchName.startsWith('ปวช.')) {
              level = 'ปวช.';
              branchName = branchName.replace('ปวช.', '').trim();
            }

            const branchId = branchMap[`${level}_${branchName}`] || null;

            let createdAt = new Date();
            if (row.timestamp && row.timestamp.trim() !== '') {
              const parsedDate = new Date(row.timestamp);
              if (!isNaN(parsedDate)) createdAt = parsedDate;
            }

            let parsedBirthday = null;
            if (row.birthday && row.birthday.trim() !== '') {
              parsedBirthday = row.birthday.trim();
            }

            if (!row.idcard || row.idcard.trim() === '') {
              errors++;
              continue;
            }

            const payload = {
              doc_no: row.doc_no || null,
              created_at: createdAt.toISOString(),
              level: level,
              branch: branchName,
              branch_id: branchId,
              prefix: row.prefix || '',
              name: row.name || '',
              lastname: row.lastname || '',
              nickname: row.nickname || null,
              birthday: parsedBirthday,
              idcard: row.idcard.trim(),
              race: row.race || null,
              nationality: row.nationality || null,
              religion: row.religion || null,
              weight: (row.weight && !isNaN(row.weight)) ? parseFloat(row.weight) : null,
              height: (row.height && !isNaN(row.height)) ? parseFloat(row.height) : null,
              student_phone: row.student_phone || null,
              student_email: row.student_email || null,
              student_lineid: row.student_lineid || null,
              old_grad: row.old_grad || null,
              old_grad_year: row.old_grad_year || null,
              school: row.school || null,
              school_province: row.schoolProvince || row.school_province || null,
              house_no: row.house_no || null,
              village_no: row.village_no || null,
              village: row.village || null,
              road: row.road || null,
              alley: row.alley || null,
              district: row.district || null,
              amphoe: row.amphoe || null,
              province: row.province || null,
              zipcode: row.zipcode || null,
              father: row.father || null,
              father_occupation: row.father_occupation || null,
              father_phone: row.father_phone || null,
              mother: row.mother || null,
              mother_occupation: row.mother_occupation || null,
              mother_phone: row.mother_phone || null,
              parent: row.parent || null,
              parent_occupation: row.parent_occupation || null,
              parent_phone: row.parent_phone || null,
              parent_relationship: row.parent_relationship || null,
              info_source: row.info_source || null,
              file1: row.file1 || null,
              file2: row.file2 || null,
              file3: row.file3 || null,
              status: 'pending'
            };

            if (row.status && ['pending', 'approved', 'rejected'].includes(row.status.toLowerCase())) {
              payload.status = row.status.toLowerCase();
            }

            const { error } = await sb.from('applications').upsert(payload, { onConflict: 'idcard' });
            if (error) {
              console.error('Import error on idcard:', row.idcard, error, payload);
              errors++;
            } else {
              success++;
            }
          }

          showToast(`นำเข้าสำเร็จ ${success} รายการ, สร้างไม่ได้ ${errors} รายการ`, success > 0 ? 'success' : 'warning');
          csvInput.value = '';
          if (typeof loadApplications === 'function') loadApplications(true);

        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการประมวลผลไฟล์', 'danger');
        }
      },
      error: function (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV', 'danger');
      }
    });
  });
}


window.activePhotoSlot = null;
window.appPhotoDataTransfer = new DataTransfer();
let appPhotoCropper = null;

window.openAppPhotoModal = function (num) {
  window.activePhotoSlot = num;
  const modalEl = document.getElementById('appPhotoModal');
  if (modalEl) {
    document.getElementById('appPhotoCropperContainer').style.display = 'none';
    const ghostInput = document.getElementById('appPhotoGhostInput');
    if (ghostInput) ghostInput.value = '';
    window.appPhotoDataTransfer = new DataTransfer();
    if (appPhotoCropper) {
      appPhotoCropper.destroy();
      appPhotoCropper = null;
    }
    const previewImg = document.getElementById('appPhotoPreviewImg');
    if (previewImg) previewImg.src = '';
    new bootstrap.Modal(modalEl).show();
  }
};

window.clearAppPhoto = function (num, origFileId) {
  const fileInput = document.getElementById('edit_file' + num);
  if (fileInput) fileInput.value = '';
  const thumbContainer = document.getElementById('thumb_container_' + num);
  const noThumbText = document.getElementById('no_thumb_text_' + num);
  const thumbImg = document.getElementById('thumb_img_' + num);

  if (origFileId && origFileId !== 'false' && origFileId !== 'undefined' && origFileId !== '') {
    thumbImg.src = 'https://lh3.googleusercontent.com/d/' + origFileId;
    thumbContainer.style.display = 'inline-block';
    noThumbText.style.display = 'none';
  } else {
    thumbImg.src = '';
    thumbContainer.style.display = 'none';
    noThumbText.style.display = 'inline';
  }
};

const appPhotoGhostInput = document.getElementById('appPhotoGhostInput');
if (appPhotoGhostInput) {
  appPhotoGhostInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      loadPhotoToPrecrop(e.target.files[0]);
    }
  });
}

const appPhotoModal = document.getElementById('appPhotoModal');
if (appPhotoModal) {
  appPhotoModal.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.items) {
      for (const item of e.clipboardData.items) {
        if (item.type.indexOf('image/') !== -1) {
          const file = item.getAsFile();
          loadPhotoToPrecrop(file);
          break;
        }
      }
    }
  });
}

function loadPhotoToPrecrop(file) {
  const container = document.getElementById('appPhotoCropperContainer');
  const imgElement = document.getElementById('appPhotoPreviewImg');
  const reader = new FileReader();
  reader.onload = function (evt) {
    container.style.display = 'block';
    imgElement.src = evt.target.result;
    if (appPhotoCropper) appPhotoCropper.destroy();
    appPhotoCropper = new Cropper(imgElement, {
      viewMode: 1,
      autoCropArea: 1,
    });
  };
  reader.readAsDataURL(file);
}

const btnCancelPhotoData = document.getElementById('btnCancelPhotoData');
if (btnCancelPhotoData) {
  btnCancelPhotoData.addEventListener('click', function () {
    document.getElementById('appPhotoCropperContainer').style.display = 'none';
    if (appPhotoCropper) {
      appPhotoCropper.destroy();
      appPhotoCropper = null;
    }
    document.getElementById('appPhotoPreviewImg').src = '';
    window.appPhotoDataTransfer = new DataTransfer();
    const ghostInput = document.getElementById('appPhotoGhostInput');
    if (ghostInput) ghostInput.value = '';
  });
}

const btnConfirmPhoto = document.getElementById('btnConfirmPhoto');
if (btnConfirmPhoto) {
  btnConfirmPhoto.addEventListener('click', function () {
    if (!appPhotoCropper) {
      alert('กรุณาเลือกรูปภาพก่อนกดยืนยัน');
      return;
    }

    appPhotoCropper.getCroppedCanvas({
      maxWidth: 1600,
      maxHeight: 1600
    }).toBlob((blob) => {
      const croppedFile = new File([blob], 'photo_' + Date.now() + '.jpg', { type: 'image/jpeg' });
      window.appPhotoDataTransfer = new DataTransfer();
      window.appPhotoDataTransfer.items.add(croppedFile);

      const num = window.activePhotoSlot;
      const fileInputObj = document.getElementById('edit_file' + num);
      if (fileInputObj) {
        fileInputObj.files = window.appPhotoDataTransfer.files;
        const reader = new FileReader();
        reader.onload = (re) => {
          document.getElementById('thumb_img_' + num).src = re.target.result;
          document.getElementById('thumb_container_' + num).style.display = 'inline-block';
          const noThumbText = document.getElementById('no_thumb_text_' + num);
          if (noThumbText) noThumbText.style.display = 'none';
        };
        reader.readAsDataURL(croppedFile);
      }


      const modalIns = bootstrap.Modal.getInstance(document.getElementById('appPhotoModal'));
      if (modalIns) modalIns.hide();
    });
  });
}
