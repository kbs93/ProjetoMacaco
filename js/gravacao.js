import { renderer, getCSSColor } from './personagem.js';
import { speechBubble, palavrasElementos } from './subtitleManager.js';
import { audioDestNode, audioElement, initAudioPipeline } from './audioManager.js';

export let isRecording = false;
export let mediaRecorder = null;
let recordedChunks = [];

export let recordCanvas = document.createElement('canvas');
export let recordCtx = recordCanvas.getContext('2d');

export function renderizarBalaoNoGravador() {
  if (!speechBubble || speechBubble.style.display === 'none') return;

  const rectCanvas = renderer.domElement.getBoundingClientRect();
  const rectBalao = speechBubble.getBoundingClientRect();

  const scaleCanvasX = recordCanvas.width / rectCanvas.width;
  const scaleCanvasY = recordCanvas.height / rectCanvas.height;

  const bubbleScaleInput = parseFloat(document.getElementById('bubble-scale')?.value) || 1.0;
  const baseW = 340;
  const baseH = 160;

  const centroX = (rectBalao.left + rectBalao.width / 2 - rectCanvas.left) * scaleCanvasX;
  const centroY = (rectBalao.top + rectBalao.height / 2 - rectCanvas.top) * scaleCanvasY;

  const corFundoBalao = getCSSColor('--cor-fundo-balao') || '#ffffff';
  const corBordaBalao = getCSSColor('--cor-borda-balao') || '#7c7a7a';
  const borderWidth = 5;
  const borderRadius = 28;

  recordCtx.save();
  recordCtx.translate(centroX, centroY);
  recordCtx.scale(bubbleScaleInput * scaleCanvasX, bubbleScaleInput * scaleCanvasY);

  const bx = -baseW / 2;
  const by = -baseH / 2;

  recordCtx.beginPath();
  recordCtx.moveTo(bx + 35, by + baseH - 2);
  recordCtx.lineTo(bx + 70, by + baseH - 2);
  recordCtx.lineTo(bx + 20.44, by + baseH + 40);
  recordCtx.closePath();
  recordCtx.fillStyle = corBordaBalao;
  recordCtx.fill();

  recordCtx.beginPath();
  recordCtx.roundRect(bx, by, baseW, baseH, borderRadius);
  recordCtx.fillStyle = corFundoBalao;
  recordCtx.fill();
  recordCtx.lineWidth = borderWidth;
  recordCtx.strokeStyle = corBordaBalao;
  recordCtx.stroke();

  recordCtx.beginPath();
  recordCtx.moveTo(bx + 39, by + baseH - borderWidth);
  recordCtx.lineTo(bx + 67, by + baseH - borderWidth);
  recordCtx.lineTo(bx + 26.99, by + baseH + 33);
  recordCtx.closePath();
  recordCtx.fillStyle = corFundoBalao;
  recordCtx.fill();

  if (palavrasElementos && palavrasElementos.length > 0) {
    const centroBalaoDOMX = rectBalao.left + rectBalao.width / 2;
    const centroBalaoDOMY = rectBalao.top + rectBalao.height / 2;

    palavrasElementos.forEach(span => {
      const rSpan = span.getBoundingClientRect();
      const localX = (rSpan.left - centroBalaoDOMX) / bubbleScaleInput;
      const localY = (rSpan.top - centroBalaoDOMY) / bubbleScaleInput;
      const localW = rSpan.width / bubbleScaleInput;
      const localH = rSpan.height / bubbleScaleInput;

      const computed = window.getComputedStyle(span);
      const isAtivo = span.classList.contains('karaoke-active');
      const fontSizePx = parseFloat(computed.fontSize);

      if (isAtivo) {
        recordCtx.save();
        recordCtx.fillStyle = getCSSColor('--cor-destaque-palavra') || '#fef08a';
        recordCtx.beginPath();
        recordCtx.roundRect(localX, localY, localW, localH, 6);
        recordCtx.fill();
        recordCtx.restore();
      }

      recordCtx.save();
      recordCtx.font = `${computed.fontStyle} ${computed.fontWeight} ${fontSizePx}px ${computed.fontFamily}`;
      recordCtx.fillStyle = isAtivo ? (getCSSColor('--cor-texto-destaque') || '#0f172a') : (getCSSColor('--cor-texto-balao') || '#111827');
      recordCtx.textAlign = 'center';
      recordCtx.textBaseline = 'middle';
      recordCtx.fillText(span.textContent, localX + (localW / 2), localY + (localH / 2));
      recordCtx.restore();
    });
  }

  recordCtx.restore();
}

export function toggleRecording(onTogglePlayPause) {
  const recordBtn = document.getElementById('record-video-btn');

  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    return;
  }

  initAudioPipeline();

  recordCanvas.width = renderer.domElement.width;
  recordCanvas.height = renderer.domElement.height;

  const canvasStream = recordCanvas.captureStream(60);
  const combinedStream = new MediaStream();

  canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

  if (audioDestNode && audioDestNode.stream.getAudioTracks().length > 0) {
    audioDestNode.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
  }

  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
  }

  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 8000000
    });
  } catch (err) {
    console.error("Erro ao instanciar MediaRecorder:", err);
    mediaRecorder = new MediaRecorder(combinedStream);
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    isRecording = false;
    recordBtn.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span> Gravar Vídeo`;
    recordBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
    recordBtn.classList.add('bg-red-600', 'hover:bg-red-500');

    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = (mediaRecorder.mimeType && mediaRecorder.mimeType.includes('mp4')) ? 'mp4' : 'webm';
    a.href = url;
    a.download = `apresentador_macaco_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  mediaRecorder.start();
  isRecording = true;
  recordBtn.innerHTML = `⏹ Parar Gravação`;
  recordBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
  recordBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');

  if (audioElement.src && audioElement.paused) {
    audioElement.currentTime = 0;
    if (onTogglePlayPause) onTogglePlayPause();
  }
}