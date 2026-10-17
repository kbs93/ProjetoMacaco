import { 
  initScene, scene, camera, renderer, controls, 
  monkeyRoot, muzzleMesh, isTracking, setTracking, 
  glassesOn, setGlassesOn, mouseTarget, monkeyBasePos, 
  desenharBoca, atualizarCoresDoCSS, onWindowResize 
} from './personagem.js';

import { 
  audioElement, audioCtx, analyserNode, formatarSegundos, 
  aplicarTaxaAudio, alternarVelocidadeAudio, setIndiceVozAtual, 
  analisarAudioEspectro, initAudioPipeline 
} from './audioManager.js';

import { 
  speechBubble, speechText, captionScriptInput, captionCurrentLiveInput, 
  listaFrases, indiceFraseAtual, autoFitTextoNoBalao, 
  renderizarFraseComPalavras, atualizarListaFrases, exibirFraseAtual, 
  avancarPalavraComSincronia, voltarPalavraComSincronia, 
  reproduzirDestaquePeloTempo, resetarDestaqueVisual, 
  resetAcumuladoresAudio, voltarAoInicioRoteiro
} from './subtitleManager.js';
import { 
  isRecording, mediaRecorder, recordCanvas, recordCtx, 
  renderizarBalaoNoGravador, toggleRecording 
} from './gravacao.js';

const clock = new THREE.Clock();
const tempoBaseBoca = 0.05;
let ultimaTrocaBocaTempo = 0;

let isDraggingMonkey = false;
let prevMouseMonkey = { x: 0, y: 0 };

const playerProgress = document.getElementById('player-progress');
const playerTimeCurrent = document.getElementById('player-time-current');
const playerTimeTotal = document.getElementById('player-time-total');
const playerMasterPlayBtn = document.getElementById('player-master-play-btn');
const playerStopBtn = document.getElementById('player-stop-btn');
const playerRwBtn = document.getElementById('player-rw-btn');
const playerFfBtn = document.getElementById('player-ff-btn');
const playerSpeedBadge = document.getElementById('player-speed-badge');
const playerVolume = document.getElementById('player-volume');

function atualizarEstadoPlayBtn(tocando) {
  playerMasterPlayBtn.textContent = tocando ? '❚❚' : '▶';
}

function togglePlayPauseGlobal() {
  initAudioPipeline();

  if (audioElement.src === "" && !audioElement.currentSrc) {
    document.getElementById('audio-input').click();
    return;
  }

  if (audioElement.paused) {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    aplicarTaxaAudio();

 audioElement.play().then(() => {
      atualizarEstadoPlayBtn(true);
    }).catch(err => {
      console.error("Erro ao tocar áudio:", err);
    });
  } else {
    audioElement.pause();
    atualizarEstadoPlayBtn(false);
  }
}

