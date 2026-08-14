import { useEffect } from "react";
import { Link } from "react-router-dom";
export default function ExamsLanding() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer:fine)").matches;

    function clamp(v, a, b) {
      return Math.min(b, Math.max(a, v));
    }
    function smoothstep(p, a, b) {
      if (a === b) return p < a ? 0 : 1;
      let t = (p - a) / (b - a);
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    }
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    const AXES = [
      { key: "VERBAL", angle: -90 },
      { key: "MATH", angle: 0 },
      { key: "SCIENCE", angle: 90 },
      { key: "READING", angle: 180 },
    ];
    const SCORES = { VERBAL: 0.72, MATH: 0.68, SCIENCE: 0.43, READING: 0.65 };
    const CX = 150,
      CY = 150,
      RMAX = 104;

    function pt(scale, scores, ax) {
      const r = RMAX * scores[ax.key] * scale;
      const rad = (ax.angle * Math.PI) / 180;
      return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
    }
    function polyStr(scale, scores) {
      return AXES.map((a) => pt(scale, scores, a).map((n) => n.toFixed(1)).join(",")).join(" ");
    }
    const ONES = { VERBAL: 1, MATH: 1, SCIENCE: 1, READING: 1 };

    function buildRadarStatic(svg) {
      if (!svg) return null;
      const ns = "http://www.w3.org/2000/svg";
      svg.innerHTML = "";
      const g = document.createElementNS(ns, "g");
      [0.33, 0.66, 1].forEach((s) => {
        const p = document.createElementNS(ns, "polygon");
        p.setAttribute("points", polyStr(s, ONES));
        p.setAttribute("class", "radar-grid");
        g.appendChild(p);
      });
      AXES.forEach((a) => {
        const [x, y] = pt(1, ONES, a);
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", CX);
        line.setAttribute("y1", CY);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y);
        line.setAttribute("class", "radar-axis");
        g.appendChild(line);
        const lx = CX + (x - CX) * 1.22,
          ly = CY + (y - CY) * 1.22;
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", lx);
        text.setAttribute("y", ly);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("class", "radar-label");
        text.textContent = a.key;
        g.appendChild(text);
      });
      svg.appendChild(g);
      const value = document.createElementNS(ns, "polygon");
      value.setAttribute("class", "radar-value");
      value.setAttribute("id", svg.id + "-value");
      svg.appendChild(value);
      return value;
    }

    const radar1 = document.getElementById("radar1");
    const radar2 = document.getElementById("radar2");
    const radar1Value = radar1 ? buildRadarStatic(radar1) : null;
    const radar2Value = radar2 ? buildRadarStatic(radar2) : null;
    if (radar2Value) {
      radar2Value.setAttribute("points", polyStr(1, SCORES));
    }

    let reticle = null,
      deltaLabel = null,
      lockRing = null;
    if (radar2) {
      const ns = "http://www.w3.org/2000/svg";
      reticle = document.createElementNS(ns, "g");
      reticle.setAttribute("class", "reticle");
      reticle.innerHTML =
        '<line x1="-10" y1="0" x2="-4" y2="0"/><line x1="4" y1="0" x2="10" y2="0"/><line x1="0" y1="-10" x2="0" y2="-4"/><line x1="0" y1="4" x2="0" y2="10"/><circle r="6"/>';
      radar2.appendChild(reticle);
      lockRing = document.createElementNS(ns, "circle");
      lockRing.setAttribute("r", "9");
      lockRing.setAttribute("fill", "none");
      lockRing.setAttribute("stroke", "var(--red)");
      lockRing.setAttribute("stroke-width", "1.2");
      lockRing.setAttribute("opacity", "0");
      const sciPt = pt(1, SCORES, AXES[2]);
      lockRing.setAttribute("cx", sciPt[0]);
      lockRing.setAttribute("cy", sciPt[1]);
      radar2.appendChild(lockRing);
      deltaLabel = document.createElementNS(ns, "text");
      deltaLabel.setAttribute("class", "delta-tag");
      deltaLabel.setAttribute("x", sciPt[0] + 14);
      deltaLabel.setAttribute("y", sciPt[1] + 4);
      deltaLabel.setAttribute("opacity", "0");
      deltaLabel.textContent = "\u221218%";
      radar2.appendChild(deltaLabel);
    }
    const waypoints = [AXES[0], AXES[1], AXES[3], AXES[2]].map((a) => pt(1, SCORES, a));

    const chart = document.getElementById("chart");
    let chartPath = null,
      chartDot = null,
      chartLen = 0;
    const WEEK_SCORES = [61, 63, 67, 74, 83, 90, 94];
    if (chart) {
      chart.innerHTML = "";
      const ns = "http://www.w3.org/2000/svg";
      const W = 520,
        H = 300,
        padL = 30,
        padR = 10,
        padT = 20,
        padB = 40;
      const minS = 55,
        maxS = 100;
      const xAt = (i) => padL + (i / (WEEK_SCORES.length - 1)) * (W - padL - padR);
      const yAt = (s) => H - padB - ((s - minS) / (maxS - minS)) * (H - padT - padB);
      const axis = document.createElementNS(ns, "line");
      axis.setAttribute("x1", padL);
      axis.setAttribute("y1", H - padB);
      axis.setAttribute("x2", W - padR);
      axis.setAttribute("y2", H - padB);
      axis.setAttribute("class", "chart-axis");
      chart.appendChild(axis);
      WEEK_SCORES.forEach((s, i) => {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("x", xAt(i));
        t.setAttribute("y", H - padB + 18);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "chart-label");
        t.textContent = i === 0 ? "START" : "WK " + i;
        chart.appendChild(t);
      });
      let d = "";
      WEEK_SCORES.forEach((s, i) => {
        d += (i === 0 ? "M" : "L") + xAt(i).toFixed(1) + " " + yAt(s).toFixed(1) + " ";
      });
      chartPath = document.createElementNS(ns, "path");
      chartPath.setAttribute("d", d);
      chartPath.setAttribute("class", "chart-line");
      chart.appendChild(chartPath);
      chartLen = chartPath.getTotalLength();
      chartPath.style.strokeDasharray = chartLen;
      chartPath.style.strokeDashoffset = chartLen;
      chartDot = document.createElementNS(ns, "circle");
      chartDot.setAttribute("r", "4.5");
      chartDot.setAttribute("class", "chart-dot");
      chart.appendChild(chartDot);
    }

    const examDots = document.getElementById("examDots");
    if (examDots) {
      examDots.innerHTML = "";
      for (let i = 0; i < 10; i++) {
        const s = document.createElement("span");
        examDots.appendChild(s);
      }
    }

    const motes = document.getElementById("motes");
    let moteStyleEl = null;
    if (motes) {
      motes.innerHTML = "";
      for (let i = 0; i < 14; i++) {
        const s = document.createElement("span");
        s.style.left = 10 + Math.random() * 70 + "%";
        s.style.top = 20 + Math.random() * 60 + "%";
        s.style.animation = `float ${6 + Math.random() * 6}s ease-in-out ${Math.random() * 4}s infinite`;
        motes.appendChild(s);
      }
      moteStyleEl = document.createElement("style");
      moteStyleEl.textContent =
        "@keyframes float{0%,100%{transform:translateY(0);opacity:.3;}50%{transform:translateY(-22px);opacity:.8;}}";
      document.head.appendChild(moteStyleEl);
    }

    const sceneIndex = document.getElementById("sceneIndex");
    const sceneIndexText = document.getElementById("sceneIndexText");
    const rail = document.getElementById("rail");
    const railFill = document.getElementById("railFill");
    const cross = document.getElementById("crossCursor");
    const heroEl = document.getElementById("hero");
    const closeEl = document.getElementById("close");
    const examsEl = document.getElementById("examsSection");
    const scenes = [...document.querySelectorAll(".scene")];
    const clockDigital = document.getElementById("clockDigital");
    const clockH = document.getElementById("clockH");
    const clockM = document.getElementById("clockM");
    const examTimer = document.getElementById("examTimer");
    const examProg = document.getElementById("examProg");
    const examCard = document.getElementById("examCard");
    const counter03 = document.getElementById("counter03");
    const counter06 = document.getElementById("counter06");
    const deck = document.getElementById("deck");
    const drills = deck ? [...deck.querySelectorAll(".drill")] : [];

    function sceneProgress(el) {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return r.top <= 0 ? 1 : 0;
      return clamp(-r.top / total, 0, 1);
    }

    let mainRafId = null;

    function update() {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const docH = document.documentElement.scrollHeight - vh;
      const overall = docH > 0 ? clamp(sy / docH, 0, 1) : 0;

      const pastHero = heroEl ? heroEl.getBoundingClientRect().bottom < vh * 0.4 : true;
      const inClose = closeEl ? closeEl.getBoundingClientRect().top < vh * 0.6 : false;
      [sceneIndex, rail].forEach((el) => {
        if (!el) return;
        el.classList.toggle("show", pastHero && !inClose);
      });
      if (railFill) railFill.style.height = overall * 100 + "%";

      let activeLabel = "00";
      const centerY = vh / 2;
      scenes.forEach((sc) => {
        const r = sc.getBoundingClientRect();
        if (r.top <= centerY && r.bottom >= centerY) {
          activeLabel = "0" + sc.dataset.scene;
        }
      });
      if (examsEl) {
        const er = examsEl.getBoundingClientRect();
        if (er.top <= centerY && er.bottom >= centerY) {
          activeLabel = "07";
        }
      }
      if (inClose) activeLabel = "08";
      if (sceneIndexText) sceneIndexText.textContent = activeLabel + " / 08";

      scenes.forEach((sc) => {
        const r = sc.getBoundingClientRect();
        const p = sceneProgress(sc);
        const id = sc.id;

        // Natural cross-fade without black gaps
        const enter = smoothstep(1 - r.top / vh, 0.1, 0.6);
        const exit = r.bottom < vh * 0.7 ? smoothstep(1 - r.bottom / (vh * 0.7), 0, 1) : 0;
        const opacity = Math.min(enter, 1 - exit);

        const content = sc.querySelector(".scene-content");
        const bg = sc.querySelector(".scene-bg");
        if (content) {
          const y = lerp(20, 0, enter) + exit * -15;
          content.style.transform = `translateY(${y}px)`;
          content.style.opacity = Math.max(0.05, opacity);
        }
        if (bg && !reduced) {
          bg.style.transform = `translateY(${-p * 30}px)`;
        }

        const mid = clamp(p, 0, 1);

        if (id === "s1") {
          const stack = sc.querySelector(".paper-stack");
          const glow = sc.querySelector(".lamp-glow");
          const clockEl = sc.querySelector(".clock");
          if (stack && !reduced) stack.style.transform = `translateY(${-mid * 50}px)`;
          if (glow && !reduced) glow.style.transform = `translate(${mid * 20}px, ${-mid * 30}px)`;
          if (clockEl && !reduced) clockEl.style.transform = `translateY(${-mid * 15}px)`;
          if (clockDigital) {
            const mins = Math.round(lerp(298, 372, mid));
            const h = Math.floor(mins / 60),
              m = mins % 60;
            const hh = ((h % 12) || 12).toString().padStart(2, "0");
            clockDigital.textContent = `${hh}:${m.toString().padStart(2, "0")} AM`;
          }
          if (clockH) clockH.style.transform = `rotate(${lerp(150, 185, mid)}deg)`;
          if (clockM) clockM.style.transform = `rotate(${lerp(300, 60, mid)}deg)`;
        }

        if (id === "s2") {
          if (examCard && !reduced)
            examCard.style.transform = `translateY(-50%) perspective(1400px) rotateY(${lerp(
              -6,
              -2,
              mid
            )}deg) rotateX(${lerp(2, 0, mid)}deg)`;
          const secs = Math.round(lerp(1324, 0, mid));
          if (examTimer)
            examTimer.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
              secs % 60
            ).padStart(2, "0")}`;
          const qn = Math.min(40, 1 + Math.floor(mid * 39));
          if (examProg) examProg.textContent = `Q ${String(qn).padStart(2, "0")} / 40`;
          const dotsOn = Math.round(mid * 10);
          if (examDots) {
            [...examDots.children].forEach((d, i) => d.classList.toggle("on", i < dotsOn));
          }
          const opts = sc.querySelectorAll(".opt");
          const selIdx = Math.floor(mid * 4) % 4;
          opts.forEach((o, i) => o.classList.toggle("sel", i === selIdx && mid > 0.05));
        }

        if (id === "s3") {
          if (radar1Value) radar1Value.setAttribute("points", polyStr(Math.max(0.01, mid), SCORES));
          if (counter03) counter03.textContent = Math.round(lerp(0, 100, mid));
        }

        if (id === "s4" && reticle) {
          const t = mid * 3;
          const seg = clamp(Math.floor(t), 0, 2);
          const frac = clamp(t - seg, 0, 1);
          const a = waypoints[seg],
            b = waypoints[Math.min(seg + 1, 3)];
          const x = lerp(a[0], b[0], frac),
            y = lerp(a[1], b[1], frac);
          reticle.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
          const lock = smoothstep(p, 0.65, 0.95);
          if (lockRing) lockRing.setAttribute("opacity", lock);
          if (deltaLabel) deltaLabel.setAttribute("opacity", lock);
        }

        if (id === "s5" && drills.length) {
          const n = drills.length;
          drills.forEach((d, i) => {
            const off = i - (n - 1) / 2;
            const tx = lerp(0, off * 140, mid);
            const ty = lerp(i * 10, off * 10, mid);
            const rot = lerp(off * 3, off * 6, mid);
            const op = smoothstep(mid, i * 0.08, 0.4 + i * 0.08);
            if (!reduced) d.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
            d.style.opacity = Math.max(0.15, op);
            d.style.zIndex = n - i;
            const fg = d.querySelector(".bar-fg");
            if (fg) {
              const target = parseFloat(fg.dataset.target) || 0;
              fg.style.width = op * target + "%";
            }
          });
        }

        if (id === "s6") {
          if (chartPath && chartLen) {
            chartPath.style.strokeDashoffset = chartLen * (1 - mid);
            const cur = chartPath.getPointAtLength(chartLen * mid);
            if (chartDot) {
              chartDot.setAttribute("cx", cur.x);
              chartDot.setAttribute("cy", cur.y);
            }
          }
          if (counter06) counter06.textContent = Math.round(lerp(1, 100, mid));
        }
      });

      mainRafId = requestAnimationFrame(update);
    }
    mainRafId = requestAnimationFrame(update);

    let cursorRafId = null;
    let cx = 0,
      cy = 0,
      tx = 0,
      ty = 0;
    function onMouseMove(e) {
      tx = e.clientX;
      ty = e.clientY;
      if (cross) cross.classList.add("show");
    }
    function onMouseLeave() {
      if (cross) cross.classList.remove("show");
    }
    function cursorRaf() {
      cx = lerp(cx, tx, 0.18);
      cy = lerp(cy, ty, 0.18);
      if (cross) {
        cross.style.left = cx + "px";
        cross.style.top = cy + "px";
      }
      cursorRafId = requestAnimationFrame(cursorRaf);
    }
    if (fine && !reduced && cross) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseleave", onMouseLeave);
      cursorRafId = requestAnimationFrame(cursorRaf);
    }

    /* exam roster reveal */
    const examCards = [...document.querySelectorAll("#examsGrid .glass-card")];
    let io = null;
    if (examCards.length && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const i = examCards.indexOf(entry.target);
              entry.target.style.transitionDelay = i * 70 + "ms";
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      examCards.forEach((c) => io.observe(c));
    } else {
      examCards.forEach((c) => c.classList.add("in"));
    }

    /* hero entrance */
    const heroSection = document.querySelector(".hero");
    function runHeroEntrance() {
      if (!heroSection) return;
      heroSection.style.opacity = "0";
      heroSection.style.transform = "scale(1.02)";
      heroSection.style.transition = "opacity 1.1s ease, transform 1.4s ease";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heroSection.style.opacity = "1";
          heroSection.style.transform = "scale(1)";
        });
      });
    }
    if (document.readyState === "complete") {
      runHeroEntrance();
    } else {
      window.addEventListener("load", runHeroEntrance);
    }

    return () => {
      if (mainRafId) cancelAnimationFrame(mainRafId);
      if (cursorRafId) cancelAnimationFrame(cursorRafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("load", runHeroEntrance);
      if (io) io.disconnect();
      if (moteStyleEl && document.head.contains(moteStyleEl)) {
        document.head.removeChild(moteStyleEl);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .examsph-page{
          --ink:#01142B;
          --ink-2:#031E3D;
          --ink-3:#072B56;
          --parchment:#F3EEE1;
          --pencil:#D4E0EE;
          --graphite:#88A2C2;
          --red:#25A4EE;
          --red-soft:rgba(37,164,238,.25);
          --gold:#6FB8D9;
          --glass-bg:rgba(4, 28, 58, 0.72);
          --glass-border:rgba(42, 102, 172, 0.35);
          --line:rgba(42, 102, 172, 0.3);
          --display:'Fraunces', serif;
          --body:'Inter', sans-serif;
          --mono:'IBM Plex Mono', monospace;
        }
        .examsph-page *{box-sizing:border-box; margin:0; padding:0;}
        .examsph-page{
          background:var(--ink);
          color:var(--pencil);
          font-family:var(--body);
          overflow-x:hidden;
          -webkit-font-smoothing:antialiased;
          position:relative;
        }
        .examsph-page ::selection{background:var(--red); color:#fff;}

        .examsph-page .grain{
          position:fixed; inset:0; z-index:60; pointer-events:none;
          opacity:.03; mix-blend-mode:overlay;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .examsph-page .vignette{
          position:fixed; inset:0; z-index:5; pointer-events:none;
          box-shadow: inset 0 0 18vw 2vw rgba(0,10,25,.65);
          mix-blend-mode:multiply;
        }
        .examsph-page .examsph-nav{
          position:sticky; top:0; z-index:40;
          background:rgba(1, 20, 43, 0.85); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
          border-bottom:1px solid var(--line);
        }
        .examsph-page .examsph-nav-inner{
          max-width:1400px; margin:0 auto; padding:18px 6vw;
          display:flex; align-items:center; justify-content:space-between;
        }
        .examsph-page .examsph-nav-brand{
          display:flex; align-items:center; gap:9px;
          font-family:var(--display); font-size:16px; font-weight:500; letter-spacing:-.01em; color:#F5F2EA;
        }
        .examsph-page .examsph-nav-brand .dot{width:6px; height:6px; border-radius:50%; background:var(--red); flex:none;}

        .examsph-page .examsph-nav-cta{
          font-family:var(--mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:500;
          color:rgb(161,161,161);
          padding:11px 22px;
          border-radius:5px;
          border:solid #404c5d 1px;
          text-decoration:none; white-space:nowrap;
          background:linear-gradient(145deg, #2e2d2d, #212121);
          box-shadow:-1px -5px 15px #41465b, 5px 5px 15px #41465b,
            inset 5px 5px 10px #212121, inset -5px -5px 10px #212121;
          transition:500ms;
        }
        .examsph-page .examsph-nav-cta:hover{
          box-shadow:1px 1px 13px #20232e, -1px -1px 13px #545b78;
          color:#d6d6d6;
          background:linear-gradient(145deg, #2e2d2d, #212121);
          transition:500ms;
        }
        .examsph-page .examsph-nav-cta:active{
          box-shadow:1px 1px 13px #20232e, -1px -1px 33px #545b78;
          color:#d6d6d6;
          transition:100ms;
        }

        .examsph-page .wordmark{
          position:fixed; top:28px; left:32px; z-index:50;
          font-family:var(--mono); font-size:12px; letter-spacing:.14em;
          color:var(--pencil); opacity:0; transform:translateY(-6px);
          transition:opacity .5s ease, transform .5s ease;
          display:flex; align-items:center; gap:8px;
        }
        .examsph-page .wordmark.show{opacity:.85; transform:translateY(0);}
        .examsph-page .wordmark .dot{width:6px; height:6px; border-radius:50%; background:var(--red);}

        .examsph-page .scene-index{
          position:fixed; top:28px; right:32px; z-index:50;
          font-family:var(--mono); font-size:12px; letter-spacing:.1em;
          color:var(--graphite); opacity:0; transition:opacity .5s ease;
          display:flex; align-items:center; gap:8px;
          background:rgba(3, 30, 61, 0.7); padding:6px 14px; border-radius:20px; border:1px solid var(--glass-border);
        }
        .examsph-page .scene-index.show{opacity:.95;}
        .examsph-page .scene-index svg{width:14px; height:14px;}

        .examsph-page .rail{
          position:fixed; right:14px; top:50%; transform:translateY(-50%);
          width:2px; height:160px; background:var(--line); z-index:50;
          opacity:0; transition:opacity .5s ease;
        }
        .examsph-page .rail.show{opacity:1;}
        .examsph-page .rail-fill{position:absolute; left:0; top:0; width:100%; background:var(--red); height:0%;}

        .examsph-page .cross-cursor{
          position:fixed; z-index:55; width:26px; height:26px; pointer-events:none;
          transform:translate(-50%,-50%); opacity:0; transition:opacity .4s ease;
          mix-blend-mode:difference;
        }
        .examsph-page .cross-cursor.show{opacity:.9;}
        .examsph-page .cross-cursor svg{width:100%; height:100%;}

        .examsph-page .eyebrow{
          font-family:var(--mono); font-size:11px; letter-spacing:.22em;
          text-transform:uppercase; color:var(--graphite);
        }
        .examsph-page .eyebrow .rd{color:var(--red);}
        .examsph-page h1,.examsph-page h2{
          font-family:var(--display); font-weight:340; color:#F5F2EA;
          line-height:.98; letter-spacing:-.01em;
        }
        .examsph-page .num{font-family:var(--mono);}

        .examsph-page .hero{
          position:relative; min-height:100vh; display:flex; flex-direction:column;
          justify-content:center; align-items:flex-start; padding:0 6vw;
          overflow:hidden; isolation:isolate;
        }
        .examsph-page .hero-glow{
          position:absolute; inset:0; z-index:-2;
          background:
            radial-gradient(60vw 60vw at 78% 8%, rgba(37,164,238,.20), transparent 60%),
            radial-gradient(50vw 50vw at 10% 100%, rgba(37,164,238,.14), transparent 60%),
            linear-gradient(180deg, #011024 0%, #01142B 60%, #000E20 100%);
        }
        .examsph-page .hero-grid{
          position:absolute; inset:0; z-index:-2; opacity:.25;
          background-image:
            linear-gradient(to right, var(--line) 1px, transparent 1px),
            linear-gradient(to bottom, var(--line) 1px, transparent 1px);
          background-size:64px 64px;
          mask-image: radial-gradient(80% 60% at 50% 30%, black, transparent 85%);
        }
        .examsph-page .hero .eyebrow{margin-bottom:22px;}
        .examsph-page .hero h1{
          font-size:clamp(2.6rem, 7.4vw, 7.4rem);
          max-width:12ch;
        }
        .examsph-page .hero h1 em{font-style:italic; color:var(--red); font-weight:300;}
        .examsph-page .hero-sub{
          margin-top:26px; font-family:var(--mono); font-size:13px; letter-spacing:.04em;
          color:var(--graphite); max-width:34ch; line-height:1.6;
        }
        .examsph-page .scroll-cue{
          position:absolute; bottom:44px; left:6vw; display:flex; align-items:center; gap:10px;
          font-family:var(--mono); font-size:10px; letter-spacing:.2em; color:var(--graphite);
        }
        .examsph-page .scroll-cue .line{width:1px; height:38px; background:linear-gradient(var(--graphite), transparent); position:relative; overflow:hidden;}
        .examsph-page .scroll-cue .line::after{content:''; position:absolute; top:-40%; left:0; width:100%; height:40%; background:var(--red); animation:cue 1.8s ease-in-out infinite;}
        @keyframes cue{0%{top:-40%;} 100%{top:100%;}}

        /* PHOTO FRAME — shared "designed" treatment: a matted border, a slight
           rotation, viewfinder-style corner marks and a mono caption tag, so
           the photos read as art-directed inserts rather than dropped-in stock images. */
        .examsph-page .photo-frame{
          position:relative;
        }
        .examsph-page .photo-frame::before,
        .examsph-page .photo-frame::after{
          content:''; position:absolute; width:16px; height:16px; z-index:3; pointer-events:none;
          border-color:var(--red); border-style:solid;
        }
        .examsph-page .photo-frame::before{ top:14px; left:14px; border-width:1.4px 0 0 1.4px; }
        .examsph-page .photo-frame::after{ bottom:14px; right:14px; border-width:0 1.4px 1.4px 0; }
        .examsph-page .photo-tag{
          position:absolute; left:14px; bottom:14px; z-index:2;
          font-family:var(--mono); font-size:9px; letter-spacing:.14em; text-transform:uppercase;
          color:var(--pencil); background:rgba(1,20,43,.6); border:1px solid var(--glass-border);
          padding:5px 9px; border-radius:2px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
          display:inline-flex; align-items:center; gap:6px;
        }
        .examsph-page .photo-tag .rd{ color:var(--red); font-size:8px; }

        /* HERO PHOTO */
        .examsph-page .hero-photo-wrap{
          position:absolute; right:5vw; top:50%; transform:translateY(-50%) rotate(-1.5deg);
          width:min(30vw,380px); aspect-ratio:3/4; border-radius:18px; overflow:hidden;
          z-index:-1; box-shadow:0 60px 120px rgba(0,5,15,.65); border:1px solid var(--glass-border);
          box-sizing:border-box; padding:9px;
          background:linear-gradient(155deg, rgba(7,43,86,.95), rgba(1,20,43,.98));
        }
        .examsph-page .hero-photo-wrap::after{
          content:''; position:absolute; inset:9px; border-radius:10px; z-index:1; pointer-events:none;
          background:linear-gradient(180deg, rgba(1,20,43,0) 45%, rgba(1,20,43,.5) 100%),
            linear-gradient(90deg, rgba(1,20,43,.3) 0%, transparent 30%);
        }
        .examsph-page .hero-photo-wrap img{
          width:100%; height:100%; object-fit:cover; display:block; border-radius:10px;
          filter:saturate(1.05) contrast(1.06) brightness(.95);
        }

        /* FIXED: Pinaliit mula 180vh tungong 115vh para mawala ang mahabang black gap */
        .examsph-page .scene{position:relative; height:115vh;}
        .examsph-page .scene-sticky{
          position:sticky; top:0; height:100vh; overflow:hidden;
          display:flex; align-items:center;
        }
        .examsph-page .scene-bg{position:absolute; inset:0; z-index:0;}
        .examsph-page .scene-content{position:relative; z-index:2; width:100%; padding:0 6vw;}
        .examsph-page .scene-tag{
          display:flex; align-items:center; gap:10px; margin-bottom:18px;
        }
        .examsph-page .scene-tag .n{font-family:var(--mono); font-size:12px; color:var(--red);}
        .examsph-page .scene-tag .t{font-family:var(--mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--graphite);}
        .examsph-page .scene h2{font-size:clamp(2rem, 5.2vw, 4.6rem); max-width:14ch;}

        #s1 .scene-bg{
          background:
            radial-gradient(34vw 34vw at 82% 30%, rgba(37,164,238,.25), transparent 62%),
            linear-gradient(180deg,#021935 0%, #01142B 100%);
        }
        .examsph-page .lamp-glow{
          position:absolute; top:14%; right:10%; width:46vw; height:46vw; border-radius:50%;
          background:radial-gradient(circle, rgba(37,164,238,.30), transparent 68%);
          filter:blur(4px);
        }
        .examsph-page .paper-stack{position:absolute; right:8vw; top:50%; width:min(30vw,340px);}
        .examsph-page .paper-stack .p{
          position:absolute; width:100%; aspect-ratio:3/4; background:var(--parchment);
          border-radius:3px; box-shadow:0 30px 60px rgba(0,5,15,.6);
        }
        .examsph-page .paper-stack .p1{transform:rotate(-7deg) translateY(-40px);}
        .examsph-page .paper-stack .p2{transform:rotate(4deg) translateY(-10px); opacity:.94;}
        .examsph-page .paper-stack .p3{transform:rotate(-2deg) translateY(20px); opacity:.88;}
        .examsph-page .paper-stack .p span{position:absolute; left:14%; background:rgba(1,20,43,.18); height:3px; border-radius:2px;}
        .examsph-page .clock{position:absolute; width:120px; height:120px; border-radius:50%; border:1px solid var(--glass-border);
          top:16%; right:38%; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); background:rgba(3,30,61,0.5);}
        .examsph-page .clock::before{content:''; position:absolute; inset:14px; border-radius:50%; border:1px solid var(--glass-border);}
        .examsph-page .clock .hand{position:absolute; background:var(--pencil); transform-origin:bottom center; border-radius:2px;}
        .examsph-page .clock .h{width:2px; height:26px; bottom:50%; left:calc(50% - 1px);}
        .examsph-page .clock .m{width:2px; height:38px; bottom:50%; left:calc(50% - 1px); background:var(--red);}
        .examsph-page .motes span{position:absolute; width:2px; height:2px; background:var(--gold); border-radius:50%; opacity:.6;}
        #s1 .time{font-family:var(--mono); font-size:clamp(2.4rem,6vw,4rem); color:var(--pencil); letter-spacing:.02em;}

        /* SCENE 01 PHOTO */
        .examsph-page .s1-photo-wrap{
          position:absolute; left:6vw; top:5vh; transform:rotate(-1.4deg);
          width:min(30vw,380px); aspect-ratio:3/4; border-radius:14px; overflow:hidden;
          z-index:1;
          box-shadow:0 40px 90px rgba(0,5,15,.5); border:1px solid var(--glass-border);
          box-sizing:border-box; padding:7px;
          background:linear-gradient(155deg, rgba(7,43,86,.9), rgba(1,20,43,.96));
        }
        .examsph-page .s1-photo-wrap img{
          width:100%; height:100%; object-fit:cover; display:block; border-radius:8px;
          filter:saturate(1.05) brightness(.92) contrast(1.05);
        }

        #s2 .scene-bg{background:linear-gradient(180deg,#021935 0%, #01142B 100%);}
        .examsph-page .exam-card{
          position:absolute; right:6vw; top:50%; transform:translateY(-50%) perspective(1400px) rotateY(-6deg) rotateX(2deg);
          width:min(46vw,560px); background:var(--ink-3); border:1px solid var(--glass-border); border-radius:14px;
          box-shadow:0 60px 120px rgba(0,5,15,.65); overflow:hidden;
        }
        .examsph-page .exam-card .bar{display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--glass-border); background:rgba(7,43,86,0.4);}
        .examsph-page .exam-card .bar .l{font-family:var(--mono); font-size:11px; letter-spacing:.14em; color:var(--graphite);}
        .examsph-page .exam-card .bar .timer{font-family:var(--mono); font-size:13px; color:var(--red); font-weight:600;}
        .examsph-page .exam-card .body{padding:24px 20px;}
        .examsph-page .qline{height:9px; background:var(--line); border-radius:3px; margin-bottom:10px;}
        .examsph-page .qline.w1{width:92%;} .examsph-page .qline.w2{width:68%;} .examsph-page .qline.w3{width:80%; margin-bottom:22px;}
        .examsph-page .opt{display:flex; align-items:center; gap:12px; padding:11px 12px; border:1px solid var(--glass-border); border-radius:8px; margin-bottom:8px; background:rgba(3,30,61,0.4);}
        .examsph-page .opt .r{width:16px; height:16px; border-radius:50%; border:1px solid var(--graphite); flex:none; position:relative;}
        .examsph-page .opt .r::after{content:''; position:absolute; inset:3px; border-radius:50%; background:var(--red); transform:scale(0); transition:transform .2s;}
        .examsph-page .opt.sel .r::after{transform:scale(1);}
        .examsph-page .opt.sel{border-color:var(--red); background:rgba(37,164,238,.12);}
        .examsph-page .opt .t{height:7px; width:70%; background:var(--line); border-radius:3px;}
        .examsph-page .exam-card .foot{display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-top:1px solid var(--glass-border); background:rgba(7,43,86,0.3);}
        .examsph-page .dots{display:flex; gap:5px;}
        .examsph-page .dots span{width:5px; height:5px; border-radius:50%; background:var(--line);}
        .examsph-page .dots span.on{background:var(--red);}
        .examsph-page .prog-count{font-family:var(--mono); font-size:11px; color:var(--graphite);}

        #s3 .scene-bg, #s4 .scene-bg{background:linear-gradient(180deg,#021935 0%, #01142B 100%);}
        .examsph-page .radar-wrap{position:absolute; right:8vw; top:50%; transform:translateY(-50%); width:min(38vw,420px);}
        .examsph-page .radar-wrap svg{width:100%; height:auto; overflow:visible;}
        .examsph-page .radar-value{fill:rgba(37,164,238,.18); stroke:var(--red); stroke-width:1.8;}
        .examsph-page .radar-grid{fill:none; stroke:var(--line); stroke-width:1;}
        .examsph-page .radar-axis{stroke:var(--line); stroke-width:1;}
        .examsph-page .radar-label{font-family:var(--mono); font-size:10px; fill:var(--graphite); letter-spacing:.08em;}
        .examsph-page .radar-title{font-family:var(--mono); font-size:11px; fill:var(--graphite); letter-spacing:.14em;}
        .examsph-page .big-num{font-family:var(--mono); font-size:clamp(3.2rem,9vw,6.6rem); color:#F5F2EA; line-height:1;}
        .examsph-page .big-num .sfx{font-size:.32em; color:var(--graphite); margin-left:6px;}
        .examsph-page .reticle{pointer-events:none;}
        .examsph-page .reticle line{stroke:var(--red); stroke-width:1.4;}
        .examsph-page .reticle circle{fill:none; stroke:var(--red); stroke-width:1.2;}
        .examsph-page .delta-tag{font-family:var(--mono); font-size:12px; fill:var(--red); font-weight:600;}

        /* SCENE 03 PHOTO */
        .examsph-page .s3-photo-wrap{
          position:absolute; left:6vw; top:5vh; transform:rotate(1.2deg);
          width:min(30vw,380px); aspect-ratio:3/4; border-radius:14px; overflow:hidden;
          z-index:1;
          box-shadow:0 40px 90px rgba(0,5,15,.5); border:1px solid var(--glass-border);
          box-sizing:border-box; padding:7px;
          background:linear-gradient(155deg, rgba(7,43,86,.9), rgba(1,20,43,.96));
        }
        .examsph-page .s3-photo-wrap img{
          width:100%; height:100%; object-fit:cover; display:block; border-radius:8px;
          filter:saturate(1.05) brightness(.92) contrast(1.05);
        }

        #s5 .scene-bg{background:linear-gradient(180deg,#021935 0%, #01142B 100%);}
        .examsph-page .deck{position:absolute; right:6vw; top:50%; width:min(44vw,480px); height:280px; transform:translateY(-50%);}
        .examsph-page .drill{
          position:absolute; inset:0; margin:auto; width:78%; height:190px; top:0; bottom:0;
          background:var(--ink-3); border:1px solid var(--glass-border); border-radius:12px; padding:18px;
          box-shadow:0 40px 80px rgba(0,5,15,.6); will-change:transform, opacity;
        }
        .examsph-page .drill .pill{display:inline-block; font-family:var(--mono); font-size:10px; letter-spacing:.1em; color:var(--red);
          border:1px solid var(--red-soft); padding:3px 8px; border-radius:20px; margin-bottom:14px; background:rgba(37,164,238,.08);}
        .examsph-page .drill .ttl{height:8px; width:70%; background:var(--line); border-radius:3px; margin-bottom:8px;}
        .examsph-page .drill .ttl2{height:8px; width:45%; background:var(--line); border-radius:3px; margin-bottom:20px;}
        .examsph-page .drill .meta{display:flex; justify-content:space-between; align-items:center;}
        .examsph-page .drill .qs{font-family:var(--mono); font-size:11px; color:var(--graphite);}
        .examsph-page .drill .difficulty span{display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--line); margin-left:3px;}
        .examsph-page .drill .difficulty span.on{background:var(--gold);}
        .examsph-page .drill .bar-bg{height:4px; background:var(--line); border-radius:2px; margin-top:14px; overflow:hidden;}
        .examsph-page .drill .bar-fg{height:100%; background:var(--red); width:0%;}

        /* SCENE 05 PHOTO */
        .examsph-page .s5-photo-wrap{
          position:absolute; left:6vw; top:5vh; transform:rotate(-1.1deg);
          width:min(30vw,380px); aspect-ratio:3/4; border-radius:14px; overflow:hidden;
          z-index:1;
          box-shadow:0 40px 90px rgba(0,5,15,.5); border:1px solid var(--glass-border);
          box-sizing:border-box; padding:7px;
          background:linear-gradient(155deg, rgba(7,43,86,.9), rgba(1,20,43,.96));
        }
        .examsph-page .s5-photo-wrap img{
          width:100%; height:100%; object-fit:cover; display:block; border-radius:8px;
          filter:saturate(1.05) brightness(.92) contrast(1.05);
        }

        #s6 .scene-bg{background:linear-gradient(180deg,#021935 0%, #01142B 100%);}
        .examsph-page .chart-wrap{position:absolute; right:5vw; top:50%; transform:translateY(-50%); width:min(46vw,560px);}
        .examsph-page .chart-wrap svg{width:100%; height:auto; overflow:visible;}
        .examsph-page .chart-line{fill:none; stroke:var(--red); stroke-width:2.4; stroke-linecap:round;}
        .examsph-page .chart-axis{stroke:var(--line); stroke-width:1;}
        .examsph-page .chart-dot{fill:var(--red);}
        .examsph-page .chart-label{font-family:var(--mono); font-size:9px; fill:var(--graphite);}
        .examsph-page .jump{display:flex; align-items:baseline; gap:14px; margin-top:8px;}
        .examsph-page .jump .arrow{color:var(--graphite); font-family:var(--mono);}
        .examsph-page .jump .delta{font-family:var(--mono); color:var(--red); font-size:1rem; font-weight:600;}

        .examsph-page .exams-section{
          position:relative; padding:14vh 6vw 16vh; overflow:hidden;
        }
        .examsph-page .exams-section .bg{
          position:absolute; inset:0; z-index:0;
          background:
            radial-gradient(50vw 40vw at 90% 0%, rgba(37,164,238,.12), transparent 60%),
            linear-gradient(180deg,#000E20 0%, #01142B 100%);
        }
        .examsph-page .exams-head{position:relative; z-index:1; max-width:44ch; margin-bottom:6vh;}
        .examsph-page .exams-head h2{font-size:clamp(1.9rem,4.4vw,3.6rem); margin-top:16px;}
        .examsph-page .exams-grid{
          position:relative; z-index:1; display:grid;
          grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px;
        }
        .examsph-page .glass-card{
          background:var(--glass-bg); border:1px solid var(--glass-border);
          border-radius:16px; padding:26px 22px; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
          opacity:0; transform:translateY(26px); transition:opacity .7s ease, transform .7s ease, border-color .3s ease, background .3s ease;
        }
        .examsph-page .glass-card.in{opacity:1; transform:translateY(0);}
        .examsph-page .glass-card.live{border-color:rgba(37,164,238,.4);}
        .examsph-page .glass-card:hover{border-color:rgba(37,164,238,.6); background:rgba(7,43,86,0.65);}
        .examsph-page .glass-card .top{display:flex; align-items:center; justify-content:space-between;}
        .examsph-page .glass-card .icon{width:30px; height:30px; color:var(--red); opacity:.9;}
        .examsph-page .glass-card .icon svg{width:100%; height:100%;}
        .examsph-page .glass-card .badge{
          border-radius:20px; padding:4px 10px; font-family:var(--mono); font-size:9px;
          letter-spacing:.12em; text-transform:uppercase; font-weight:600;
        }
        .examsph-page .glass-card .badge.live{background:rgba(20, 160, 120, 0.25); color:#2DD4BF; border:1px solid rgba(45, 212, 191, 0.35);}
        .examsph-page .glass-card .badge.soon{border:1px solid var(--glass-border); color:var(--graphite);}
        .examsph-page .glass-card h3{font-family:var(--display); font-size:1.3rem; color:#F5F2EA; font-weight:500; margin-top:18px;}
        .examsph-page .glass-card .full{font-size:12px; color:var(--graphite); margin-top:4px;}
        .examsph-page .glass-card .org{font-size:12px; color:var(--red); font-weight:600; margin-top:2px; opacity:.85;}
        .examsph-page .glass-card .go{
          margin-top:16px; display:inline-flex; align-items:center; gap:6px;
          font-family:var(--mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase;
          color:#031427; background:var(--red); padding:9px 14px; border-radius:20px;
          text-decoration:none; transition:background .2s ease;
        }
        .examsph-page .glass-card .go:hover{background:#54BAFF;}
        .examsph-page .glass-card.more{display:flex; align-items:center; justify-content:center; text-align:center;}
        .examsph-page .glass-card.more .icon{width:24px; height:24px; margin:0 auto 10px;}
        .examsph-page .glass-card.more p{font-family:var(--mono); font-size:11px; color:var(--graphite); letter-spacing:.06em;}

        .examsph-page .close{
          position:relative; min-height:100vh; display:flex; flex-direction:column;
          align-items:center; justify-content:center; text-align:center; padding:0 6vw; overflow:hidden;
        }
        .examsph-page .close .glow{
          position:absolute; inset:0; z-index:0;
          background:
            radial-gradient(46vw 46vw at 50% 30%, rgba(37,164,238,.16), transparent 65%),
            linear-gradient(180deg,#01142B, #000E20);
        }
        .examsph-page .close h2{
          position:relative; z-index:1; font-size:clamp(2.6rem,7.2vw,6.6rem); max-width:16ch;
        }
        .examsph-page .close h2 .full-stop{color:var(--red); display:inline-flex; align-items:center; justify-content:center; margin-left:.08em; vertical-align:middle;}
        .examsph-page .close h2 .full-stop svg{width:.62em; height:.62em;}
        .examsph-page .cta{
          position:relative; z-index:1; margin-top:52px; display:inline-flex; align-items:center; gap:12px;
          font-family:var(--mono); font-size:13px; letter-spacing:.1em; text-transform:uppercase;
          color:#F5F2EA; background:transparent; border:1px solid var(--pencil); padding:18px 34px; border-radius:2px;
          cursor:pointer; transition:background .3s ease, color .3s ease, border-color .3s ease;
          text-decoration:none;
        }
        .examsph-page .cta:hover{background:var(--red); border-color:var(--red); color:#031427;}
        .examsph-page .close-foot{position:relative; z-index:1; margin-top:70px; font-family:var(--mono); font-size:11px; color:var(--graphite); letter-spacing:.06em;}

        .examsph-page footer{
          padding:34px 6vw; display:flex; justify-content:space-between; align-items:center;
          font-family:var(--mono); font-size:10px; color:var(--graphite); letter-spacing:.08em; background:#000E20;
          border-top:1px solid var(--glass-border);
        }

        /* Image scenes use dedicated text, image, and visualization columns on desktop. */
        @media (min-width: 861px){
          #s1 .scene-sticky,
          #s3 .scene-sticky,
          #s5 .scene-sticky{
            display:grid;
            grid-template-columns:minmax(0, 1fr) minmax(180px, .7fr) minmax(260px, 1fr);
            grid-template-rows:1fr;
            align-items:center;
            column-gap:clamp(28px, 4vw, 72px);
            padding:0 6vw;
          }

          #s1 .scene-content,
          #s3 .scene-content,
          #s5 .scene-content{
            grid-column:1;
            grid-row:1;
            align-self:center;
            width:auto;
            margin:0;
            padding:0;
          }

          #s1 .s1-photo-wrap,
          #s3 .s3-photo-wrap,
          #s5 .s5-photo-wrap{
            position:relative;
            left:auto;
            top:auto;
            grid-column:2;
            grid-row:1;
            align-self:center;
            justify-self:center;
            width:min(100%, 380px);
            z-index:1;
          }
          #s1 .s1-photo-wrap{ transform:rotate(-1.4deg); }
          #s3 .s3-photo-wrap{ transform:rotate(1.2deg); }
          #s5 .s5-photo-wrap{ transform:rotate(-1.1deg); }

          #s3 .radar-wrap,
          #s5 .deck{
            position:relative;
            right:auto;
            top:auto;
            transform:none;
            grid-column:3;
            grid-row:1;
            align-self:center;
            justify-self:center;
            width:min(100%, 420px);
          }

          #s5 .deck{height:280px;}
        }

        @media (max-width: 860px){
          .examsph-page .exam-card, .examsph-page .radar-wrap, .examsph-page .deck, .examsph-page .chart-wrap, .examsph-page .paper-stack{position:static; transform:none; width:100%; margin-top:34px;}
          .examsph-page .scene-sticky{flex-direction:column; justify-content:center; padding-top:14vh; padding-bottom:6vh;}
          .examsph-page .scene-content{display:flex; flex-direction:column;}
          .examsph-page .lamp-glow, .examsph-page .clock{display:none;}
          .examsph-page .wordmark, .examsph-page .scene-index, .examsph-page .rail, .examsph-page .cross-cursor{display:none;}

          /* Mobile: photos stack in-flow instead of floating/overlapping */
          .examsph-page .hero-photo-wrap{
            position:relative; inset:auto; right:auto; top:auto; transform:rotate(-1.5deg);
            width:64%; max-width:280px; margin:32px auto 0; z-index:1;
          }
          .examsph-page .hero{padding-bottom:64px;}
          .examsph-page .s1-photo-wrap,
          .examsph-page .s3-photo-wrap,
          .examsph-page .s5-photo-wrap{
            position:relative; left:auto; top:auto;
            width:64%; max-width:280px; margin:0 auto 28px;
            order:-1;
          }
          .examsph-page .s1-photo-wrap{ transform:rotate(-1.4deg); }
          .examsph-page .s3-photo-wrap{ transform:rotate(1.2deg); }
          .examsph-page .s5-photo-wrap{ transform:rotate(-1.1deg); }
        }
        @media (pointer:coarse){ .examsph-page .cross-cursor{display:none;} }

        @media (prefers-reduced-motion: reduce){
          .examsph-page *{transition-duration:.01ms !important; animation-duration:.01ms !important;}
        }
      `}</style>

      <div className="examsph-page">
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />

        <div className="grain"></div>
        <div className="vignette"></div>
        <div className="cross-cursor" id="crossCursor">
          <svg viewBox="0 0 26 26">
            <g stroke="#fff" strokeWidth="1">
              <line x1="13" y1="0" x2="13" y2="8" />
              <line x1="13" y1="18" x2="13" y2="26" />
              <line x1="0" y1="13" x2="8" y2="13" />
              <line x1="18" y1="13" x2="26" y2="13" />
              <circle cx="13" cy="13" r="5" fill="none" />
            </g>
          </svg>
        </div>

        <nav className="examsph-nav">
          <div className="examsph-nav-inner">
            <div className="examsph-nav-brand">
              PassExams.ph
            </div>
            <Link to="/login" className="examsph-nav-cta">
              Get Started
            </Link>
          </div>
        </nav>

        <div className="scene-index" id="sceneIndex">
          <svg viewBox="0 0 14 14">
            <g stroke="#88A2C2" strokeWidth="1" fill="none">
              <line x1="7" y1="0" x2="7" y2="4" />
              <line x1="7" y1="10" x2="7" y2="14" />
              <line x1="0" y1="7" x2="4" y2="7" />
              <line x1="10" y1="7" x2="14" y2="7" />
              <circle cx="7" cy="7" r="2.6" />
            </g>
          </svg>
          <span id="sceneIndexText">00 / 08</span>
        </div>
        <div className="rail" id="rail">
          <div className="rail-fill" id="railFill"></div>
        </div>

        {/* HERO */}
        <section className="hero" id="hero">
          <div className="hero-glow"></div>
          <div className="hero-grid"></div>
          <div className="hero-photo-wrap photo-frame">
            <img src="/images/image-hero.jpg" alt="Student preparing for entrance exams" />
          </div>
          <div className="eyebrow">
            PASSEXAMS.PH <span className="rd">·</span> ADAPTIVE DIAGNOSTIC ECOSYSTEM
          </div>
          <h1>
            Your exam starts <em>before</em> the exam.
          </h1>
          <div className="hero-sub">Start to measure what you know, targets what you don't more Philippine exams on the way.</div>
          <div className="scroll-cue">
            <div className="line"></div>SCROLL
          </div>
        </section>

        {/* SCENE 01 — student preparing */}
        <section className="scene" id="s1" data-scene="1">
          <div className="scene-sticky">
            <div className="scene-bg">
              <div className="lamp-glow"></div>
              <div className="clock" id="clock">
                <div className="hand h" id="clockH"></div>
                <div className="hand m" id="clockM"></div>
              </div>
              <div className="paper-stack">
                <div className="p p1">
                  <span style={{ top: "22%", width: "60%" }}></span>
                  <span style={{ top: "32%", width: "44%" }}></span>
                </div>
                <div className="p p2">
                  <span style={{ top: "22%", width: "60%" }}></span>
                  <span style={{ top: "32%", width: "44%" }}></span>
                </div>
                <div className="p p3">
                  <span style={{ top: "22%", width: "60%" }}></span>
                  <span style={{ top: "32%", width: "44%" }}></span>
                </div>
              </div>
              <div className="motes" id="motes"></div>
            </div>
            <div className="s1-photo-wrap photo-frame">
              <img src="/images/build-your-familiarity.jpg" alt="Building familiarity with the exam format" />
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">01</span>
                <span className="t">review Before the room fills</span>
              </div>

              <h2>The work begins&nbsp;here.</h2>
            </div>
          </div>
        </section>

        {/* SCENE 02 — diagnostic */}
        <section className="scene" id="s2" data-scene="2">
          <div className="scene-sticky">
            <div className="scene-bg"></div>
            <div className="exam-card" id="examCard">
              <div className="bar">
                <span className="l">ACET DIAGNOSTIC</span>
                <span className="timer" id="examTimer">
                  22:04
                </span>
              </div>
              <div className="body">
                <div className="qline w1"></div>
                <div className="qline w2"></div>
                <div className="qline w3"></div>
                <div className="opt" data-opt="0">
                  <div className="r"></div>
                  <div className="t"></div>
                </div>
                <div className="opt" data-opt="1">
                  <div className="r"></div>
                  <div className="t"></div>
                </div>
                <div className="opt" data-opt="2">
                  <div className="r"></div>
                  <div className="t"></div>
                </div>
                <div className="opt" data-opt="3">
                  <div className="r"></div>
                  <div className="t"></div>
                </div>
              </div>
              <div className="foot">
                <div className="dots" id="examDots"></div>
                <span className="prog-count" id="examProg">
                  Q 01 / 40
                </span>
              </div>
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">02</span>
                <span className="t">First, we measure</span>
              </div>
              <h2>
                Structured questions.
                <br />
                One true baseline.
              </h2>
            </div>
          </div>
        </section>

        {/* SCENE 03 — data appears */}
        <section className="scene" id="s3" data-scene="3">
          <div className="scene-sticky">
            <div className="scene-bg"></div>
            <div className="s3-photo-wrap photo-frame">
              <img src="/images/measure-your-readiness.jpg" alt="Measuring exam readiness" />
            </div>
            <div className="radar-wrap">
              <svg id="radar1" viewBox="0 0 300 300"></svg>
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">03</span>
                <span className="t">Then, we see everything</span>
              </div>
              <h2 style={{ marginBottom: "22px" }}>
                Every answer,
                <br />
                scored in real time.
              </h2>
              
            </div>
          </div>
        </section>

        {/* SCENE 04 — AI finds weaknesses */}
        <section className="scene" id="s4" data-scene="4">
          <div className="scene-sticky">
            <div className="scene-bg"></div>
            <div className="radar-wrap">
              <svg id="radar2" viewBox="0 0 300 300"></svg>
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">04</span>
                <span className="t">Precision finds the gaps</span>
              </div>
              <h2>
                Not what you
                <br />
                missed. <em style={{ color: "var(--red)", fontStyle: "italic" }}>Why.</em>
              </h2>
            </div>
          </div>
        </section>

        {/* SCENE 05 — drills */}
        <section className="scene" id="s5" data-scene="5">
          <div className="scene-sticky">
            <div className="scene-bg"></div>
            <div className="s5-photo-wrap photo-frame">
              <img src="/images/unlimited-practice-tests.jpg" alt="Unlimited practice tests" />
            </div>
            <div className="deck" id="deck">
              <div className="drill">
                <span className="pill">SCIENCE</span>
                <div className="ttl"></div>
                <div className="ttl2"></div>
                <div className="meta">
                  <span className="qs">12 QUESTIONS</span>
                  <div className="difficulty">
                    <span className="on"></span>
                    <span className="on"></span>
                    <span></span>
                  </div>
                </div>
                <div className="bar-bg">
                  <div className="bar-fg" data-target="72"></div>
                </div>
              </div>
              <div className="drill">
                <span className="pill">MATH</span>
                <div className="ttl"></div>
                <div className="ttl2"></div>
                <div className="meta">
                  <span className="qs">8 QUESTIONS</span>
                  <div className="difficulty">
                    <span className="on"></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="bar-bg">
                  <div className="bar-fg" data-target="40"></div>
                </div>
              </div>
              <div className="drill">
                <span className="pill">SCIENCE</span>
                <div className="ttl"></div>
                <div className="ttl2"></div>
                <div className="meta">
                  <span className="qs">15 QUESTIONS</span>
                  <div className="difficulty">
                    <span className="on"></span>
                    <span className="on"></span>
                    <span className="on"></span>
                  </div>
                </div>
                <div className="bar-bg">
                  <div className="bar-fg" data-target="20"></div>
                </div>
              </div>
              <div className="drill">
                <span className="pill">READING</span>
                <div className="ttl"></div>
                <div className="ttl2"></div>
                <div className="meta">
                  <span className="qs">10 QUESTIONS</span>
                  <div className="difficulty">
                    <span className="on"></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="bar-bg">
                  <div className="bar-fg" data-target="55"></div>
                </div>
              </div>
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">05</span>
                <span className="t">Built from your gaps</span>
              </div>
              <h2>
                Drills that exist
                <br />
                because you need&nbsp;them.
              </h2>
            </div>
          </div>
        </section>

        {/* SCENE 06 — progress accelerates */}
        <section className="scene" id="s6" data-scene="6">
          <div className="scene-sticky">
            <div className="scene-bg"></div>
            <div className="chart-wrap">
              <svg id="chart" viewBox="0 0 520 300"></svg>
            </div>
            <div className="scene-content">
              <div className="scene-tag">
                <span className="n">06</span>
                <span className="t">Then, it compounds</span>
              </div>
              <h2>
                Data with
                <br /> 
                One trajectory.
              </h2>
              <div className="jump">
             
              </div>
            </div>
          </div>
        </section>

        {/* EXAM ROSTER */}
        <section className="exams-section" id="examsSection">
          <div className="bg"></div>
          <div className="exams-head">
            <div className="eyebrow">
              07 <span className="rd">·</span> Beyond the Platform
            </div>
            <h2>
              One engine.
              <br />
              Every exam that matters.
            </h2>
          </div>
          <div className="exams-grid" id="examsGrid">
            <div className="glass-card live">
              <div className="top">
                <span className="icon">
                 
                </span>
                <span className="badge live">available</span>
              </div>
              <h3>ACET</h3>
              <div className="full">Ateneo College Entrance Test</div>
              <div className="org">Ateneo de Manila University</div>
              <Link to="/login" className="go">
                Start Practicing →
              </Link>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>UPCAT</h3>
              <div className="full">UP College Admission Test</div>
              <div className="org">University of the Philippines</div>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>PSHS NCE</h3>
              <div className="full">National Competitive Exam</div>
              <div className="org">Philippine Science High School</div>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>DLSUCET</h3>
              <div className="full">DLSU College Entrance Test</div>
              <div className="org">De La Salle University</div>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>Civil Service</h3>
              <div className="full">Civil Service Examination</div>
              <div className="org">CSC Philippines</div>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>Nursing LE</h3>
              <div className="full">Nurse Licensure Examination</div>
              <div className="org">PRC Philippines</div>
            </div>

            <div className="glass-card">
              <div className="top">
                <span className="icon">
                  
                </span>
                <span className="badge soon">Coming Soon</span>
              </div>
              <h3>Teachers LE</h3>
              <div className="full">Licensure Exam for Teachers</div>
              <div className="org">PRC Philippines</div>
            </div>

            <div className="glass-card more">
              <div>
                <span className="icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <circle cx="5" cy="12" r="1.4" />
                    <circle cx="12" cy="12" r="1.4" />
                    <circle cx="19" cy="12" r="1.4" />
                  </svg>
                </span>
                <p>
                  Many more
                  <br />
                  on the way
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CLOSE */}
        <section className="close" id="close">
          <div className="glow"></div>
          <h2>
            Prepare with precision
            <span className="full-stop">
              <svg viewBox="0 0 26 26">
                <g stroke="currentColor" strokeWidth="1.6" fill="none">
                  <line x1="13" y1="2" x2="13" y2="9" />
                  <line x1="13" y1="17" x2="13" y2="24" />
                  <line x1="2" y1="13" x2="9" y2="13" />
                  <line x1="17" y1="13" x2="24" y2="13" />
                  <circle cx="13" cy="13" r="4" />
                </g>
              </svg>
            </span>
          </h2>
          <Link to="/login" className="cta">
            Claim Your Account
          </Link>
          <div className="close-foot">Early Testing · Now Open</div>
        </section>

        <footer>
          <span>PassExams.ph — Adaptive Diagnostic Ecosystem</span>
          <span>© 2026 PassExams.ph</span>
        </footer>
      </div>
    </>
  );
}