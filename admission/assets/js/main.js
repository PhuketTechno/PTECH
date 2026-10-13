(function () {

  document.getElementById('pvc-list').innerHTML = skeletonBranchChips(5);
  document.getElementById('pvs-list').innerHTML = skeletonBranchChips(5);
  if (document.getElementById('pvc-promo')) {
    document.getElementById('pvc-promo').innerHTML = skeletonPromoCard();
  }
  if (document.getElementById('pvs-promo')) {
    document.getElementById('pvs-promo').innerHTML = skeletonPromoCard();
  }
  const linkHostEl = document.getElementById('footer-links');
  if (linkHostEl) {
    linkHostEl.innerHTML = skeletonBox('90px', '1.6em', 'border-radius:999px;margin:0 0.3rem 0.5rem;') +
      skeletonBox('90px', '1.6em', 'border-radius:999px;margin:0 0.3rem 0.5rem;');
  }


  setupCharacterScrollIn();


  Promise.allSettled([
    loadSiteConfig(),
    loadPromotionsSection(),
    loadFooterLinks(),
    loadBranchesSection(),
  ]);

  function setupCharacterScrollIn() {
    const characterEls = document.querySelectorAll('.level-character');
    if (!characterEls.length) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.35 });
      characterEls.forEach(el => io.observe(el));
    } else {
      characterEls.forEach(el => el.classList.add('in-view'));
    }
  }

  async function loadSiteConfig() {
    try {
      const cfg = await fetchConfig();

      document.getElementById('page-title').textContent = `สมัครเรียนออนไลน์ | ${cfg.school_name || ''}`;
      document.getElementById('nav-school-name').textContent = cfg.school_name || 'วิทยาลัย';

      const navSchoolEn = document.getElementById('nav-school-name-en');
      if (navSchoolEn) {
        if (cfg.school_name_en) {
          navSchoolEn.textContent = cfg.school_name_en;
          navSchoolEn.classList.remove('d-none');
        } else {
          navSchoolEn.classList.add('d-none');
        }
      }

      const footSchool = document.getElementById('footer-school-name');
      if (footSchool) footSchool.textContent = cfg.school_name || '';

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
      if (document.getElementById('hero-year')) document.getElementById('hero-year').textContent = `ปีการศึกษา ${cfg.year || ''}`;
      if (document.getElementById('hero-school-name')) document.getElementById('hero-school-name').textContent = cfg.school_name || '';

      const logoEl = document.getElementById('nav-logo');
      const footerLogo = document.getElementById('footer-logo');

      if (cfg.logo_url) {
        logoEl.src = toDriveImgSrc(cfg.logo_url);
        logoEl.classList.remove('d-none');
        if (footerLogo) {
          footerLogo.src = toDriveImgSrc(cfg.logo_url);
          footerLogo.classList.remove('d-none');
        }
      } else {

        logoEl.src = toDriveImgSrc('1hQmJz3B281BiRsrDluYP7HVpabqNPhqF');
        logoEl.classList.remove('d-none');
        if (footerLogo) {
          footerLogo.src = toDriveImgSrc('1hQmJz3B281BiRsrDluYP7HVpabqNPhqF');
          footerLogo.classList.remove('d-none');
        }
      }

      if (cfg.favicon_url) document.getElementById('favicon').href = toDriveImgSrc(cfg.favicon_url);
      if (cfg.hero_image) {
        const heroBg = document.getElementById('hero-dynamic-bg');
        if (heroBg) {
          heroBg.style.backgroundImage = `url('${toDriveImgSrc(cfg.hero_image)}')`;
          const animDirs = ['left', 'right', 'top', 'bottom', 'zoom'];
          const dir = animDirs[Math.floor(Math.random() * animDirs.length)];
          heroBg.classList.add('hero-bg-anim-' + dir);
        } else {
          const hero = document.querySelector('header.hero');
          if (hero) {
            hero.style.backgroundImage = `url('${toDriveImgSrc(cfg.hero_image)}')`;
            hero.style.backgroundSize = 'cover';
            hero.style.backgroundPosition = 'top right';
          }
        }
      }

      const mobileHeroImageSrc = cfg.hero_image_mobile ? cfg.hero_image_mobile : cfg.hero_image;
      if (mobileHeroImageSrc) {
        const heroBgMobile = document.getElementById('hero-dynamic-bg-mobile');
        if (heroBgMobile) {
          heroBgMobile.style.backgroundImage = `url('${toDriveImgSrc(mobileHeroImageSrc)}')`;
          const animDirs = ['left', 'right', 'top', 'bottom', 'zoom'];
          const dir = animDirs[Math.floor(Math.random() * animDirs.length)];
          heroBgMobile.classList.add('hero-bg-anim-' + dir);
        }
      }
      setCardVisual('pvc-head-visual', 'pvc-head-icon', toDriveImgSrc(cfg.pvc_card_image));
      setCardVisual('pvs-head-visual', 'pvs-head-icon', toDriveImgSrc(cfg.pvs_card_image));
      setupVideoSection(cfg.youtube_id);
    } catch (err) {
      console.error('loadSiteConfig failed:', err);
      setupVideoSection(null);
    }
  }


  function setupVideoSection(youtubeIdRaw) {
    const section = document.getElementById('video-section');
    const youtubeId = extractYouTubeId(youtubeIdRaw);
    if (!youtubeId) { section.classList.add('d-none'); return; }

    const thumb = document.getElementById('yt-thumbnail');
    if (thumb) {
      thumb.src = `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/sddefault.jpg`;
    }

    const modalEl = document.getElementById('youtubeModal');
    const iframe = document.getElementById('ytIframe');
    if (modalEl && iframe) {
      modalEl.addEventListener('show.bs.modal', () => {
        iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1`;
      });
      modalEl.addEventListener('hide.bs.modal', () => {
        iframe.src = '';
      });
    }
  }

  function setCardVisual(visualId, iconId, url) {
    const visual = document.getElementById(visualId);
    const icon = document.getElementById(iconId);
    if (!visual) return;
    if (url) {
      visual.style.backgroundImage = `url('${url}')`;
      visual.dataset.hasImage = '1';
      if (icon) icon.style.display = 'none';


      const dirs = ['left', 'right', 'bottom', 'top'];
      const rand = dirs[Math.floor(Math.random() * dirs.length)];
      visual.dataset.animDir = rand;
      visual.classList.add('char-anim-' + rand);
    } else {
      visual.style.backgroundImage = 'none';
      visual.dataset.hasImage = '0';
      if (icon) icon.style.display = 'inline-block';
    }
  }

  async function loadPromotionsSection() {
    try {
      const promos = await fetchPromotions();
      const activePromos = promos.filter(p => p.enabled && p.description);

      const renderLevelPromos = (level, hostId) => {
        const host = document.getElementById(hostId);
        if (!host) return;
        const levelPromos = activePromos.filter(p => p.level === level);
        if (levelPromos.length === 0) {
          host.innerHTML = `
            <div class="card border-0 rounded-4 h-100 d-flex align-items-center justify-content-center p-4 text-center promo-empty-box"
                 style="background: #F8FAFC; border: 1.5px dashed #CBD5E1 !important; min-height: 220px;">
              <div class="p-3">
                <div class="rounded-circle bg-white shadow-xs d-inline-flex align-items-center justify-content-center mb-3 text-primary" style="width: 52px; height: 52px;">
                  <i class="bi bi-gift fs-3"></i>
                </div>
                <h6 class="fw-bold text-dark mb-1">สิทธิประโยชน์พิเศษสำหรับผู้สมัคร</h6>
                <p class="text-secondary small mb-0 lh-base">
                  รับสิทธิ์แบ่งชำระค่าเรียน และสิทธิ์สมัครขอรับทุนการศึกษาหรือกองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.) ตามระเบียบวิทยาลัย
                </p>
              </div>
            </div>
          `;
          return;
        }

        const buildPromoCard = (p) => `
          <div class="card border-0 shadow-sm rounded-4 w-100 h-100 promo-card-item" 
               style="background: linear-gradient(145deg, #FFFDF8 0%, #FFF8E6 100%); border: 1.5px solid #FFE69C !important; box-shadow: 0 4px 14px rgba(255, 193, 7, 0.12) !important;">
            <div class="card-body p-3 p-xl-4 d-flex flex-column h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge text-dark fw-bold px-3 py-1 rounded-pill" style="background: #FFC107; font-size:0.85rem;">
                  <i class="bi bi-star-fill text-dark me-1"></i> สิทธิพิเศษ ${level}
                </span>
                <span class="badge bg-white text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small">
                  <i class="bi bi-fire text-warning me-1"></i>Hot
                </span>
              </div>
              
              <div class="d-flex flex-column gap-3">
                ${p.image_url ? `
                <div class="rounded-3 overflow-hidden bg-white shadow-sm position-relative w-100" style="height: 175px;">
                  <img src="${escapeHtml(toDriveImgSrc(p.image_url))}" class="w-100 h-100 promo-img-card" 
                       alt="โปรโมชั่น" role="button" title="คลิกเพื่อดูรูปขนาดเต็ม" 
                       data-bs-toggle="modal" data-bs-target="#imgPreviewModal" data-src="${escapeHtml(toDriveImgSrc(p.image_url))}"
                       style="cursor:zoom-in; object-fit: cover; transition: transform 0.3s ease;">
                  <div class="position-absolute bottom-0 end-0 m-2">
                    <span class="badge bg-dark bg-opacity-75 text-white rounded-pill px-2 py-1" style="font-size: 0.72rem;">
                      <i class="bi bi-arrows-fullscreen me-1"></i>ขยายภาพ
                    </span>
                  </div>
                </div>
                ` : ''}
                <div class="flex-grow-1" style="max-height: 220px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent;">
                  ${p.title ? `<h6 class="fw-bold text-dark mb-2 fs-6 lh-base">${escapeHtml(p.title)}</h6>` : ''}
                  <p class="mb-0 text-secondary small lh-base" style="white-space:pre-line;">${escapeHtml(p.description)}</p>
                </div>
              </div>
            </div>
          </div>
        `;

        if (levelPromos.length === 1) {
          host.innerHTML = buildPromoCard(levelPromos[0]);
        } else {
          const carouselId = `carouselPromo${hostId}`;
          const items = levelPromos.map((p, ix) => `
            <div class="carousel-item ${ix === 0 ? 'active' : ''}">
              ${buildPromoCard(p)}
            </div>
          `).join('');

          const indicators = levelPromos.map((p, ix) => `
            <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${ix}" ${ix === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${ix + 1}" style="background-color: #FFC107; width: 10px; height: 10px; border-radius: 50%; opacity: 0.5; margin: 0 4px; border: none; padding: 0;"></button>
          `).join('');

          host.innerHTML = `
            <div id="${carouselId}" class="carousel carousel-dark slide h-100 d-flex flex-column" data-bs-ride="carousel" data-bs-interval="5000">
              <div class="carousel-inner flex-grow-1 pb-2">
                ${items}
              </div>
              
              <!-- Custom Controls Footer -->
              <div class="d-flex align-items-center justify-content-center mt-2 gap-3 pt-1">
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" class="btn btn-sm btn-link text-dark p-0 text-decoration-none d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;">
                  <span class="carousel-control-prev-icon" aria-hidden="true" style="width: 1rem; height: 1rem;"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                
                <div class="d-flex align-items-center m-0">
                  ${indicators}
                </div>
                
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide="next" class="btn btn-sm btn-link text-dark p-0 text-decoration-none d-flex align-items-center justify-content-center" style="width: 28px; height: 28px;">
                  <span class="carousel-control-next-icon" aria-hidden="true" style="width: 1rem; height: 1rem;"></span>
                  <span class="visually-hidden">Next</span>
                </button>
              </div>
            </div>
          `;
        }

        host.querySelectorAll('.promo-img-card').forEach(el => {
          el.addEventListener('click', function () {
            const src = this.getAttribute('data-src');
            const previewEl = document.getElementById('imgPreviewSrc');
            if (previewEl) previewEl.src = src;
          });
        });
      };

      renderLevelPromos('ปวช.', 'pvc-promo');
      renderLevelPromos('ปวส.', 'pvs-promo');

    } catch (err) {
      console.error('loadPromotionsSection failed:', err);
      if (document.getElementById('pvc-promo')) document.getElementById('pvc-promo').innerHTML = '';
      if (document.getElementById('pvs-promo')) document.getElementById('pvs-promo').innerHTML = '';
    }
  }


  async function loadFooterLinks() {
    const linkHost = document.getElementById('footer-links');
    if (!linkHost) return;
    try {
      const links = await fetchSocialLinks();
      linkHost.innerHTML = links.map(l => `
        <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="btn btn-outline-light rounded-pill btn-sm me-2 mb-2">
          <i class="bi ${escapeHtml(l.icon) || 'bi-link-45deg'} me-1"></i>${escapeHtml(l.label)}
        </a>`).join('');
    } catch (err) {
      console.error('loadFooterLinks failed:', err);
      linkHost.innerHTML = '';
    }
  }


  async function loadBranchesSection() {
    try {
      const [pvc, pvs] = await Promise.all([fetchBranches('ปวช.'), fetchBranches('ปวส.')]);

      const groupBranches = (branches) => {
        const grouped = [];
        branches.forEach(b => {
          let g = grouped.find(x => x.name === b.name && x.price === b.price);
          if (g) {
            if (b.track && !g.track.includes(b.track)) {
              g.track += '/' + b.track;
            }
          } else {
            grouped.push({ ...b });
          }
        });
        return grouped;
      };

      const groupedPvs = groupBranches(pvs);

      renderBranchList('pvc-list', pvc);
      renderBranchList('pvs-list', groupedPvs);
    } catch (err) {
      console.error('loadBranchesSection failed:', err);
      const msg = `<p class="text-danger p-3 mb-0"><i class="bi bi-exclamation-triangle me-1"></i>โหลดข้อมูลสาขาวิชาไม่สำเร็จ กรุณาลองรีเฟรชหน้าใหม่</p>`;
      document.getElementById('pvc-list').innerHTML = msg;
      document.getElementById('pvs-list').innerHTML = msg;
    }
  }

  function getBranchMeta(name) {
    if (name.includes('บัญชี')) {
      return {
        icon: 'bi-calculator-fill',
        color: '#047857',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #E6FBF2 100%)',
        border: '#A7F3D0',
        badgeBg: '#D1FAE5',
        badgeColor: '#065F46',
        tag: 'การเงิน & บัญชี'
      };
    }
    if (name.includes('ตลาด')) {
      return {
        icon: 'bi-megaphone-fill',
        color: '#C2410C',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #FFF1E6 100%)',
        border: '#FED7AA',
        badgeBg: '#FFEDD5',
        badgeColor: '#9A3412',
        tag: 'การตลาดดิจิทัล'
      };
    }
    if (name.includes('ดิจิทัล')) {
      return {
        icon: 'bi-laptop-fill',
        color: '#1D4ED8',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #EBF3FF 100%)',
        border: '#BFDBFE',
        badgeBg: '#DBEAFE',
        badgeColor: '#1E40AF',
        tag: 'คอมพิวเตอร์ & ดิจิทัล'
      };
    }
    if (name.includes('สารสนเทศ') || name.includes('สนเทศ')) {
      return {
        icon: 'bi-hdd-network-fill',
        color: '#0369A1',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #E6F6FF 100%)',
        border: '#BAE6FD',
        badgeBg: '#E0F2FE',
        badgeColor: '#0369A1',
        tag: 'ไอที & ระบบเครือข่าย'
      };
    }
    if (name.includes('โรงแรม')) {
      return {
        icon: 'bi-building-fill',
        color: '#6D28D9',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #F5EDFF 100%)',
        border: '#DDD6FE',
        badgeBg: '#EDE9FE',
        badgeColor: '#5B21B6',
        tag: 'การโรงแรม & ที่พัก'
      };
    }
    if (name.includes('ท่องเที่ยว')) {
      return {
        icon: 'bi-airplane-fill',
        color: '#0F766E',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #E6FAF8 100%)',
        border: '#99F6E4',
        badgeBg: '#CCFBF1',
        badgeColor: '#115E59',
        tag: 'การท่องเที่ยว & บริการ'
      };
    }
    if (name.includes('โลจิสติกส์') || name.includes('ลอจิสติกส์')) {
      return {
        icon: 'bi-truck',
        color: '#B45309',
        cardBg: 'linear-gradient(145deg, #ffffff 40%, #FFF8E1 100%)',
        border: '#FDE68A',
        badgeBg: '#FEF3C7',
        badgeColor: '#92400E',
        tag: 'โลจิสติกส์ & ซัพพลายเชน'
      };
    }
    return {
      icon: 'bi-mortarboard-fill',
      color: '#0E3B67',
      cardBg: 'linear-gradient(145deg, #ffffff 40%, #EDF4FB 100%)',
      border: '#CBD5E1',
      badgeBg: '#E2E8F0',
      badgeColor: '#1E293B',
      tag: 'หลักสูตรวิชาชีพ'
    };
  }

  function renderBranchList(hostId, branches) {
    const host = document.getElementById(hostId);
    if (!branches || branches.length === 0) {
      host.innerHTML = `<p class="text-muted p-3 mb-0">ไม่มีข้อมูลสาขาวิชา</p>`;
      return;
    }

    host.innerHTML = branches.map(b => {
      const meta = getBranchMeta(b.name);
      const tracksBadges = b.track ? b.track.split('/').map(t => `
        <span class="badge bg-light-subtle text-secondary border px-2.5 py-1 rounded-pill" style="font-size: 0.85rem; font-weight: 600;">
          <i class="bi bi-check2 me-1" style="color: ${meta.color};"></i>${escapeHtml(t.trim())}
        </span>
      `).join(' ') : '';

      return `
        <div class="branch-item-card card border-0 rounded-4 p-3 p-sm-4 shadow-sm h-100 position-relative d-flex flex-column justify-content-between overflow-hidden"
             style="background: ${meta.cardBg}; border: 1.5px solid ${meta.border} !important; box-shadow: 0 4px 14px rgba(13, 59, 102, 0.05);"
             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 26px -4px rgba(13, 59, 102, 0.12)';"
             onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 14px rgba(13, 59, 102, 0.05)';">

          <!-- Watermark Background Icon (Tilted at top-right corner) -->
          <div class="branch-card-bg-icon position-absolute" 
               style="top: -15px; right: -15px; font-size: 5.6rem; color: ${meta.color}; opacity: 0.13; transform: rotate(15deg); pointer-events: none; z-index: 0; line-height: 1;">
            <i class="bi ${meta.icon}"></i>
          </div>

          <!-- Foreground Content -->
          <div class="position-relative z-1">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="badge rounded-pill px-3 py-1.5 fw-bold d-inline-flex align-items-center gap-1.5 shadow-xs"
                    style="background: #ffffff; color: ${meta.badgeColor}; font-size: 0.85rem; border: 1.5px solid ${meta.border};">
                <span class="d-inline-block rounded-circle" style="width: 8px; height: 8px; background: ${meta.color};"></span>
                ${meta.tag}
              </span>
            </div>

            <div class="my-auto py-2">
              <h4 class="fw-bolder mb-0 branch-title-text" title="${escapeHtml(b.name)}" style="color: #0B2540; font-size: clamp(1.4rem, 2.2vw, 1.75rem); letter-spacing: -0.4px; line-height: 1.35; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">
                ${escapeHtml(b.name)}
              </h4>
            </div>

            ${tracksBadges ? `
            <div class="d-flex flex-wrap gap-1.5 mt-2 mb-1">
              ${tracksBadges}
            </div>` : ''}
          </div>

          <div class="position-relative z-1 mt-3 pt-3 d-flex justify-content-between align-items-center"
               style="border-top: 1px dashed rgba(13, 59, 102, 0.18);">
            <span class="fw-semibold" style="color: #475569; font-size: 0.95rem;">
              <i class="bi bi-wallet2 me-1.5 text-secondary"></i> ค่าใช้จ่ายรวม
            </span>
            <span class="fw-bolder" style="font-size: 1.22rem; color: #0D3B66;">
              ${formatBaht(b.price)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

})();