function tornarElementoArrastavel(elemento) {
  if (!elemento) return;
  let posInicialX = 0, posInicialY = 0, mouseX = 0, mouseY = 0;

  elemento.style.cursor = 'grab';

  const iniciarArrasto = (e) => {
    const tag = e.target.tagName;
    if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(tag)) return;

    e.preventDefault();
    mouseX = e.clientX || (e.touches && e.touches[0].clientX);
    mouseY = e.clientY || (e.touches && e.touches[0].clientY);

    const rect = elemento.getBoundingClientRect();
    posInicialX = rect.left;
    posInicialY = rect.top;

    elemento.style.bottom = 'auto';
    elemento.style.right = 'auto';
    elemento.style.left = `${posInicialX}px`;
    elemento.style.top = `${posInicialY}px`;
    elemento.style.cursor = 'grabbing';

    window.addEventListener('mousemove', moverElemento);
    window.addEventListener('mouseup', pararArrasto);
    window.addEventListener('touchmove', moverElemento, { passive: false });
    window.addEventListener('touchend', pararArrasto);
  };

  const moverElemento = (e) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = clientX - mouseX;
    const deltaY = clientY - mouseY;

    elemento.style.left = `${posInicialX + deltaX}px`;
    elemento.style.top = `${posInicialY + deltaY}px`;
  };

  const pararArrasto = () => {
    elemento.style.cursor = 'grab';
    window.removeEventListener('mousemove', moverElemento);
    window.removeEventListener('mouseup', pararArrasto);
    window.removeEventListener('touchmove', moverElemento);
    window.removeEventListener('touchend', pararArrasto);
  };

  elemento.addEventListener('mousedown', iniciarArrasto);
  elemento.addEventListener('touchstart', iniciarArrasto, { passive: false });
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize, false);
  
  window.addEventListener('pointerdown', (event) => {
    if (
      event.target.closest('footer') || 
      event.target.closest('#audio-player-bar') || 
      event.target.closest('#speech-bubble') ||
      event.target.closest('#subtitle-control-panel') ||
      event.target.closest('#script-side-panel')
    ) return;

    const container = document.getElementById('canvas-container');
    const rect = container.getBoundingClientRect();
    const xRelativo = event.clientX - rect.left;
    const yRelativo = event.clientY - rect.top;

    mouseTarget.x = Math.max(-1.5, Math.min(1.5, (xRelativo / rect.width) * 2 - 1));
    mouseTarget.y = Math.max(-1.5, Math.min(1.5, -(yRelativo / rect.height) * 2 + 1));
  }, false);

  document.getElementById('record-video-btn').addEventListener('click', () => {
    toggleRecording(togglePlayPauseGlobal);
  });

  const trackBtn = document.getElementById('toggle-track-btn');
  trackBtn.addEventListener('click', () => {
    setTracking(!isTracking);
    trackBtn.textContent = isTracking ? 'Olhar Clique: Ativo' : 'Olhar Clique: Pausado';
    trackBtn.classList.toggle('bg-indigo-600', isTracking);
    trackBtn.classList.toggle('bg-slate-700', !isTracking);
  });

  playerMasterPlayBtn.addEventListener('click', togglePlayPauseGlobal);

playerStopBtn.addEventListener('click', () => {
    audioElement.pause();
    audioElement.currentTime = 0;
    atualizarEstadoPlayBtn(false);
    desenharBoca('repouso');
    
    // Volta para a primeira frase com segurança
    voltarAoInicioRoteiro();

    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  });

  playerRwBtn.addEventListener('click', () => {
    audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
  });
  playerFfBtn.addEventListener('click', () => {
    audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
  });

  playerVolume.addEventListener('input', (e) => {
    audioElement.volume = parseFloat(e.target.value);
  });

  playerProgress.addEventListener('input', (e) => {
    if (audioElement.duration) {
      audioElement.currentTime = (parseFloat(e.target.value) / 100) * audioElement.duration;
    }
  });

  audioElement.addEventListener('timeupdate', () => {
    if (audioElement.duration) {
      const tempoAtual = audioElement.currentTime;
      const duracaoTotal = audioElement.duration;
      playerProgress.value = (tempoAtual / duracaoTotal) * 100;
      playerTimeCurrent.textContent = formatarSegundos(tempoAtual);
      playerTimeTotal.textContent = formatarSegundos(duracaoTotal);
    }
  });

  audioElement.addEventListener('loadedmetadata', () => {
    playerTimeTotal.textContent = formatarSegundos(audioElement.duration);
    aplicarTaxaAudio();
  });

audioElement.addEventListener('play', () => {
    aplicarTaxaAudio();
  });

  const loadBtn = document.getElementById('load-file-btn');
  const audioInput = document.getElementById('audio-input');

  loadBtn.addEventListener('click', () => audioInput.click());

  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      resetAcumuladoresAudio();
      initAudioPipeline();
      audioElement.src = URL.createObjectURL(file);
      audioElement.load();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
 audioElement.play().then(() => {
        aplicarTaxaAudio();
        atualizarEstadoPlayBtn(true);
      }).catch(() => {
        aplicarTaxaAudio();
      });
    }
  });

