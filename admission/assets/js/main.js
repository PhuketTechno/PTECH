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


  setupNavbarScroll();


  setupSectionReveal();


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
          host.innerHTML = '';
          return;
        }

        const buildPromoCard = (p) => `
          <div class="card border-0 shadow-sm mt-3 rounded-4 w-100" style="background: transparent; border: 1px solid #FFE69C !important; box-shadow: 0 4px 12px rgba(255, 193, 7, 0.15) !important;">
            <div class="card-body p-3 p-lg-4" style="background: linear-gradient(145deg, #FFFDF8 0%, #FFF8E6 100%);">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="badge text-dark fw-bold px-3 py-1 rounded-pill" style="background: #FFC107; font-size:0.85rem;">
                  <i class="bi bi-star-fill text-dark me-1"></i> โปรโมชั่น ${level}
                </span>
              </div>
              
              <div class="d-flex flex-column flex-sm-row gap-3 align-items-start">
                ${p.image_url ? `
                <div class="flex-shrink-0 shadow-sm rounded-3 overflow-hidden bg-white" style="width: 140px; height: 140px;">
                  <img src="${escapeHtml(toDriveImgSrc(p.image_url))}" class="w-100 h-100 promo-img-card" 
                       alt="โปรโมชั่น" role="button" title="คลิกเพื่อดูรูปขนาดเต็ม" 
                       data-bs-toggle="modal" data-bs-target="#imgPreviewModal" data-src="${escapeHtml(toDriveImgSrc(p.image_url))}"
                       style="cursor:zoom-in; object-fit: cover; transition: transform 0.2s;">
                </div>
                ` : ''}
                <div class="flex-grow-1 pe-2" style="max-height: 140px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent;">
                  ${p.title ? `<h6 class="fw-bold text-dark mb-2" style="font-size:1.05rem;">${escapeHtml(p.title)}</h6>` : ''}
                  <p class="mb-0 text-secondary" style="font-size: 0.9rem; white-space:pre-line; line-height: 1.6;">${escapeHtml(p.description)}</p>
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
            <div id="${carouselId}" class="carousel carousel-dark slide mt-2" data-bs-ride="carousel" data-bs-interval="5000">
              <div class="carousel-inner pb-2">
                ${items}
              </div>
              
              <!-- Custom Controls Footer -->
              <div class="d-flex align-items-center justify-content-center mt-2 gap-3">
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" class="btn btn-sm btn-link text-dark p-0 text-decoration-none d-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                  <span class="carousel-control-prev-icon" aria-hidden="true" style="width: 1.2rem; height: 1.2rem;"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                
                <div class="d-flex align-items-center m-0">
                  ${indicators}
                </div>
                
                <button type="button" data-bs-target="#${carouselId}" data-bs-slide="next" class="btn btn-sm btn-link text-dark p-0 text-decoration-none d-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                  <span class="carousel-control-next-icon" aria-hidden="true" style="width: 1.2rem; height: 1.2rem;"></span>
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

  function renderBranchList(hostId, branches) {
    const host = document.getElementById(hostId);
    if (!branches || branches.length === 0) {
      host.innerHTML = `<p class="text-muted p-3 mb-0">ไม่มีข้อมูลสาขาวิชา</p>`;
      return;
    }

    const getIcon = (name) => {
      if (name.includes('บัญชี')) return 'bi-calculator-fill';
      if (name.includes('ตลาด')) return 'bi-megaphone-fill';
      if (name.includes('ดิจิทัล') || name.includes('คอมพิวเตอร์')) return 'bi-laptop';
      if (name.includes('โรงแรม')) return 'bi-building-fill';
      if (name.includes('ท่องเที่ยว')) return 'bi-airplane-fill';
      if (name.includes('ลอจิสติกส์')) return 'bi-truck';
      if (name.includes('สนเทศ')) return 'bi-hdd-network-fill';
      return 'bi-check-circle-fill';
    };

    host.innerHTML = branches.map(b => `
      <div class="d-flex align-items-center mb-3 pb-3 border-bottom border-light w-100">
        <div class="text-primary fs-5 me-3" style="color: #0D3B66 !important;"><i class="bi ${getIcon(b.name)}"></i></div>
        <div class="fw-bold flex-grow-1 text-dark fs-6">
          ${escapeHtml(b.name)} 
          ${b.track ? `<span class="text-muted fw-normal ms-1" style="font-size:0.85em;">(${escapeHtml(b.track)})</span>` : ''}
        </div>
        <div class="fw-bold text-dark fs-6 ms-2">
          ${formatBaht(b.price)} <span class="text-muted fw-normal small"></span>
        </div>
      </div>
    `).join('');
  }

  function setupNavbarScroll() {
    const nav = document.querySelector('.landing-nav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setupSectionReveal() {
    const targets = document.querySelectorAll('.level-card, .promo-banner, .video-embed-wrap');
    if (!targets.length) return;
    targets.forEach(el => el.classList.add('reveal'));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      targets.forEach(el => io.observe(el));
    } else {
      targets.forEach(el => el.classList.add('visible'));
    }
  }
})();

