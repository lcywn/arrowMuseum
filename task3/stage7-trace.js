function createTraceGame({ onComplete, onMistake }) {
  const game = document.getElementById("trace-game");
  const svg = document.getElementById("trace-svg");
  const frame = svg.querySelector(".trace-frame");
  const outline = document.getElementById("trace-outline");
  const track = document.getElementById("trace-track");
  const progressPath = document.getElementById("trace-progress");
  const sweepPath = document.getElementById("trace-sweep");
  const light = document.getElementById("trace-light");
  const startMarker = document.getElementById("trace-start");
  const startHit = document.getElementById("trace-start-hit");
  const help = document.getElementById("trace-help");
  const shape = "M 15 24 C 15 60 15 104 35 104 C 55 104 55 24 75 24 C 95 24 95 104 115 104 C 135 104 135 24 155 24";
  for (const path of [outline, track, progressPath, sweepPath]) path.setAttribute("d", shape);

  const length = track.getTotalLength();
  const sampleStep = 0.75;
  const samples = [];
  for (let distance = 0; distance < length; distance += sampleStep) {
    samples.push({ distance, point: track.getPointAtLength(distance) });
  }
  samples.push({ distance: length, point: track.getPointAtLength(length) });
  const startPoint = samples[0].point;
  const endPoint = samples[samples.length - 1].point;
  const beforeEnd = track.getPointAtLength(length - 0.5);
  const tangentLength = Math.hypot(endPoint.x - beforeEnd.x, endPoint.y - beforeEnd.y);
  const endTangent = {
    x: (endPoint.x - beforeEnd.x) / tangentLength,
    y: (endPoint.y - beforeEnd.y) / tangentLength
  };
  startMarker.setAttribute("cx", startPoint.x);
  startMarker.setAttribute("cy", startPoint.y);
  startHit.setAttribute("cx", startPoint.x);
  startHit.setAttribute("cy", startPoint.y);
  progressPath.style.strokeDasharray = `${length} ${length}`;
  sweepPath.style.strokeDasharray = `${length * 0.08} ${length}`;

  const sweepDuration = 1500;
  let active = false;
  let ready = false;
  let drawing = false;
  let pointerId = null;
  let previousPoint = null;
  let progress = 0;
  let mistakes = 0;
  let lastActivity = 0;
  let sweepStart = null;
  let autoStart = null;
  let finishTimer = 0;
  let errorTimer = 0;

  function setProgress(distance) {
    progress = Math.max(0, Math.min(length, distance));
    progressPath.style.strokeDashoffset = length - progress;
    progressPath.style.opacity = progress > 0 ? 1 : 0;
  }

  function hideSweep() {
    sweepStart = null;
    light.setAttribute("hidden", "");
    sweepPath.style.visibility = "hidden";
  }

  function startSweep(now) {
    sweepStart = now;
    light.removeAttribute("hidden");
    sweepPath.style.visibility = "visible";
  }

  function releasePointer() {
    if (pointerId !== null && svg.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
    pointerId = null;
    drawing = false;
    previousPoint = null;
  }

  function clearError() {
    window.clearTimeout(errorTimer);
    frame.classList.remove("is-error");
  }

  function fail() {
    if (!drawing) return;
    releasePointer();
    setProgress(0);
    mistakes += 1;
    help.hidden = mistakes < 2;
    startMarker.removeAttribute("hidden");
    clearError();
    void frame.getBoundingClientRect();
    frame.classList.add("is-error");
    errorTimer = window.setTimeout(clearError, 640);
    lastActivity = performance.now();
    onMistake(mistakes);
  }

  function finish() {
    releasePointer();
    ready = false;
    autoStart = null;
    hideSweep();
    startMarker.setAttribute("hidden", "");
    help.hidden = true;
    setProgress(length);
    finishTimer = window.setTimeout(() => {
      game.hidden = true;
      active = false;
      onComplete();
    }, 300);
  }

  function pointFromEvent(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  function getTolerance() {
    const matrix = svg.getScreenCTM();
    return Math.max(15, 28 / Math.hypot(matrix.a, matrix.b));
  }

  function getEndAllowance() {
    const matrix = svg.getScreenCTM();
    // Pointer coordinates can round slightly across the six-pixel boundary.
    return 6.001 / Math.hypot(matrix.a, matrix.b);
  }

  function getOvershoot(point) {
    return (point.x - endPoint.x) * endTangent.x + (point.y - endPoint.y) * endTangent.y;
  }

  function advance(point) {
    const dx = point.x - previousPoint.x;
    const dy = point.y - previousPoint.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    const from = previousPoint;
    const tolerance = getTolerance();
    for (let step = 1; step <= steps; step += 1) {
      const x = from.x + dx * step / steps;
      const y = from.y + dy * step / steps;
      const first = Math.max(0, Math.floor((progress - 4) / sampleStep));
      const last = Math.min(samples.length - 2, Math.ceil((progress + Math.max(3, tolerance)) / sampleStep));
      let nearestProgress = progress;
      let nearestDistance = Infinity;
      for (let index = first; index <= last; index += 1) {
        const sample = samples[index];
        const next = samples[index + 1];
        const segmentX = next.point.x - sample.point.x;
        const segmentY = next.point.y - sample.point.y;
        const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
        const amount = segmentLengthSquared > 0
          ? Math.max(0, Math.min(1, ((x - sample.point.x) * segmentX + (y - sample.point.y) * segmentY) / segmentLengthSquared))
          : 0;
        const distance = Math.hypot(x - sample.point.x - amount * segmentX, y - sample.point.y - amount * segmentY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestProgress = sample.distance + amount * (next.distance - sample.distance);
        }
      }
      const allowance = progress >= length * 0.91 ? Infinity : tolerance;
      if (nearestDistance > allowance) {
        fail();
        return;
      }
      setProgress(Math.max(progress, nearestProgress));
    }
    previousPoint = point;
  }

  function noteActivity() {
    if (active) lastActivity = performance.now();
  }

  window.addEventListener("pointermove", noteActivity, { passive: true });
  window.addEventListener("pointerdown", noteActivity, { passive: true });
  window.addEventListener("pointerup", noteActivity, { passive: true });
  window.addEventListener("keydown", noteActivity);
  window.addEventListener("resize", () => {
    if (active) startHit.setAttribute("r", getTolerance());
  });

  svg.addEventListener("pointerdown", (event) => {
    if (!active || !ready || drawing || autoStart !== null || event.button !== 0) return;
    const point = pointFromEvent(event);
    if (Math.hypot(point.x - startPoint.x, point.y - startPoint.y) > getTolerance()) return;
    drawing = true;
    pointerId = event.pointerId;
    previousPoint = point;
    startMarker.setAttribute("hidden", "");
    hideSweep();
    svg.setPointerCapture(pointerId);
    event.preventDefault();
  });

  svg.addEventListener("pointermove", (event) => {
    if (!drawing || event.pointerId !== pointerId) return;
    const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    for (const sample of events.length ? events : [event]) {
      if (!drawing) break;
      advance(pointFromEvent(sample));
    }
    event.preventDefault();
  });

  svg.addEventListener("pointerup", (event) => {
    if (!drawing || event.pointerId !== pointerId) return;
    const point = pointFromEvent(event);
    advance(point);
    if (drawing) {
      if (progress >= length * 0.91) {
        finish();
      } else {
        fail();
      }
    }
    event.preventDefault();
  });

  svg.addEventListener("pointercancel", (event) => {
    if (drawing && event.pointerId === pointerId) fail();
  });

  help.addEventListener("click", () => {
    if (!active || !ready || mistakes < 2 || autoStart !== null) return;
    releasePointer();
    clearError();
    hideSweep();
    startMarker.setAttribute("hidden", "");
    help.hidden = true;
    setProgress(0);
    autoStart = performance.now();
  });

  function start() {
    active = true;
    ready = false;
    autoStart = null;
    releasePointer();
    clearError();
    setProgress(0);
    game.hidden = false;
    startHit.setAttribute("r", getTolerance());
    help.hidden = mistakes < 2;
    startMarker.setAttribute("hidden", "");
    lastActivity = performance.now();
    startSweep(lastActivity);
  }

  function stop() {
    window.clearTimeout(finishTimer);
    releasePointer();
    clearError();
    hideSweep();
    autoStart = null;
    active = false;
    ready = false;
    game.hidden = true;
  }

  function update(now) {
    if (!active) return;
    if (autoStart !== null) {
      const amount = Math.min((now - autoStart) / 1900, 1);
      setProgress(length * amount);
      if (amount === 1) finish();
      return;
    }
    if (sweepStart !== null) {
      const amount = Math.min((now - sweepStart) / sweepDuration, 1);
      const point = track.getPointAtLength(length * amount);
      light.setAttribute("cx", point.x);
      light.setAttribute("cy", point.y);
      sweepPath.style.strokeDashoffset = -Math.max(0, length * (amount - 0.08));
      if (amount === 1) {
        hideSweep();
        if (!ready) {
          ready = true;
          startMarker.removeAttribute("hidden");
        }
        lastActivity = now;
      }
    } else if (ready && now - lastActivity >= 2000) {
      startSweep(now);
    }
  }

  return {
    start,
    stop,
    update,
    reset() {
      stop();
      mistakes = 0;
    }
  };
}
