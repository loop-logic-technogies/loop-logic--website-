(function () {
  var rm = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ---------- Mobile menu ----------
  var bg = document.getElementById('bg');
  var lk = document.getElementById('lk');
  bg.onclick = function () {
    var open = lk.classList.toggle('open');
    bg.setAttribute('aria-expanded', open);
  };
  lk.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') lk.classList.remove('open');
  });

  // ---------- Scroll reveals ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.rv').forEach(function (el, i) {
    var staggered = el.classList.contains('card') || el.classList.contains('proj');
    el.style.transitionDelay = staggered ? (i % 3) * 80 + 'ms' : '0ms';
    io.observe(el);
  });

  // ---------- Process timeline ----------
  var steps = document.getElementById('steps');
  new IntersectionObserver(function (entries, obs) {
    if (entries[0].isIntersecting) {
      steps.classList.add('on');
      obs.disconnect();
    }
  }, { threshold: 0.4 }).observe(steps);

  // ---------- Contact form ----------
  var form = document.getElementById('cf');
  var status = document.getElementById('cs');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(form));
    status.textContent = 'Sending…';
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (x) {
        status.textContent = x.ok
          ? 'Thanks! We will reply within one business day.'
          : (x.j.error || 'Something went wrong.');
        if (x.ok) form.reset();
      })
      .catch(function () {
        status.textContent = 'Network error. Please try again.';
      });
  });

  // ---------- Hero 3D loop (three.js) ----------
  var stage = document.getElementById('stage');
  var fallback = document.getElementById('fb');
  if (!window.THREE) { fallback.style.display = 'grid'; return; }

  try {
    var W = stage.clientWidth, H = stage.clientHeight;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    stage.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.z = 9;

    var group = new THREE.Group();
    scene.add(group);

    function ring(color, emissive, x, rotY) {
      var mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.34, 48, 120),
        new THREE.MeshStandardMaterial({
          color: color, emissive: emissive, emissiveIntensity: 0.35,
          metalness: 0.75, roughness: 0.22
        })
      );
      mesh.position.x = x;
      mesh.rotation.y = rotY;
      group.add(mesh);
      return mesh;
    }
    var ringA = ring(0x0F2048, 0x1B3A8C, -1.05, 0.5);
    var ringB = ring(0x2F6BFF, 0x1A4BD1, 1.05, -0.5);

    var wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.3, 1),
      new THREE.MeshBasicMaterial({ color: 0x6FA0FF, wireframe: true, transparent: true, opacity: 0.12 })
    );
    group.add(wire);

    var orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6FA0FF, emissiveIntensity: 0.6, roughness: 0.15 })
    );
    group.add(orb);

    var cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xDCE6FF, metalness: 0.4, roughness: 0.12, transparent: true, opacity: 0.75 })
    );
    cube.position.set(2.7, 1.9, 0);
    group.add(cube);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var light1 = new THREE.PointLight(0x6FA0FF, 1.6, 30);
    light1.position.set(5, 5, 6);
    scene.add(light1);
    var light2 = new THREE.PointLight(0xffffff, 0.9, 30);
    light2.position.set(-6, -3, 5);
    scene.add(light2);

    // mouse parallax
    var mx = 0, my = 0, tx = 0, ty = 0;
    addEventListener('pointermove', function (e) {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    });

    addEventListener('resize', function () {
      W = stage.clientWidth;
      H = stage.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    });

    // pause rendering when hero is off-screen
    var visible = true;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(stage);

    var t0 = performance.now();
    function loop(now) {
      requestAnimationFrame(loop);
      if (!visible) return;
      var t = (now - t0) / 1000;

      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;

      group.rotation.y = (rm ? 0 : t * 0.25) + tx * 0.9;
      group.rotation.x = ty * 0.6 + 0.15;
      group.position.y = rm ? 0 : Math.sin(t * 0.9) * 0.12;

      ringA.rotation.x = rm ? 0 : t * 0.35;
      ringB.rotation.x = rm ? 0 : -t * 0.35;
      wire.rotation.y = -t * 0.05;

      orb.position.set(Math.cos(t * 0.8) * 2.9, Math.sin(t * 0.8) * 0.9, Math.sin(t * 0.8) * 1.5);
      cube.rotation.x = t * 0.4;
      cube.rotation.y = t * 0.5;

      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  } catch (err) {
    fallback.style.display = 'grid';
  }
})();