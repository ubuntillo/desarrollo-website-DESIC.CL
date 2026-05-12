const revealElements = document.querySelectorAll('.reveal');
const stairLinks = Array.from(document.querySelectorAll('.stair-link'));
const stairProgress = document.querySelector('[data-stair-progress]');

function initWebglBackground() {
  const canvas = document.getElementById('webgl-bg');
  const allowMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canvas || typeof THREE === 'undefined' || !allowMotion) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0, 10);

  const starCount = 520;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const scales = new Float32Array(starCount);

  for (let i = 0; i < starCount; i += 1) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 21;
    positions[idx + 1] = (Math.random() - 0.5) * 13;
    positions[idx + 2] = (Math.random() - 0.5) * 7;
    scales[i] = 0.3 + Math.random() * 1.4;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aScale;
      uniform float uTime;
      varying float vPulse;

      void main() {
        vec3 pos = position;
        float drift = sin((pos.x + uTime * 0.25) * 0.9) * 0.07;
        pos.y += drift;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vPulse = 0.35 + 0.65 * sin(uTime * 0.8 + pos.x * 0.4 + pos.y * 0.4);
        gl_PointSize = (1.2 + aScale * 1.8) * (13.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vPulse;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        float glow = smoothstep(0.5, 0.0, dist);
        vec3 color = mix(vec3(0.36, 0.65, 1.0), vec3(0.43, 1.0, 0.78), vPulse);
        gl_FragColor = vec4(color, glow * 0.5);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const lineGeometry = new THREE.BufferGeometry();
  const lineCount = 90;
  const linePositions = new Float32Array(lineCount * 6);

  for (let i = 0; i < lineCount; i += 1) {
    const idx = i * 6;
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 4;
    linePositions[idx] = x;
    linePositions[idx + 1] = y;
    linePositions[idx + 2] = z;
    linePositions[idx + 3] = x + (Math.random() - 0.5) * 1.7;
    linePositions[idx + 4] = y + (Math.random() - 0.5) * 1.3;
    linePositions[idx + 5] = z + (Math.random() - 0.5) * 0.7;
  }

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0x58d8ff, transparent: true, opacity: 0.13 })
  );
  scene.add(lines);

  let frameId = 0;
  const clock = new THREE.Clock();

  const animate = () => {
    const elapsed = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsed;
    points.rotation.y = elapsed * 0.025;
    points.rotation.x = Math.sin(elapsed * 0.18) * 0.06;
    lines.rotation.y = -elapsed * 0.02;
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', onResize);
  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frameId);
    } else {
      animate();
    }
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        entry.target.classList.remove('is-visible');
      }
    });
  },
  {
    threshold: 0.2,
    rootMargin: '0px 0px -6% 0px'
  }
);

revealElements.forEach((section) => observer.observe(section));

function setupCarousel(carousel) {
  const slides = Array.from(carousel.querySelectorAll('.slide'));
  const prevBtn = carousel.querySelector('[data-action="prev"]');
  const nextBtn = carousel.querySelector('[data-action="next"]');

  if (slides.length === 0) {
    return;
  }

  let currentIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
  if (currentIndex < 0) currentIndex = 0;

  function render(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });
  }

  function move(step) {
    currentIndex = (currentIndex + step + slides.length) % slides.length;
    render(currentIndex);
  }

  prevBtn?.addEventListener('click', () => move(-1));
  nextBtn?.addEventListener('click', () => move(1));

  if (slides.length <= 1) {
    prevBtn?.setAttribute('disabled', 'disabled');
    nextBtn?.setAttribute('disabled', 'disabled');
    return;
  }

  let auto = setInterval(() => move(1), 6500);

  carousel.addEventListener('mouseenter', () => {
    clearInterval(auto);
  });

  carousel.addEventListener('mouseleave', () => {
    auto = setInterval(() => move(1), 6500);
  });
}

document.querySelectorAll('[data-carousel]').forEach(setupCarousel);

function updateStairState() {
  if (stairLinks.length === 0) {
    return;
  }

  const sectionEntries = stairLinks
    .map((link) => {
      const id = link.getAttribute('href');
      if (!id || !id.startsWith('#')) return null;
      const section = document.querySelector(id);
      if (!section) return null;
      return { link, section };
    })
    .filter(Boolean);

  const trigger = window.scrollY + window.innerHeight * 0.38;
  let activeIndex = 0;

  sectionEntries.forEach((entry, index) => {
    if (trigger >= entry.section.offsetTop) {
      activeIndex = index;
    }
  });

  sectionEntries.forEach((entry, index) => {
    entry.link.classList.toggle('is-active', index === activeIndex);
    entry.link.classList.toggle('is-grown', index <= activeIndex);
  });

  if (stairProgress) {
    const total = Math.max(sectionEntries.length - 1, 1);
    const ratio = activeIndex / total;
    stairProgress.style.transform = `scaleY(${ratio.toFixed(3)})`;
  }
}

const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');

if (navToggle && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) {
      closeMenu();
    }
  });
}

updateStairState();
document.addEventListener('scroll', updateStairState, { passive: true });
window.addEventListener('resize', updateStairState);
initWebglBackground();