audioElement.addEventListener('ended', () => {
    atualizarEstadoPlayBtn(false);
    desenharBoca('repouso');
    resetarDestaqueVisual();
    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  });

  playerSpeedBadge.addEventListener('click', () => {
    const rate = alternarVelocidadeAudio();
    playerSpeedBadge.textContent = `VEL: ${rate.toFixed(2)}x ▾`;
  });

  const voiceEffectSelect = document.getElementById('voice-effect-select');
  voiceEffectSelect.addEventListener('change', (e) => {
    setIndiceVozAtual(parseInt(e.target.value, 10));
    aplicarTaxaAudio();
  });

  const resetBtn = document.getElementById('reset-cam-btn');
  resetBtn.addEventListener('click', () => {
    camera.position.set(0, 0.15, 3.8);
    controls.target.set(0, 0.15, 0);
    controls.update();
    mouseTarget.x = 0;
    mouseTarget.y = 0;
  });

  const glassesBtn = document.getElementById('toggle-glasses-btn');
  glassesBtn.addEventListener('click', () => {
    setGlassesOn(!glassesOn);
    glassesBtn.textContent = glassesOn ? 'Tirar Óculos' : 'Colocar Óculos';
  });

  const toggleBubbleBtn = document.getElementById('toggle-bubble-btn');
  toggleBubbleBtn.addEventListener('click', () => {
    const isHidden = speechBubble.style.display === 'none';
    speechBubble.style.display = isHidden ? 'flex' : 'none';
    toggleBubbleBtn.textContent = isHidden ? 'Ocultar Balão' : 'Mostrar Balão';
  });

 
  

  captionCurrentLiveInput.addEventListener('input', (e) => {
    const novoTexto = e.target.value;
    listaFrases[indiceFraseAtual] = novoTexto;
    captionScriptInput.value = listaFrases.join('\n');
    renderizarFraseComPalavras(novoTexto);
    autoFitTextoNoBalao();
  });

  captionScriptInput.addEventListener('input', () => {
    atualizarListaFrases();
  });




  window.addEventListener('keydown', (e) => {
    const estaDigitando = ['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName);
    if (estaDigitando) return;

    if (e.key === 'ArrowRight') {
      avancarPalavraComSincronia();
    } else if (e.key === 'ArrowLeft') {
      voltarPalavraComSincronia();
    }
  });

  const capFontFamily = document.getElementById('cap-font-family');
  const capFontSize = document.getElementById('cap-font-size');
  const capFontSizeVal = document.getElementById('cap-font-size-val');
  const capTextColor = document.getElementById('cap-text-color');
 
  const capHighlightColor = document.getElementById('cap-highlight-color');
  const screenBgColor = document.getElementById('screen-bg-color');
  const capBoldBtn = document.getElementById('cap-bold-btn');
  const capItalicBtn = document.getElementById('cap-italic-btn');

  let isBold = true;
  let isItalic = false;

  capFontFamily.addEventListener('change', (e) => {
    speechText.style.fontFamily = e.target.value;
    autoFitTextoNoBalao();
  });

  capFontSize.addEventListener('input', (e) => {
    const sz = e.target.value;
    capFontSizeVal.textContent = `${sz}px`;
    autoFitTextoNoBalao();
  });

  capTextColor.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--cor-texto-balao', e.target.value);
    speechText.style.color = e.target.value;
  });



  capHighlightColor.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--cor-destaque-palavra', e.target.value);
  });

  screenBgColor.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--cor-fundo-tela', e.target.value);
    atualizarCoresDoCSS();
  });

  capBoldBtn.addEventListener('click', () => {
    isBold = !isBold;
    speechText.style.fontWeight = isBold ? '800' : '400';
    capBoldBtn.classList.toggle('bg-cyan-600', isBold);
    capBoldBtn.classList.toggle('text-white', isBold);
    capBoldBtn.classList.toggle('bg-slate-800', !isBold);
    capBoldBtn.classList.toggle('text-slate-300', !isBold);
    autoFitTextoNoBalao();
  });

  capItalicBtn.addEventListener('click', () => {
    isItalic = !isItalic;
    speechText.style.fontStyle = isItalic ? 'italic' : 'normal';
    capItalicBtn.classList.toggle('bg-cyan-600', isItalic);
    capItalicBtn.classList.toggle('text-white', isItalic);
    capItalicBtn.classList.toggle('bg-slate-800', !isItalic);
    capItalicBtn.classList.toggle('text-slate-300', !isItalic);
    autoFitTextoNoBalao();
  });

  let isDraggingBubble = false;
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

  speechBubble.addEventListener('mousedown', (e) => {
    isDraggingBubble = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = speechBubble.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    speechBubble.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingBubble) return;
    speechBubble.style.left = `${initialLeft + (e.clientX - startX)}px`;
    speechBubble.style.top = `${initialTop + (e.clientY - startY)}px`;
  });

  window.addEventListener('mouseup', () => {
    isDraggingBubble = false;
    speechBubble.style.cursor = 'grab';
  });

  const bubbleScale = document.getElementById('bubble-scale');
  const bubbleScaleVal = document.getElementById('bubble-scale-val');
  bubbleScale.addEventListener('input', (e) => {
    const escala = parseFloat(e.target.value);
    speechBubble.style.transform = `scale(${escala})`;
    speechBubble.style.transformOrigin = 'center center';
    bubbleScaleVal.textContent = `${escala.toFixed(2)}x`;
  });

  tornarElementoArrastavel(document.getElementById('subtitle-control-panel'));
  tornarElementoArrastavel(document.getElementById('script-side-panel'));
  tornarElementoArrastavel(document.getElementById('audio-player-bar'));
  tornarElementoArrastavel(document.querySelector('footer'));

  window.addEventListener('mousedown', (e) => {
    if (
      e.target.closest('footer') ||
      e.target.closest('#audio-player-bar') ||
      e.target.closest('#speech-bubble') ||
      e.target.closest('#subtitle-control-panel') ||
      e.target.closest('#script-side-panel')
    ) return;

    if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
      isDraggingMonkey = true;
      prevMouseMonkey.x = e.clientX;
      prevMouseMonkey.y = e.clientY;
      if (controls) controls.enabled = false;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingMonkey) return;
    const deltaX = e.clientX - prevMouseMonkey.x;
    const deltaY = e.clientY - prevMouseMonkey.y;

    monkeyBasePos.x += deltaX * 0.005;
    monkeyBasePos.y -= deltaY * 0.005;

    prevMouseMonkey.x = e.clientX;
    prevMouseMonkey.y = e.clientY;
  });

  const pararArrastoMacaco = () => {
    if (isDraggingMonkey) {
      isDraggingMonkey = false;
      if (controls) controls.enabled = true;
    }
  };

  window.addEventListener('mouseup', pararArrastoMacaco);
  window.addEventListener('contextmenu', (e) => {
    if (isDraggingMonkey) e.preventDefault();
  });
}

