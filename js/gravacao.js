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
  
  // Usa o tamanho real do balão do DOM para não distorcer proporções
  const baseW = rectBalao.width / bubbleScaleInput;
  const baseH = rectBalao.height / bubbleScaleInput;

  const centroX = (rectBalao.left + rectBalao.width / 2 - rectCanvas.left) * scaleCanvasX;
  const centroY = (rectBalao.top + rectBalao.height / 2 - rectCanvas.top) * scaleCanvasY;

  const corFundoBalao = getCSSColor('--cor-fundo-balao') || '#ffffff';
  const corBordaBalao = getCSSColor('--cor-borda-balao') || '#7c7a7a';
  const borderWidth = 6;
  const r = 26; // Raio das pontas arredondadas

  recordCtx.save();
  recordCtx.translate(centroX, centroY);
  recordCtx.scale(bubbleScaleInput * scaleCanvasX, bubbleScaleInput * scaleCanvasY);

  const bx = -baseW / 2;
  const by = -baseH / 2;

  // CAMINHO ÚNICO: Balão + Cauda integrados (resolve a borda cinzenta contínua)
// Verifica se o balão foi ocultado pelo botão ou pelo seletor de transparência
  const balaoOculto = speechBubble.classList.contains('balao-oculto') || 
                      speechBubble.classList.contains('balao-transparente') ||
                      corFundoBalao === 'transparent';

  if (!balaoOculto) {
    // CAMINHO ÚNICO: Balão + Cauda integrados (resolve a borda cinzenta contínua)
    recordCtx.beginPath();
    recordCtx.moveTo(bx + r, by);
    // Borda superior
    recordCtx.lineTo(bx + baseW - r, by);
    recordCtx.quadraticCurveTo(bx + baseW, by, bx + baseW, by + r);
    // Borda direita
    recordCtx.lineTo(bx + baseW, by + baseH - r);
    recordCtx.quadraticCurveTo(bx + baseW, by + baseH, bx + baseW - r, by + baseH);
    // Borda inferior (lado direito até a cauda)
    recordCtx.lineTo(bx + 80, by + baseH);
    // Ponta da cauda
    recordCtx.lineTo(bx + 26, by + baseH + 34);
    recordCtx.lineTo(bx + 44, by + baseH);
    // Borda inferior (lado esquerdo)
    recordCtx.lineTo(bx + r, by + baseH);
    recordCtx.quadraticCurveTo(bx, by + baseH, bx, by + baseH - r);
    // Borda esquerda
    recordCtx.lineTo(bx, by + r);
    recordCtx.quadraticCurveTo(bx, by, bx + r, by);
    recordCtx.closePath();

    // Preenchimento e contorno perfeitos sem costura
    recordCtx.fillStyle = corFundoBalao;
    recordCtx.fill();
    recordCtx.lineWidth = borderWidth;
    recordCtx.lineJoin = 'round';
    recordCtx.strokeStyle = corBordaBalao;
    recordCtx.stroke();
  }

  // RENDERIZAÇÃO DAS PALAVRAS
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
      const posX = localX + (localW / 2);
      const posY = localY + (localH / 2);

      recordCtx.save();
      const weight = (computed.fontWeight === 'normal' || parseInt(computed.fontWeight) < 600) ? 'bold' : computed.fontWeight;
      recordCtx.font = `${computed.fontStyle} ${weight} ${fontSizePx}px ${computed.fontFamily}`;
      recordCtx.textAlign = 'center';
      recordCtx.textBaseline = 'middle';

      // 1. DESENHA A BORDA/CONTORNO POR TRÁS (COR DO BOTÃO DESTAQUE)
      recordCtx.lineWidth = 6;
      recordCtx.lineJoin = 'round';
      recordCtx.strokeStyle = getCSSColor('--cor-destaque-palavra') || '#000000';
      recordCtx.strokeText(span.textContent, posX, posY);

      // 2. PREENCHE O MIOLO DO TEXTO POR CIMA
      recordCtx.fillStyle = isAtivo ? (getCSSColor('--cor-texto-destaque') || '#0f172a') : (getCSSColor('--cor-texto-balao') || '#111827');
      recordCtx.fillText(span.textContent, posX, posY);

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

  /* ========================================================
     REMOVA ESTE BLOCO ANTIGO DO SEU CÓDIGO:
     --------------------------------------------------------
     let mimeType = 'video/webm;codecs=vp9,opus';
     if (!MediaRecorder.isTypeSupported(mimeType)) {
       mimeType = 'video/webm';
       if (!MediaRecorder.isTypeSupported(mimeType)) {
         mimeType = 'video/mp4';
       }
     }
     ======================================================== */

  // >>> COLE ESTE BLOCO NO LUGAR:
  const mimeTypesPossiveis = [
    'video/mp4;codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ];

  let mimeType = '';
  for (const tipo of mimeTypesPossiveis) {
    if (MediaRecorder.isTypeSupported(tipo)) {
      mimeType = tipo;
      break;
    }
  }

  if (!mimeType) {
    mimeType = 'video/webm';
  }
  // <<< FIM DO BLOCO NOVO

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

  /* ========================================================
     REMOVA ESTE BLOCO ANTIGO NA FUNÇÃO onstop:
     --------------------------------------------------------
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
     ======================================================== */

  // >>> COLE ESTE BLOCO NO LUGAR DO onstop:
  mediaRecorder.onstop = () => {
    isRecording = false;
    recordBtn.innerHTML = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span> Gravar Vídeo`;
    recordBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
    recordBtn.classList.add('bg-red-600', 'hover:bg-red-500');

    const finalMime = mediaRecorder.mimeType || mimeType;
    const blob = new Blob(recordedChunks, { type: finalMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const isMp4 = finalMime.toLowerCase().includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';

    a.href = url;
    a.download = `apresentador_macaco_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };
  // <<< FIM DO BLOCO NOVO

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

