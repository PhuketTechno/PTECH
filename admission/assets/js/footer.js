(function () {
  const footerHTML = `
    <!-- ═══════ FOOTER ═══════ -->
    <footer class="footer-brand py-5" style="background:#0b2545;">
      <div class="container text-white">
        <div class="row g-4 justify-content-between align-items-start">

          <!-- Col 1: Brand & Slogan -->
          <div class="col-lg-4 text-center text-lg-start">
            <div class="d-flex align-items-center justify-content-center justify-content-lg-start gap-3 mb-3">
              <img src="" id="footer-logo" alt="Logo" style="width:50px; height:50px; object-fit:contain;"
                class="d-none bg-white rounded-circle p-1">
              <div>
                <h5 class="fw-bold mb-0" id="footer-school-name" style="letter-spacing: -0.5px;">วิทยาลัยฯ</h5>
                <small id="footer-school-name-en" class="opacity-75 d-none">TECHNOLOGY COLLEGE</small>
                 <p id="footer-slogan" class="fst-italic opacity-75 d-none">"สร้างคน สร้างอาชีพ สู่อนาคตที่มั่นคง"</p>
              </div>
            </div>
           
          </div>

          <!-- Col 2: Contact -->
          <div class="col-lg-3">
            <h6 class="fw-bold text-white mb-3 text-center text-lg-start">ติดต่อสอบถาม</h6>
            <ul class="list-unstyled d-flex flex-column gap-2 mb-0 opacity-75 small mx-auto mx-lg-0"
              style="max-width:300px;">
              <li class="d-flex"><i class="bi bi-telephone-fill me-2 mt-1"></i> <span id="footer-phone"></span></li>
              <li class="d-flex"><i class="bi bi-geo-alt-fill me-2 mt-1"></i> <span id="footer-address"></span></li>
            </ul>
          </div>

          <!-- Col 3: Social -->
          <div class="col-lg-5">
            <h6 class="fw-bold text-white mb-3 text-center text-lg-start">ติดตามข่าวสาร & กิจกรรม</h6>
            <div class="d-flex align-items-center justify-content-center justify-content-lg-start gap-4">
              <!-- Social Icons -->
              <div id="footer-links" class="d-flex flex-wrap gap-2"></div>
            </div>
          </div>

        </div>

        <!-- Copyright Bottom -->
        <hr class="border-secondary opacity-50 mt-5 mb-3">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center text-white-50 small">
          <div class="mb-2 mb-md-0">
            © <span id="footer-yr">2570</span> ระบบสมัครเรียนออนไลน์ All rights reserved.
          </div>
          <div class="d-flex gap-3">
            <a href="#" data-bs-toggle="modal" data-bs-target="#privacyModal" class="text-white-50 text-decoration-none hover-white">นโยบายความเป็นส่วนตัว</a>
            <span class="opacity-50">|</span>
            <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal" class="text-white-50 text-decoration-none hover-white">เงื่อนไขการใช้งาน</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Privacy Policy Modal -->
    <div class="modal fade" id="privacyModal" tabindex="-1" aria-labelledby="privacyModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content text-dark">
          <div class="modal-header">
            <h5 class="modal-title" id="privacyModalLabel">นโยบายความเป็นส่วนตัว</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-start">
            <h5>1. การเก็บรวบรวมข้อมูลส่วนบุคคล</h5>
            <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลของท่านเมื่อท่านสมัครเรียนผ่านระบบออนไลน์ของเรา ข้อมูลที่เก็บรวบรวมอาจรวมถึง ชื่อ-นามสกุล, ที่อยู่, เบอร์โทรศัพท์, อีเมล, ผลการเรียน และเอกสารอื่นๆ ที่เกี่ยวข้อง</p>
            
            <h5>2. วัตถุประสงค์ในการเก็บรวบรวมข้อมูล</h5>
            <p>ข้อมูลของท่านจะถูกนำไปใช้เพื่อ:</p>
            <ul>
              <li>พิจารณาคุณสมบัติในการรับสมัครเข้าศึกษา</li>
              <li>ติดต่อสื่อสารและแจ้งผลการรับสมัคร</li>
              <li>จัดทำรายงานสถิติเพื่อพัฒนาการศึกษาตามกฎหมาย</li>
            </ul>

            <h5>3. การเปิดเผยข้อมูล</h5>
            <p>เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก เว้นแต่จะได้รับความยินยอมจากท่าน หรือเป็นไปตามที่กฎหมายกำหนด</p>

            <h5>4. การรักษาความปลอดภัยของข้อมูล</h5>
            <p>เรามีมาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อป้องกันการสูญหาย การเข้าถึง การใช้ หรือการเปิดเผยข้อมูลส่วนบุคคลของท่านโดยไม่ได้รับอนุญาต</p>

            <h5>5. สิทธิของเจ้าของข้อมูล</h5>
            <p>ท่านมีสิทธิในการเข้าถึง แก้ไข ลบ หรือคัดค้านการประมวลผลข้อมูลส่วนบุคคลของท่าน หากท่านต้องการใช้สิทธิดังกล่าว กรุณาติดต่อฝ่ายธุรการของวิทยาลัยฯ</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Terms of Use Modal -->
    <div class="modal fade" id="termsModal" tabindex="-1" aria-labelledby="termsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content text-dark">
          <div class="modal-header">
            <h5 class="modal-title" id="termsModalLabel">เงื่อนไขการใช้งาน</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-start">
            <h5>1. การยอมรับเงื่อนไข</h5>
            <p>การเข้าใช้งานระบบสมัครเรียนออนไลน์นี้ ถือว่าท่านได้อ่านและยอมรับเงื่อนไขการใช้งานทั้งหมดที่ระบุไว้ ณ ที่นี้ หากท่านไม่ยอมรับเงื่อนไขประการใด กรุณางดใช้บริการนี้</p>

            <h5>2. การลงทะเบียนและการให้ข้อมูล</h5>
            <p>ท่านตกลงที่จะให้ข้อมูลที่ถูกต้อง ครบถ้วน และเป็นจริงตามที่ระบบร้องขอ หากพบว่าข้อมูลเป็นเท็จ ทางวิทยาลัยฯ ขอสงวนสิทธิ์ในการยกเลิกหรือเพิกถอนการสมัครของท่านโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>
            
            <h5>3. ความรับผิดชอบต่อผู้ใช้งาน</h5>
            <p>ผู้ใช้งานตกลงว่า จะไม่ใช้ระบบนี้ในทางที่ผิดกฎหมาย หรือในลักษณะที่อาจทำให้ระบบเกิดความเสียหาย ไม่ขัดขวางการทำงานของระบบ และไม่เข้าถึงระบบโดยกระบวนการอื่นนอกเหนือจากอินเทอร์เฟซที่เราเปิดให้บริการ</p>

            <h5>4. ทรัพย์สินทางปัญญา</h5>
            <p>เนื้อหาและซอฟต์แวร์ทั้งหมดในระบบนี้ เป็นทรัพย์สินของวิทยาลัยฯ ห้ามมิให้ทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</p>
            
            <h5>5. การแก้ไขเปลี่ยนแปลง</h5>
            <p>วิทยาลัยฯ ขอสงวนสิทธิ์ในการปรับปรุง แก้ไข หรือเปลี่ยนแปลงเงื่อนไขการใช้งานเหล่านี้ได้ตลอดเวลา โดยการเปลี่ยนแปลงจะมีผลทันทีที่ประกาศบนระบบ</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Scroll to Top Button -->
    <button id="scrollToTopBtn" class="btn btn-primary rounded-circle shadow" 
            style="position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; display: none; z-index: 1050; border: none; background: #0D3B66; align-items: center; justify-content: center; transition: opacity 0.3s;">
      <i class="bi bi-arrow-up fs-4"></i>
    </button>
  `;


    const placeholder = document.getElementById('site-footer');
  if (placeholder) {
    placeholder.outerHTML = footerHTML;
  }


    const yrEl = document.getElementById('footer-yr');
  if (yrEl) {
    yrEl.textContent = new Date().getFullYear() + 543;
  }


    const scrollTopBtn = document.getElementById('scrollToTopBtn');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollTopBtn.style.display = 'flex';
        scrollTopBtn.style.opacity = '1';
      } else {
        scrollTopBtn.style.opacity = '0';
        setTimeout(() => { if (window.scrollY <= 300) scrollTopBtn.style.display = 'none'; }, 300);
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