function animate() {
  requestAnimationFrame(animate);

  atualizarCoresDoCSS();

  const tempoAgora = clock.getElapsedTime();
  let volumeAtual = 0;
  let gravesAtuais = 0;
if (analyserNode && !audioElement.paused) {
    const taxaEfetiva = tempoBaseBoca / (audioElement.playbackRate || 1.0);
    const analise = analisarAudioEspectro();
    volumeAtual = analise.volume;
    gravesAtuais = analise.fGrave;

    // A cor de fundo do texto agora recebe o volume exato da boca
    reproduzirDestaquePeloTempo(audioElement.currentTime, volumeAtual);

    if (tempoAgora - ultimaTrocaBocaTempo >= taxaEfetiva) {
      let bocaEscolhida = 'repouso';

      if (analise.volume < 0.05) {
        bocaEscolhida = 'repouso';
      } else if (analise.volume < 0.12 && analise.fGrave < 0.15) {
        bocaEscolhida = 'consoante';
      } else if (analise.fAgudo > 0.22 && analise.fAgudo > analise.fVogalAberta * 0.9) {
        bocaEscolhida = (analise.volume > 0.40 || analise.fAgudo > 0.35) ? 'dentes' : 'dentesLeve';
      } else if (analise.fGrave > 0.20 && analise.fAgudo < 0.16) {
        bocaEscolhida = 'bicoOU';
      } else if (analise.fVogalAberta > 0.24) {
        bocaEscolhida = (analise.volume > 0.50 || analise.fVogalAberta > 0.38) ? 'abertaGrande' : 'abertaMedia';
      } else {
        bocaEscolhida = 'abertaMedia';
      }

      desenharBoca(bocaEscolhida);
      ultimaTrocaBocaTempo = tempoAgora;
    }
  } else {
    desenharBoca('repouso');
  }

  if (muzzleMesh) {
    const targetScaleY = 0.88 + (volumeAtual * 0.08);
    const targetScaleX = 1.16 - (volumeAtual * 0.05);
    const lerpFactor = 0.25;

    muzzleMesh.scale.y += (targetScaleY - muzzleMesh.scale.y) * lerpFactor;
    muzzleMesh.scale.x += (targetScaleX - muzzleMesh.scale.x) * lerpFactor;
  }

  if (monkeyRoot) {
    const velocidadeSuavizacao = 0.12;

    const idleRotX = Math.sin(tempoAgora * 1.4) * 0.025;
    const idleRotY = Math.cos(tempoAgora * 0.9) * 0.035;
    const idleRotZ = Math.sin(tempoAgora * 1.1) * 0.015;
    const respiracaoY = Math.sin(tempoAgora * 2.2) * 0.02;

    const tiltFalaZ = Math.sin(tempoAgora * 3.2) * (volumeAtual * 0.11);
    const acenoGravesX = Math.abs(Math.sin(tempoAgora * 4.5)) * (gravesAtuais * 0.06);

    if (isTracking) {
      const targetRotY = (mouseTarget.x * 0.65) + idleRotY;
      const targetRotX = (-mouseTarget.y * 0.40) + acenoGravesX + idleRotX;
      const targetRotZ = (-mouseTarget.x * 0.07) + tiltFalaZ + idleRotZ;

      monkeyRoot.rotation.y += (targetRotY - monkeyRoot.rotation.y) * velocidadeSuavizacao;
      monkeyRoot.rotation.x += (targetRotX - monkeyRoot.rotation.x) * velocidadeSuavizacao;
      monkeyRoot.rotation.z += (targetRotZ - monkeyRoot.rotation.z) * velocidadeSuavizacao;
    } else {
      monkeyRoot.rotation.y += (idleRotY - monkeyRoot.rotation.y) * velocidadeSuavizacao;
      monkeyRoot.rotation.x += ((acenoGravesX + idleRotX) - monkeyRoot.rotation.x) * velocidadeSuavizacao;
      monkeyRoot.rotation.z += ((tiltFalaZ + idleRotZ) - monkeyRoot.rotation.z) * velocidadeSuavizacao;
    }

    const bounceGravesY = gravesAtuais * 0.02;
    monkeyRoot.position.x = monkeyBasePos.x;
    monkeyRoot.position.y = monkeyBasePos.y + respiracaoY + bounceGravesY;
    monkeyRoot.position.z = monkeyBasePos.z;
  }

  controls.update();
  renderer.render(scene, camera);

  if (isRecording) {
    recordCtx.drawImage(renderer.domElement, 0, 0);
    renderizarBalaoNoGravador();
  }
}

