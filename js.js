/*
 * Settings (giữ của bạn)
 */
var settings = {
  particles: {
    length: 1500,     // số hạt
    duration: 2,      // thời gian sống (s)
    velocity: 135,    // vận tốc (px/s)
    effect: -0.35,    // gia tốc theo vận tốc (tạo đuôi đẹp)
    size: 14          // kích thước hạt
  },
};

/* Polyfill requestAnimationFrame (giữ của bạn) */
(function() {
  var b = 0;
  var c = ["ms", "moz", "webkit", "o"];
  for (var a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
    window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
    window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"] || window[c[a] + "CancelRequestAnimationFrame"];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(h, e) {
      var d = new Date().getTime();
      var f = Math.max(0, 16 - (d - b));
      var g = window.setTimeout(function(){ h(d + f) }, f);
      b = d + f; return g;
    }
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(d){ clearTimeout(d) }
  }
}());

/* Point class (giữ của bạn) */
var Point = (function() {
  function Point(x, y) { this.x = (x!==undefined)?x:0; this.y = (y!==undefined)?y:0; }
  Point.prototype.clone = function(){ return new Point(this.x, this.y); };
  Point.prototype.length = function(length){
    if (length===undefined) return Math.sqrt(this.x*this.x + this.y*this.y);
    this.normalize(); this.x*=length; this.y*=length; return this;
  };
  Point.prototype.normalize = function(){
    var l = this.length(); this.x/=l; this.y/=l; return this;
  };
  return Point;
})();

/* Particle class (giữ của bạn) */
var Particle = (function() {
  function Particle(){ this.position=new Point(); this.velocity=new Point(); this.acceleration=new Point(); this.age=0; }
  Particle.prototype.initialize = function(x,y,dx,dy){
    this.position.x=x; this.position.y=y; this.velocity.x=dx; this.velocity.y=dy;
    this.acceleration.x = dx * settings.particles.effect;
    this.acceleration.y = dy * settings.particles.effect;
    this.age=0;
  };
  Particle.prototype.update = function(dt){
    this.position.x += this.velocity.x*dt;
    this.position.y += this.velocity.y*dt;
    this.velocity.x += this.acceleration.x*dt;
    this.velocity.y += this.acceleration.y*dt;
    this.age += dt;
  };
  Particle.prototype.draw = function(ctx, img){
    function ease(t){ return (--t)*t*t + 1; }
    var size = img.width * ease(this.age / settings.particles.duration);
    ctx.globalAlpha = 1 - this.age / settings.particles.duration;
    ctx.drawImage(img, this.position.x - size/2, this.position.y - size/2, size, size);
  };
  return Particle;
})();

/* ParticlePool class (giữ của bạn) */
var ParticlePool = (function() {
  var particles, firstActive=0, firstFree=0, duration=settings.particles.duration;
  function ParticlePool(length){ particles=new Array(length); for(var i=0;i<particles.length;i++) particles[i]=new Particle(); }
  ParticlePool.prototype.add = function(x,y,dx,dy){
    particles[firstFree].initialize(x,y,dx,dy);
    firstFree++; if(firstFree==particles.length) firstFree=0;
    if(firstActive==firstFree) firstActive++; if(firstActive==particles.length) firstActive=0;
  };
  ParticlePool.prototype.update = function(dt){
    var i;
    if(firstActive<firstFree){ for(i=firstActive;i<firstFree;i++) particles[i].update(dt); }
    if(firstFree<firstActive){ for(i=firstActive;i<particles.length;i++) particles[i].update(dt); for(i=0;i<firstFree;i++) particles[i].update(dt); }
    while (particles[firstActive].age >= duration && firstActive!=firstFree){
      firstActive++; if(firstActive==particles.length) firstActive=0;
    }
  };
  ParticlePool.prototype.draw = function(ctx, img){
    var i;
    if(firstActive<firstFree){ for(i=firstActive;i<firstFree;i++) particles[i].draw(ctx,img); }
    if(firstFree<firstActive){ for(i=firstActive;i<particles.length;i++) particles[i].draw(ctx,img); for(i=0;i<firstFree;i++) particles[i].draw(ctx,img); }
  };
  return ParticlePool;
})();