window.onload = function () {
  initScene();
  setupEventListeners();
  atualizarListaFrases();
  animate();
};
// Inicializa o seletor visual idêntico ao da imagem com suporte a transparência
const pickrBalao = Pickr.create({
  el: '#picker-balao',
  theme: 'monolith',
  default: '#ffffff',
  swatches: [
    '#ffffff', '#000000', '#fde047', '#38bdf8', '#ef4444', '#22c55e'
  ],
  components: {
    preview: true,
    opacity: true, // Barra de transparência lateral
    hue: true,     // Barra colorida de espectro

    interaction: {
      hex: true,
      rgba: true,
      input: true,
      clear: false,
      save: true
    }
  }
});

// Atualiza o balão em tempo real conforme você arrasta a cor ou a transparência
pickrBalao.on('change', (color) => {
  const corRgba = color.toRGBA().toString(0); // gera rgba(r, g, b, a)
  document.documentElement.style.setProperty('--cor-fundo-balao', corRgba);

  // Se a opacidade for zero, oculta o bico do balão para não sobrar triângulo na tela
  const alpha = color.toRGBA()[3];
  const balao = document.getElementById('speech-bubble');
  if (balao) {
    if (alpha === 0) {
      balao.classList.add('balao-transparente');
    } else {
      balao.classList.remove('balao-transparente');
    }
  }
});