/* Heart + Galaxy text trên cùng một canvas */
(function(canvas){
  var ctx = canvas.getContext('2d'),
      particles = new ParticlePool(settings.particles.length),
      particleRate = settings.particles.length / settings.particles.duration,
      time;

  function pointOnHeart(t){
    return new Point(
      160*Math.pow(Math.sin(t),3),
      130*Math.cos(t) - 50*Math.cos(2*t) - 20*Math.cos(3*t) - 10*Math.cos(4*t) + 25
    );
  }

  // Tạo hình hạt trái tim (giữ của bạn)
  var image = (function(){
    var c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = settings.particles.size; c.height = settings.particles.size;
    function to(t){
      var p = pointOnHeart(t);
      p.x = c.width/3  + p.x * c.width/550;
      p.y = c.height/3 - p.y * c.height/550;
      return p;
    }
    x.beginPath();
    var t = -Math.PI, p = to(t);
    x.moveTo(p.x, p.y);
    while (t < Math.PI){ t += 0.01; p = to(t); x.lineTo(p.x, p.y); }
    x.closePath();
    x.fillStyle = '#ea80b0';
    x.fill();
    var img = new Image(); img.src = c.toDataURL(); return img;
  })();

  /* ====== PHẦN MỚI: Vẽ chữ “Trung Thu” theo quỹ đạo dải ngân hà ====== */
  const galaxyText = ' TRUNG THU VUI VẺ • ';
  const charStep   = 0.28;   // khoảng góc giữa các ký tự (rad)
  const a = 8;               // tham số spiral: r = a * e^(b*theta)
  const b = 0.06;
  const speed = 0.6;         // tốc độ chạy (rad/s)

  function drawGalaxyText(t){
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.73;   // đặt dưới trái tim
    const maxR = Math.min(220, canvas.width * 0.35); // giới hạn trong khung hình
    const totalChars = 120;            // số ký tự vẽ

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.95)'; // vàng
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 16;

    for (let i = 0; i < totalChars; i++) {
      const theta = i*charStep + speed * t;        // góc hiện tại (dịch theo thời gian)
      let r = a * Math.exp(b * theta);             // bán kính spiral
      if (r > maxR) continue;                      // không vẽ ngoài khung

      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      const angle = theta + Math.PI/2;             // tiếp tuyến để chữ “hướng” theo quỹ đạo
      const ch = galaxyText[i % galaxyText.length];

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  /* ====== Hết phần mới ====== */

  function render(){
    requestAnimationFrame(render);

    // tính thời gian
    var newTime = new Date().getTime() / 1000,
        dt = newTime - (time || newTime);
    time = newTime;

    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // tạo hạt trái tim
    var amount = particleRate * dt;
    for (var i = 0; i < amount; i++) {
      var pos = pointOnHeart(Math.PI - 2*Math.PI*Math.random());
      var dir = pos.clone().length(settings.particles.velocity);
      particles.add(canvas.width/2 + pos.x, canvas.height/2 - pos.y, dir.x, -dir.y);
    }

    // cập nhật & vẽ trái tim
    particles.update(dt);
    particles.draw(ctx, image);

    // vẽ chữ theo dải ngân hà phía dưới
    drawGalaxyText(time);
  }

  function onResize(){
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.onresize = onResize;

  setTimeout(function(){ onResize(); render(); }, 10);
})(document.getElementById('pinkboard'));

// Thêm vào đầu hoặc cuối file js.js (file js hiện có của bạn).
// (function() {
//   const audio = document.getElementById('bg-music');
//   const playBtn = document.getElementById('music-play-btn');

//   if (!audio) return;

//   // style nút (nếu bạn muốn đặt CSS trực tiếp)
//   playBtn.style.position = 'fixed';
//   playBtn.style.right = '18px';
//   playBtn.style.bottom = '18px';
//   playBtn.style.zIndex = 9999;
//   playBtn.style.width = '48px';
//   playBtn.style.height = '48px';
//   playBtn.style.borderRadius = '50%';
//   playBtn.style.border = 'none';
//   playBtn.style.fontSize = '20px';
//   playBtn.style.background = 'rgba(255,255,255,0.85)';
//   playBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
//   playBtn.style.cursor = 'pointer';
//   playBtn.style.display = 'none'; // mặc định ẩn, hiện khi cần

//   // Thử autoplay ngay khi trang load
//   function tryAutoPlay() {
//     // Một số trình duyệt yêu cầu resume audio context; nhưng thử play() trước
//     audio.play().then(() => {
//       // autoplay thành công
//       playBtn.style.display = 'none';
//       console.log('Nhạc đã tự động phát.');
//     }).catch((err) => {
//       // autoplay bị chặn -> hiện nút play để người dùng bấm
//       console.warn('Autoplay bị chặn:', err);
//       playBtn.style.display = 'block';
//     });
//   }

//   // Khi người dùng nhấn nút play (fallback)
//   playBtn.addEventListener('click', function() {
//     audio.play().then(() => {
//       playBtn.style.display = 'none';
//     }).catch((err) => {
//       console.warn('Lỗi khi play sau click:', err);
//     });
//   });

//   // Ngoài ra, khi có bất kỳ tương tác hợp lệ đầu tiên, cố gắng play lại (mobile/desktop)
//   function onFirstInteraction() {
//     audio.play().then(() => {
//       playBtn.style.display = 'none';
//       removeInteractionListeners();
//     }).catch(()=> {
//       // nếu vẫn không được thì giữ nút để người bấm thủ công
//       playBtn.style.display = 'block';
//       removeInteractionListeners();
//     });
//   }
//   function removeInteractionListeners(){
//     window.removeEventListener('click', onFirstInteraction);
//     window.removeEventListener('touchstart', onFirstInteraction);
//     window.removeEventListener('keydown', onFirstInteraction);
//   }

//   window.addEventListener('load', tryAutoPlay);
//   // lắng nghe tương tác đầu tiên
//   window.addEventListener('click', onFirstInteraction, { once: true });
//   window.addEventListener('touchstart', onFirstInteraction, { once: true });
//   window.addEventListener('keydown', onFirstInteraction, { once: true });

// })();

// --- Phần autoplay audio + fallback unmute ---
// (Chèn ở cuối js.js, sau phần của bạn)
// (function() {
//   const audio = document.getElementById('bg-music');
//   const overlay = document.getElementById('unmute-overlay');
//   const unmuteBtn = document.getElementById('unmute-btn');

//   if (!audio) return;

//   // đảm bảo bắt đầu muted để được phép autoplay trên nhiều trình duyệt
//   audio.muted = true;

//   // Thử play sớm (muted) khi DOM load
//   function tryAutoPlay() {
//     // một số trình duyệt vẫn cần gọi play() trả về Promise
//     const p = audio.play();
//     if (p !== undefined) {
//       p.then(() => {
//         // autoplay (muted) thành công
//         hideOverlay();
//       }).catch((err) => {
//         // bị chặn — show overlay để user tương tác
//         showOverlay();
//       });
//     } else {
//       // Nếu không trả Promise, ẩn overlay
//       hideOverlay();
//     }
//   }

//   // Hiện overlay kêu người dùng bật tiếng
//   function showOverlay() {
//     if (overlay) overlay.style.display = 'flex';
//     // lắng nghe thao tác người dùng để resume + unmute
//     addUserGestureListener();
//   }

//   function hideOverlay() {
//     if (overlay) overlay.style.display = 'none';
//     removeUserGestureListener();
//   }

//   // khi người dùng tác động lần đầu, resume AudioContext & play, rồi unmute với fade
//   function userGestureHandler(e) {
//     // gọi play/resume an toàn
//     audio.play().catch(()=>{ /* ignore */ });

//     // unmute an toàn: fade in để tránh giật âm
//     fadeInAudio(audio, 0.02, 1000); // tăng âm lượng lên 1 trong 1 giây

//     hideOverlay();
//   }

//   function addUserGestureListener() {
//     document.addEventListener('pointerdown', userGestureHandler, {passive:true, once:true});
//     document.addEventListener('keydown', userGestureHandler, {passive:true, once:true});
//     if (unmuteBtn) unmuteBtn.addEventListener('click', userGestureHandler, {once:true});
//   }

//   function removeUserGestureListener() {
//     document.removeEventListener('pointerdown', userGestureHandler);
//     document.removeEventListener('keydown', userGestureHandler);
//     if (unmuteBtn) unmuteBtn.removeEventListener('click', userGestureHandler);
//   }

//   // fade in helper: tăng volume từ 0 lên 1 trong duration ms, mỗi step dt ms
//   function fadeInAudio(a, step, duration) {
//     try {
//       a.muted = false;
//       // set initial volume small (0) and ramp up
//       a.volume = 0.0;
//       const steps = Math.max(10, Math.round(duration / 50));
//       const inc = 1.0 / steps;
//       let cur = 0;
//       const t = setInterval(() => {
//         cur += inc;
//         a.volume = Math.min(1, cur);
//         if (a.volume >= 0.99) {
//           a.volume = 1;
//           clearInterval(t);
//         }
//       }, duration / steps);
//     } catch (err) {
//       // nếu trình duyệt không cho phép set volume, thử chỉ unmute
//       try { a.muted = false; } catch(e){}
//     }
//   }

//   // Initial try when DOM is ready
//   document.addEventListener('DOMContentLoaded', function() {
//     tryAutoPlay();
//     // nếu đã chạy muted, ẩn overlay (nếu play success)
//     // nếu bị chặn, tryAutoPlay() sẽ bật overlay
//   });

// })();

(function () {
  const overlay = document.getElementById('unmute-overlay');
  const unmuteBtn = document.getElementById('unmute-btn');
  const playerContainer = document.getElementById('soundcloud-player');

  // Link SoundCloud gốc
  const soundCloudURL = 'https://soundcloud.com/obito-mad-sound/ngoai-le-cua-nhau-3';

  // Hàm tạo iframe embed
  function createSoundCloudIframe(url, autoPlay) {
    const encoded = encodeURIComponent(url);
    const src = `https://w.soundcloud.com/player/?url=${encoded}&auto_play=${autoPlay ? 'true' : 'false'}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;

    const iframe = document.createElement('iframe');
    iframe.width = "0";
    iframe.height = "0";
    iframe.scrolling = "no";
    iframe.frameBorder = "no";
    iframe.allow = "autoplay";
    iframe.src = src;
    return iframe;
  }

  // Ban đầu nạp iframe với auto_play=false
  if (playerContainer) {
    playerContainer.innerHTML = '';
    playerContainer.appendChild(createSoundCloudIframe(soundCloudURL, false));
  }

  // Hiện overlay ngay từ đầu
  if (overlay) overlay.style.display = 'flex';

  // Khi người dùng bấm nút “Bật nhạc”
  if (unmuteBtn) {
    unmuteBtn.addEventListener('click', () => {
      if (playerContainer) {
        playerContainer.innerHTML = '';
        playerContainer.appendChild(createSoundCloudIframe(soundCloudURL, true));
      }
      if (overlay) overlay.style.display = 'none';
    });
  }
})();


/* ====== Lồng đèn trời bay hai bên (thêm vào cuối file) ====== */
(function () {
  const container = document.getElementById('sky-lanterns');
  if (!container) return;

  // cấu hình
  const LEFT_ZONE  = [0.08, 0.28];  // 8% -> 28% viewport width
  const RIGHT_ZONE = [0.72, 0.95];  // 72% -> 95% viewport width
  const MIN_INTERVAL = 550;         // ms
  const MAX_INTERVAL = 1200;        // ms
  const MIN_DURATION = 9000;        // ms
  const MAX_DURATION = 16000;       // ms

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickZone() { return Math.random() < 0.5 ? LEFT_ZONE : RIGHT_ZONE; }

  function spawnLantern() {
    const zone = pickZone();
    const xPct = rand(zone[0], zone[1]) * 100; // %
    const sizeScale = rand(0.75, 1.35);
    const drift = rand(-12, 12);               // lắc ngang nhẹ
    const duration = rand(MIN_DURATION, MAX_DURATION);

    const el = document.createElement('div');
    el.className = 'sky-lantern';
    el.style.left = xPct + 'vw';
    el.style.animationDuration = duration + 'ms';
    el.style.transform = `translateX(-50%) scale(${sizeScale})`;
    el.style.opacity = String(rand(0.7, 0.95));

    // trôi ngang nhẹ nhàng bằng Web Animations API (không nặng)
    el.animate(
      [
        { transform: `translate(-50%, 0) scale(${sizeScale})` },
        { transform: `translate(calc(-50% + ${drift}px), -60vh) scale(${sizeScale * 1.02})` },
        { transform: `translate(calc(-50% + ${-drift}px), -120vh) scale(${sizeScale * 1.05})` }
      ],
      { duration: duration, easing: 'linear' }
    );

    container.appendChild(el);

    // tự hủy khi bay xong
    setTimeout(() => el.remove(), duration + 200);
    // tiếp tục sinh
    setTimeout(spawnLantern, rand(MIN_INTERVAL, MAX_INTERVAL));
  }

  // khởi động sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spawnLantern);
  } else {
    spawnLantern();
  }
})();


